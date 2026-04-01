import { chunk, type ChunkOptions } from "code-chunk";
import { pipeline, type FeatureExtractionPipeline, env } from "@huggingface/transformers";


let extractor: FeatureExtractionPipeline | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "sentence-transformers/all-MiniLM-L6-v2", {
      dtype: "fp32",
    });
  }
  return extractor;
}

export async function generateEmbeddings(
  text: string,
  fileName: string,
  options?: ChunkOptions,
): Promise<Array<{ embedding: number[]; content: string }>> {
  const chunks = await chunk(fileName, text, {
    language: "javascript",
    maxChunkSize: 500,
    ...options,
  });
  if (chunks.length === 0) return [];

  const embed = await getExtractor();

  const results = await Promise.all(
    chunks.map(async (c) => {
      const output = await embed(c.text, { pooling: "mean", normalize: true });
      return Array.from(output.tolist().flat());
    }),
  );

  return chunks.map((c, i) => ({
    content: c.text,
    embedding: results[i] ?? [],
  }));
}
