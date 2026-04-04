import { CloudClient, type Collection } from "chromadb";
import { generateEmbeddings } from "./embedding.js";

export interface CodeChunk {
  id: string;
  content: string;
  metadata: {
    file: string;
    line?: number;
  };
}

export class VectorStore {
  private client: CloudClient;
  private collection: Collection | null = null;

  constructor() {
    this.client = new CloudClient({
      apiKey: process.env.CHROMA_API_KEY!,
      tenant: process.env.CHROMA_TENANT!,
      database: process.env.CHROMA_DATABASE!,
    });
  }

  async init(collectionName: string = "codebase"): Promise<void> {
    this.collection = await this.client.getOrCreateCollection({ name: collectionName });
  }

  async addChunks(chunks: { id: string; content: string; embedding: number[]; metadata?: { file: string; line?: number } }[]): Promise<void> {
    if (!this.collection) throw new Error("Collection not initialized");

    const validChunks = chunks
      .map((chunk) => ({
        ...chunk,
        embedding: chunk.embedding.filter((n) => Number.isFinite(n)),
      }))
      .filter((chunk) => chunk.embedding.length > 0);

    if (validChunks.length === 0) return;

    const embeddingDimension = validChunks[0]!.embedding.length;
    const alignedChunks = validChunks.filter(
      (chunk) => chunk.embedding.length === embeddingDimension,
    );

    if (alignedChunks.length === 0) return;

    await this.collection.upsert({
      ids: alignedChunks.map((c) => c.id),
      embeddings: alignedChunks.map((c) => Array.from(new Float32Array(c.embedding))),
      documents: alignedChunks.map((c) => c.content),
      metadatas: alignedChunks.map((c) => ({
        file: c.metadata?.file ?? "unknown",
        line: c.metadata?.line ?? 0,
      })),
    });
  }

  async query(queryText: string, nResults: number = 5): Promise<CodeChunk[]> {
    if (!this.collection) throw new Error("Collection not initialized");

    const queryEmbeddings = await generateEmbeddings(queryText, "query");
    if (queryEmbeddings.length === 0 || !queryEmbeddings[0]) return [];

    const queryEmbedding = Array.from(new Float32Array(queryEmbeddings[0].embedding));
    if (queryEmbedding.length === 0) return [];

    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults,
    });

    const chunks: CodeChunk[] = [];
    const docs = results.documents[0] ?? [];
    const ids = results.ids[0] ?? [];
    const metadatas = results.metadatas[0] ?? [];

    for (let i = 0; i < docs.length; i++) {
      chunks.push({
        id: ids[i] ?? `chunk-${i}`,
        content: String(docs[i] ?? ""),
        metadata: {
          file: String(metadatas[i]?.file ?? "unknown"),
          line: Number(metadatas[i]?.line ?? 0),
        },
      });
    }
    return chunks;
  }

  async deleteCollection(name: string): Promise<void> {
    await this.client.deleteCollection({ name });
  }
}
