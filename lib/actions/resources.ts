"use server";

import {
  DeleteResourceParams,
  NewResourceParams,
  UpdateResourceParams,
  deleteResourceSchema,
  insertResourceSchema,
  updateResourceSchema,
  resources,
} from "@/lib/db/schema/resources";
import { db } from "../db";
import { findRelevantContent, generateEmbeddings } from "@/lib/ai/embedding";
import { embeddings as embeddingsTable } from "@/lib/db/schema/embeddings";
import { eq } from "drizzle-orm";

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

export const removeResource = async (input: DeleteResourceParams) => {
  const { query } = deleteResourceSchema.parse(input);

  // finding content based on user query
  const [match] = await findRelevantContent(query);
  if (!match?.id) {
    return "No matching resource found.";
  }

  // deleting the content by checking the id after the content is found
  await db.delete(resources).where(eq(resources.id, match.id));

  return "Resource removed.";
};

export const updateResource = async (input: UpdateResourceParams) => {
  // parsing the is done by zod schema to validate the input
  const { oldContent, newContent } = updateResourceSchema.parse(input);

  const [match] = await findRelevantContent(oldContent);
  if (!match?.id) {
    return "No matching resource found to update.";
  }
  const resourceId = match.id;

  // Generate new embeddings for the updated content
  const newEmbeddings = await generateEmbeddings(newContent);

  // Perform the update and re-embedding in a transaction to ensure consistency
  await db.transaction(async (tx) => {
    await tx
      .update(resources)
      .set({ content: newContent, updatedAt: new Date() })
      .where(eq(resources.id, resourceId));

    await tx
      .delete(embeddingsTable)
      .where(eq(embeddingsTable.resourceId, resourceId));

    await tx.insert(embeddingsTable).values(
      newEmbeddings.map((embedding) => ({
        resourceId,
        content: embedding.content,
        embedding: embedding.embedding,
      })),
    );
  });

  return "Resource updated and re-embedded.";
};
