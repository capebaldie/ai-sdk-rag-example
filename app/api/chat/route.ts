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
import { createResource } from "@/lib/actions/resources";
import { findRelevantContent } from "@/lib/ai/embedding";
import { describeError } from "@/lib/ai/describe-error";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-3.6-flash"),
    system: `You are a helpful assistant. Check your knowledge base before answering any questions.
    Only respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry, I don't know."`,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    // Add a tool to add resources to the knowledge base
    // What this tool does: It takes a piece of content and adds it to the knowledge base. The content is then embedded and stored in the database for future reference.
    tools: {
      addResource: tool({
        description: `add a resource to your knowledge base.
          If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
        inputSchema: z.object({
          content: z
            .string()
            .describe("the content or resource to add to the knowledge base"),
        }),
        execute: async ({ content }) => createResource({ content }),
      }),
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        inputSchema: z.object({
          question: z.string().describe("the users question"),
        }),
        execute: async ({ question }) => findRelevantContent(question),
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
