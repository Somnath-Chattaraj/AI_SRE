import { exec } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const execAsync = promisify(exec);

export interface GitCommitResult {
  success: boolean;
  message: string;
}

export async function gitCommit(filePath: string, message: string): Promise<GitCommitResult> {
  try {
    const dir = path.dirname(filePath);
    await execAsync(`git add "${filePath}"`, { cwd: dir });
    await execAsync(`git commit -m "${message}"`, { cwd: dir });
    return { success: true, message: "Committed successfully" };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

export async function gitRevert(commitHash: string, filePath: string): Promise<GitCommitResult> {
  try {
    const dir = path.dirname(filePath);
    await execAsync(`git checkout ${commitHash} "${filePath}"`, { cwd: dir });
    return { success: true, message: "Reverted successfully" };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

export async function gitLog(filePath: string, n: number = 5): Promise<string> {
  try {
    const dir = path.dirname(filePath);
    const { stdout } = await execAsync(`git log --oneline -n ${n}`, { cwd: dir });
    return stdout;
  } catch {
    return "";
  }
}

export async function pm2Restart(serviceName: string): Promise<boolean> {
  try {
    await execAsync(`pm2 restart ${serviceName}`);
    return true;
  } catch {
    return false;
  }
}

export async function pm2Start(scriptPath: string, name: string): Promise<boolean> {
  try {
    await execAsync(`pm2 start "${scriptPath}" --name ${name}`);
    return true;
  } catch {
    return false;
  }
}

export async function pm2Stop(serviceName: string): Promise<boolean> {
  try {
    await execAsync(`pm2 stop ${serviceName}`);
    return true;
  } catch {
    return false;
  }
}

export async function pm2List(): Promise<string> {
  try {
    const { stdout } = await execAsync("pm2 list");
    return stdout;
  } catch {
    return "";
  }
}

export async function writeFileContent(filePath: string, content: string): Promise<boolean> {
  try {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(filePath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

export async function readFileContent(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function healthCheck(url: string, timeout: number = 5000): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}