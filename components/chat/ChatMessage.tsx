"use client";

interface BaseProps {
  role: "user" | "agent" | "system";
  children: React.ReactNode;
  timestamp?: string;
}

export function ChatMessage({ role, children, timestamp }: BaseProps) {
  if (role === "user") {
    return <UserMessage timestamp={timestamp}>{children}</UserMessage>;
  }
  if (role === "agent") {
    return <AgentMessage timestamp={timestamp}>{children}</AgentMessage>;
  }
  return <SystemMessage>{children}</SystemMessage>;
}

function UserMessage({
  children,
  timestamp,
}: {
  children: React.ReactNode;
  timestamp?: string;
}) {
  return (
    <div className="flex animate-slide-up-fade justify-end">
      <div className="max-w-[85%] rounded-lg rounded-tr-sm border border-border-1 bg-paper-2 px-4 py-3">
        <div className="whitespace-pre-wrap text-body leading-relaxed text-ink">
          {children}
        </div>
        {timestamp ? (
          <div className="mt-1 text-right text-[10px] uppercase tracking-wider text-text-3">
            {timestamp}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AgentMessage({
  children,
  timestamp,
}: {
  children: React.ReactNode;
  timestamp?: string;
}) {
  return (
    <div className="animate-slide-up-fade space-y-1.5">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-eyebrow text-umber">TQUOT</span>
        {timestamp ? (
          <span className="text-[10px] uppercase tracking-wider text-text-3">
            {timestamp}
          </span>
        ) : null}
      </div>
      <div className="max-w-[90%] pl-0 text-body leading-relaxed text-text">
        {children}
      </div>
    </div>
  );
}

function SystemMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 flex animate-slide-up-fade items-center gap-3">
      <div className="h-px flex-1 bg-border-1" />
      <span className="px-2 font-mono text-eyebrow text-text-3">{children}</span>
      <div className="h-px flex-1 bg-border-1" />
    </div>
  );
}

interface StreamingProps {
  text: string;
  done: boolean;
}

export function StreamingText({ text, done }: StreamingProps) {
  return (
    <>
      <span>{text}</span>
      {!done ? (
        <span
          className="ml-0.5 inline-block h-[1em] w-[2px] animate-cursor-blink bg-umber align-text-bottom"
          aria-hidden
        />
      ) : null}
    </>
  );
}
