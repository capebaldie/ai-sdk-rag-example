"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function Home() {
  const [input, setInput] = useState("");
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || busy) return;
          clearError();
          sendMessage({ text: input });
          setInput("");
        }}
        className="border-t px-4 py-3"
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <Input
            value={input}
            autoFocus
            disabled={busy}
            placeholder={busy ? "Thinking..." : "Say something..."}
            onChange={(e) => setInput(e.currentTarget.value)}
          />
          {busy ? (
            <Button type="button" variant="outline" onClick={stop}>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              Send
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

/** Native <details> — no accordion library needed for a disclosure. */
function ToolCall({
  name,
  state,
  input,
  output,
  errorText,
}: {
  name: string;
  state: string;
  input: unknown;
  output?: unknown;
  errorText?: string;
}) {
  const failed = state === "output-error";
  const done = state === "output-available";

  return (
    <details
      className={cn(
        "max-w-[85%] rounded-lg border px-3 py-1.5 text-xs",
        failed && "border-destructive/50 bg-destructive/10",
      )}
    >
      <summary className="cursor-pointer list-none select-none text-muted-foreground marker:hidden">
        <span
          className={cn(
            "mr-2 inline-block size-1.5 rounded-full align-middle",
            failed
              ? "bg-destructive"
              : done
                ? "bg-muted-foreground/50"
                : "animate-pulse bg-foreground",
          )}
        />
        {failed ? `${name} failed` : done ? name : `${name}...`}
      </summary>
      <pre className="mt-2 overflow-x-auto text-[11px] text-muted-foreground">
        {errorText ?? JSON.stringify(output ?? input, null, 2)}
      </pre>
    </details>
  );
}
