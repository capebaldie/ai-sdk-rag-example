"use server";

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from "@/lib/db/schema/resources";
import { db } from "../db";
import { generateEmbeddings } from "@/lib/ai/embedding";
import { embeddings as embeddingsTable } from "@/lib/db/schema/embeddings";

export const createResource = async (input: NewResourceParams) => {
  const { content } = insertResourceSchema.parse(input);

  // This is where we insert the resource into the resources table
  const [resource] = await db.insert(resources).values({ content }).returning();

  // This is where we generate embeddings for the resource content and store them in the embeddings table
  const embeddings = await generateEmbeddings(content);
  await db.insert(embeddingsTable).values(
    embeddings.map((embedding) => ({
      resourceId: resource.id,
      content: embedding.content,
      embedding: embedding.embedding,
    })),
  );

  return "Resource created and embedded.";
};
