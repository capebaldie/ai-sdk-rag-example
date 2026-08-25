"use client";

import React, { useState } from "react";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const UserInputForm = ({
  busy,
  clearError,
  sendMessage,
  stop,
}: {
  busy: boolean;
  clearError: () => void;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  stop: () => void;
}) => {
  const [input, setInput] = useState("");

  return (
    <div>
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
};

export default UserInputForm;
