import { readdir, readFile } from "fs/promises";
import path from "path";
import { generateEmbeddings } from "./embedding.js";
import { VectorStore } from "./storage.js";
import { log } from "./tools.js";

const SOURCE_EXTENSIONS = /\.(js|ts|jsx|tsx|mjs|cjs|py|go|rb|java|rs|cs|php|swift|kt)$/;

const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", ".next", "coverage",
  "build", "out", ".cache", "__pycache__", "vendor",
  "bin", "obj", ".venv", "venv", "target",
]);

async function findSourceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findSourceFiles(full)));
    } else if (SOURCE_EXTENSIONS.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Index all source files in a directory into the given VectorStore.
 * Existing documents are upserted so re-indexing is idempotent.
 */
export async function indexDirectory(dir: string, store: VectorStore): Promise<number> {
  const files = await findSourceFiles(dir);
  let totalChunks = 0;

  for (const file of files) {
    let content: string;
    try {
      content = await readFile(file, "utf-8");
    } catch {
      continue;
    }

    // Skip empty or very large files (>500 KB)
    if (!content.trim() || content.length > 500_000) continue;

    const relativePath = path.relative(dir, file);
    const results = await generateEmbeddings(content, relativePath);
    if (results.length === 0) continue;

    const chunks = results.map((r, i) => ({
      id: `${relativePath}:${i}`,
      content: r.content,
      embedding: r.embedding,
      metadata: { file: relativePath, line: i * 30 },
    }));

    await store.addChunks(chunks);
    totalChunks += chunks.length;
  }

  log(`Indexed ${totalChunks} chunks from ${files.length} files in ${dir}`);
  return totalChunks;
}
