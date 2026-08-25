import { sql } from "drizzle-orm";
import { text, varchar, timestamp, pgTable } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { nanoid } from "@/lib/utils";

export const resources = pgTable("resources", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  content: text("content").notNull(),

  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`now()`),
});

// Schema for resources - used to validate API requests
export const insertResourceSchema = createSelectSchema(resources)
  .extend({})
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Schema for removing resource based on user query
export const deleteResourceSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .describe("the information or fact to remove from the knowledge base"),
});

export const updateResourceSchema = z.object({
  oldContent: z
    .string()
    .trim()
    .min(1)
    .describe("the existing information to replace"),
  newContent: z.string().trim().min(1).describe("the new information to save"),
});

// Type for resources - used to type API request params and within Components
export type NewResourceParams = z.infer<typeof insertResourceSchema>;

// Type for removing the resource
export type DeleteResourceParams = z.infer<typeof deleteResourceSchema>;

// Type for updating resource
export type UpdateResourceParams = z.infer<typeof updateResourceSchema>;
