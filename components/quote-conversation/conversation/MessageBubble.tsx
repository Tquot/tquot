"use client";

import type { Message } from "@/lib/quote-conversation/types";

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  if (message.role === "system") {
    return null;
  }

  const isUser = message.role === "user";
  const isStreaming = message.role === "assistant" && message.streaming === true;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2 px-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-white border border-neutral-200 text-neutral-900 rounded-bl-md"
        }`}
      >
        <span>{message.content}</span>
        {isStreaming ? (
          <span
            aria-hidden
            className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom bg-neutral-700 animate-pulse"
          />
        ) : null}
      </div>
    </div>
  );
}
