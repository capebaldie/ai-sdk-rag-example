import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  smoothStream,
  streamText,
  toUIMessageStream,
  UIMessage,
  tool,
  isStepCount,
} from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import {
  createResource,
  removeResource,
  updateResource,
} from "@/lib/actions/resources";
import { findRelevantContent } from "@/lib/ai/embedding";
import { describeError } from "@/lib/ai/describe-error";
import { env } from "@/lib/env.mjs";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google(env.TEXT_MODEL || "gemini-3.6-flash"),
    system: `You are a helpful assistant. Check your knowledge base before answering any questions.
Only use information returned by tool calls when answering.
Tool selection rules:
- If the user is asking a question that depends on stored knowledge, call getInformation.
- If the user is giving you a new fact, memory, or note to save, call addResource.
- If the user asks you to delete, forget, or remove something, call removeResource.
- If the user wants an existing fact changed or corrected, call updateResource.
Do not answer from general world knowledge when the answer should come from the knowledge base.
If no relevant information is found in tool results, respond exactly: "Sorry, I don't know."`,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    tools: {
      addResource: tool({
        description: `Store a new fact, note, or memory in the knowledge base.
Use this when the user is telling you something to remember, save, or learn.
Do not use it for questions, deletions, or edits.
If the user shares a standalone fact unprompted, save it directly without asking for confirmation.`,
        inputSchema: z.object({
          content: z
            .string()
            .min(1)
            .describe("a single fact or note to save in the knowledge base"),
        }),
        execute: async ({ content }) => createResource({ content }),
      }),

      getInformation: tool({
        description: `Search the knowledge base for facts relevant to the user's question.
Use this before answering any question that might depend on stored information.
Return matches from the knowledge base, not a direct guess from memory.`,
        inputSchema: z.object({
          question: z.string().describe("the user's question or search query"),
        }),
        execute: async ({ question }) => findRelevantContent(question),
      }),

      removeResource: tool({
        description: `Delete a stored fact or note from the knowledge base.
Use this when the user asks to delete, remove, forget, or stop remembering something.
The query should describe the fact to find, not a database id.`,
        inputSchema: z.object({
          query: z
            .string()
            .min(1)
            .describe(
              "a natural-language description of the fact or note to remove",
            ),
        }),
        execute: async ({ query }) => removeResource({ query }),
      }),

      updateResource: tool({
        description: `Replace an existing stored fact with updated information.
Use this when the user corrects a previous fact, revises a memory, or wants an entry changed.
The oldContent should identify the thing to update, and newContent should contain the replacement.`,
        inputSchema: z.object({
          oldContent: z
            .string()
            .min(1)
            .describe("the existing fact or note that should be replaced"),

          newContent: z
            .string()
            .min(1)
            .describe("the updated fact or note to save"),
        }),
        execute: async ({ oldContent, newContent }) =>
          updateResource({ oldContent, newContent }),
      }),
    },
    // Smooth the stream to reduce jitter and improve the user experience
    experimental_transform: smoothStream({ delayInMs: 15, chunking: "word" }),
    // providerOptions: {
    //   google: { thinkingConfig: { thinkingLevel: "minimal" } },
    // },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // Default is `() => "An error occurred."`, which hides quota/network
      // failures from the UI. Log the real error, send a usable message.
      onError: (error) => {
        console.error("[chat]", error);
        return describeError(error);
      },
    }),
  });
}
