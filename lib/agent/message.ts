import { nanoid } from "nanoid";
import type { AgentMessage, AgentMessageKind, AgentAction } from "./types";
import type { Suggestion } from "./suggestions/types";

export function mkMessage(
  kind: AgentMessageKind,
  text: string,
  extras?: Partial<
    Pick<AgentMessage, "actions" | "suggestionId" | "suggestion">
  >,
): AgentMessage {
  return {
    id: nanoid(),
    kind,
    text,
    createdAt: new Date().toISOString(),
    ...extras,
  };
}

export function mkSuggestionMessage(suggestion: Suggestion): AgentMessage {
  return mkMessage("suggestion", suggestion.text, {
    actions: suggestion.actions,
    suggestionId: suggestion.id,
    suggestion,
  });
}

export function agentMessageToContent(msg: AgentMessage): string {
  return msg.text;
}

export type { AgentAction };
