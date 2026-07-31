"use client";

import {
  ChatMessage,
  StreamingText,
} from "@/components/chat/ChatMessage";
import { SuggestionMessage } from "@/components/chat/SuggestionMessage";
import type { Message } from "@/lib/quote-conversation/types";

interface Props {
  message: Message;
}

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function MessageBubble({ message }: Props) {
  if (message.role === "system") {
    const label =
      typeof message.payload?.label === "string"
        ? message.payload.label
        : message.type.replace(/-/g, " ");
    return (
      <div className="mb-3 px-4">
        <ChatMessage role="system">{label}</ChatMessage>
      </div>
    );
  }

  const isUser = message.role === "user";
  const isStreaming =
    message.role === "assistant" && message.streaming === true;
  const timestamp = formatTimestamp(message.timestamp);
  const suggestion =
    message.role === "assistant" ? message.metadata?.suggestion : undefined;

  if (suggestion) {
    return (
      <div className="mb-3 px-4">
        <SuggestionMessage suggestion={suggestion} />
      </div>
    );
  }

  return (
    <div className="mb-3 px-4">
      <ChatMessage
        role={isUser ? "user" : "agent"}
        timestamp={timestamp || undefined}
      >
        {isUser ? (
          message.content
        ) : (
          <StreamingText text={message.content} done={!isStreaming} />
        )}
      </ChatMessage>
    </div>
  );
}
