import { readdir, readFile } from "fs/promises";
import path from "path";
import { generateEmbeddings } from "./embedding.js";
import { VectorStore } from "./storage.js";
import { log } from "./tools.js";

async function findSourceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip common non-source directories
      if ([".git", "node_modules", "dist", ".next", "coverage"].includes(entry.name)) continue;
      files.push(...(await findSourceFiles(full)));
    } else if (/\.(js|ts|jsx|tsx|mjs|cjs)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Index all source files in a directory into the given VectorStore.
 * Existing documents are upserted so re-indexing is safe.
 */
export async function indexDirectory(dir: string, store: VectorStore): Promise<number> {
  const files = await findSourceFiles(dir);
  let totalChunks = 0;

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const relativePath = path.relative(dir, file);
    const results = await generateEmbeddings(content, relativePath);
    if (results.length === 0) continue;

    const chunks = results.map((r, i) => ({
      id: `${relativePath}:${i}`,
      content: r.content,
      embedding: r.embedding,
      metadata: { file: relativePath, line: i * 20 },
    }));

    await store.addChunks(chunks);
    totalChunks += chunks.length;
  }

  log(`Indexed ${totalChunks} chunks from ${files.length} files in ${dir}`);
  return totalChunks;
}
