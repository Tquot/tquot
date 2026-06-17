"use client";

import type { Message } from "@/lib/quote-conversation/types";
import { MessageBubble } from "./MessageBubble";

export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </>
  );
}
