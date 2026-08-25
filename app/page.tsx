"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ToolCall } from "@/components/ToolCall";
import UserInputForm from "@/components/UserInputForm";

export default function Home() {
  const { messages, sendMessage, status, error, regenerate, clearError, stop } =
    useChat();
  const busy = status === "submitted" || status === "streaming";
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, error]);

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-sm font-semibold">Knowledge base</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 py-6">
          {messages.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Nothing stored yet</p>
              <p className="mt-1">
                Try &ldquo;my favourite food is burger&rdquo;, then ask
                &ldquo;what is my favourite food?&rdquo;
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex flex-col gap-1.5",
                m.role === "user" ? "items-end" : "items-start",
              )}
            >
              {m.parts.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return (
                      <div
                        key={i}
                        className={cn(
                          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        {part.text}
                      </div>
                    );
                  case "tool-addResource":
                  case "tool-getInformation":
                  case "tool-removeResource":
                  case "tool-updateResource":
                    return (
                      <ToolCall
                        key={i}
                        name={part.type.replace("tool-", "")}
                        state={part.state}
                        input={part.input}
                        output={
                          part.state === "output-available"
                            ? part.output
                            : undefined
                        }
                        errorText={
                          part.state === "output-error"
                            ? part.errorText
                            : undefined
                        }
                      />
                    );
                  default:
                    return null;
                }
              })}
            </div>
          ))}

          {status === "submitted" && (
            <div className="flex gap-1 px-1">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="size-2 animate-bounce rounded-full bg-muted-foreground/50"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm"
            >
              <p className="text-destructive">{error.message}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => regenerate()}
                >
                  Retry
                </Button>
                <Button size="sm" variant="ghost" onClick={clearError}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <UserInputForm
        busy={busy}
        clearError={clearError}
        sendMessage={sendMessage}
        stop={stop}
      />
    </div>
  );
}
