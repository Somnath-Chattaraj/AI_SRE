import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

let extractor: FeatureExtractionPipeline | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "sentence-transformers/all-MiniLM-L6-v2", {
      dtype: "fp32",
    });
  }
  return extractor;
}



const splitter = RecursiveCharacterTextSplitter.fromLanguage("js", {
  chunkSize: 1500,
  chunkOverlap: 200,
});

export async function generateEmbeddings(
  text: string,
  _fileName: string,
): Promise<Array<{ embedding: number[]; content: string }>> {
  const chunks = await splitter.splitText(text);
  if (chunks.length === 0) return [];

  const embed = await getExtractor();

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const output = await embed(chunk, { pooling: "mean", normalize: true });
      return Array.from(output.tolist().flat() as number[]);
    }),
  );

  return chunks.map((chunk, i) => ({
    content: chunk,
    embedding: results[i] ?? [],
  }));
}
