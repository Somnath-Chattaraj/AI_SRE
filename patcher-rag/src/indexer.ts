import { generateEmbeddings } from "./lib/embedding.js";
import { VectorStore } from "./lib/storage.js";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { log } from "./lib/tools.js";

const DEFAULT_TARGET_DIR = "../application/src";

interface IndexOptions {
  targetDir?: string;
  collection?: string;
}

async function findJsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await findJsFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function indexCode(options: IndexOptions = {}): Promise<void> {
  const targetDir = options.targetDir ?? DEFAULT_TARGET_DIR;
  const collectionName = options.collection ?? "codebase";

  const store = new VectorStore();
  await store.init(collectionName);

  const files = await findJsFiles(targetDir);

  let totalChunks = 0;

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const relativePath = path.relative(process.cwd(), file);

    const results = await generateEmbeddings(content, relativePath);

    const chunks = results.map((r, i) => ({
      id: `${relativePath}:${i}`,
      content: r.content,
      embedding: r.embedding,
      metadata: { file: relativePath, line: i * 100 },
    }));

    log(`Prepared ${chunks.length} chunks from ${relativePath}`);
    log("chunks", chunks.map((c) => c.content).join("\n---\n"));

    if (chunks.length > 0) {
      await store.addChunks(chunks);
      totalChunks += chunks.length;
    }
  }

  log(`Indexed ${totalChunks} chunks from ${files.length} files`);
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: bun run indexer.ts [options]

Options:
  --target-dir <path>  Target directory to index (default: ${DEFAULT_TARGET_DIR})
  --collection <name>  ChromaDB collection name (default: codebase)
  --help, -h          Show this help
`);
  process.exit(0);
}

const targetIndex = args.indexOf("--target-dir");
const collectionIndex = args.indexOf("--collection");

const options: IndexOptions = {
  targetDir: targetIndex >= 0 ? args[targetIndex + 1] : undefined,
  collection: collectionIndex >= 0 ? args[collectionIndex + 1] : undefined,
};

indexCode(options).catch(console.error);
