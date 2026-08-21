import { embed, embedMany } from "ai";
import { db } from "../db";
import { google } from "@ai-sdk/google";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { embeddings } from "../db/schema/embeddings";

const embeddingModel = google.embedding("gemini-embedding-001");

export const generateChunks = (input: string): string[] => {
  const chunks = input
    .split(".")
    .map((sentence) => sentence.trim())
    .filter((i) => i !== "");
  return chunks;
};

export const generateEmbeddings = async (
  value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
    providerOptions: { google: { outputDimensionality: 1536 } },
  });
  return embeddings.map((embedding, index) => ({
    embedding,
    content: chunks[index],
  }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
    providerOptions: { google: { outputDimensionality: 1536 } },
  });
  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded,
  )})`;
  const similarGuides = await db
    .select({ name: embeddings.content, similarity })
    .from(embeddings)
    .where(gt(similarity, 0.5))
    .orderBy((t) => desc(t.similarity))
    .limit(4);
  return similarGuides;
};
