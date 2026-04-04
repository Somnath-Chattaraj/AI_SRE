import { exec } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const execAsync = promisify(exec);

export const log = (msg: string, id?: string) => {
  const ts = new Date().toISOString().split("T")[1]?.split(".")[0];
  console.log(`[${ts}]${id ? ` [${id}]` : ""} ${msg}`);
};

// ─── Repo cloning ─────────────────────────────────────────────────────────────

/**
 * Clone a GitHub repo into a temp directory.
 * Injects GITHUB_TOKEN into the URL for private repos if the env var is set.
 */
export async function cloneRepo(repoUrl: string, destDir: string): Promise<void> {
  // Clean up any previous attempt
  if (existsSync(destDir)) await rm(destDir, { recursive: true, force: true });
  await mkdir(destDir, { recursive: true });

  const token = process.env.GITHUB_TOKEN;
  // Inject token for private repos: https://TOKEN@github.com/...
  const authedUrl = token
    ? repoUrl.replace("https://", `https://${token}@`)
    : repoUrl;

  log(`Cloning ${repoUrl} → ${destDir}`);
  await execAsync(`git clone --depth=1 "${authedUrl}" "${destDir}"`);
}

/**
 * Remove a cloned temp directory after patching is done.
 */
export async function cleanupRepo(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

// ─── Git (all ops scoped to a specific repo dir) ──────────────────────────────

export interface GitResult {
  success: boolean;
  message: string;
}

export async function gitEnsureBranch(branch: string, repoDir: string): Promise<boolean> {
  try {
    await execAsync(`git checkout -b "${branch}"`, { cwd: repoDir });
    return true;
  } catch {
    // Branch may already exist
    try {
      await execAsync(`git checkout "${branch}"`, { cwd: repoDir });
      return true;
    } catch {
      return false;
    }
  }
}

export async function gitCommit(
  filePaths: string[],
  message: string,
  repoDir: string,
): Promise<GitResult> {
  try {
    for (const fp of filePaths) {
      await execAsync(`git add "${fp}"`, { cwd: repoDir });
    }
    const { stdout } = await execAsync(`git commit -m "${message}"`, { cwd: repoDir });
    return { success: true, message: stdout.trim() };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

export async function gitLog(repoDir: string, n = 2): Promise<string> {
  try {
    const { stdout } = await execAsync(`git log --oneline -n ${n}`, { cwd: repoDir });
    return stdout;
  } catch {
    return "";
  }
}

export async function gitRevert(commitHash: string, repoDir: string): Promise<GitResult> {
  try {
    await execAsync(`git checkout ${commitHash} -- .`, { cwd: repoDir });
    return { success: true, message: "Reverted" };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

export async function gitCurrentBranch(repoDir: string): Promise<string> {
  try {
    const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", { cwd: repoDir });
    return stdout.trim();
  } catch {
    return "main";
  }
}

export async function pushBranch(branch: string, repoDir: string): Promise<GitResult> {
  try {
    await execAsync(`git push -u origin "${branch}"`, { cwd: repoDir });
    return { success: true, message: "Pushed" };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

// ─── GitHub PR (via gh CLI, scoped to cloned repo dir) ───────────────────────

export interface PRResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function createGitHubPR(opts: {
  branch: string;
  baseBranch: string;
  title: string;
  body: string;
  repoDir: string;
}): Promise<PRResult> {
  try {
    const pushResult = await pushBranch(opts.branch, opts.repoDir);
    if (!pushResult.success) return { success: false, error: `Push failed: ${pushResult.message}` };

    const title = opts.title.replace(/"/g, '\\"');
    const body = opts.body.replace(/"/g, '\\"');
    const { stdout } = await execAsync(
      `gh pr create --title "${title}" --body "${body}" --base "${opts.baseBranch}" --head "${opts.branch}"`,
      { cwd: opts.repoDir },
    );
    return { success: true, url: stdout.trim() };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ─── File operations ──────────────────────────────────────────────────────────

export async function readFileContent(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function writeFileContent(filePath: string, content: string): Promise<boolean> {
  try {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(filePath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Precise string replacement — finds the first occurrence of searchStr and
 * replaces it with replaceStr. Returns the number of lines affected.
 */
export async function replaceInFile(
  filePath: string,
  searchStr: string,
  replaceStr: string,
): Promise<{ success: boolean; linesAffected: number; error?: string }> {
  const content = await readFileContent(filePath);
  if (content === null) {
    return { success: false, linesAffected: 0, error: `File not found: ${filePath}` };
  }

  // Try exact match first, then normalise line endings
  const needle = content.includes(searchStr)
    ? searchStr
    : content.replace(/\r\n/g, "\n").includes(searchStr.replace(/\r\n/g, "\n"))
      ? searchStr.replace(/\r\n/g, "\n")
      : null;

  if (!needle) {
    return { success: false, linesAffected: 0, error: "Search string not found in file" };
  }

  const newContent = (needle === searchStr ? content : content.replace(/\r\n/g, "\n"))
    .replace(needle, replaceStr);

  await writeFile(filePath, newContent, "utf-8");
  return { success: true, linesAffected: replaceStr.split("\n").length };
}

/**
 * Search for a pattern in a file, returning matching lines with context.
 */
export async function searchInFile(
  filePath: string,
  pattern: string | RegExp,
): Promise<Array<{ line: number; content: string; context: string[] }>> {
  const content = await readFileContent(filePath);
  if (!content) return [];
  const lines = content.split("\n");
  const regex =
    pattern instanceof RegExp
      ? pattern
      : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return lines.flatMap((line, i) => {
    if (!regex.test(line)) return [];
    const start = Math.max(0, i - 2);
    const end = Math.min(lines.length - 1, i + 2);
    return [{ line: i + 1, content: line, context: lines.slice(start, end + 1) }];
  });
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function healthCheck(url: string, timeout = 5000): Promise<boolean> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res.ok;
  } catch {
    clearTimeout(id);
    return false;
  }
}

// ─── PM2 (optional — only relevant when not using Docker) ────────────────────

export async function pm2Restart(serviceName: string): Promise<boolean> {
  try {
    await execAsync(`pm2 restart ${serviceName}`);
    return true;
  } catch {
    return false;
  }
}
