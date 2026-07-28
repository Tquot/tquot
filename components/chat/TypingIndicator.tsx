"use client";

interface Props {
  label?: string;
}

export function TypingIndicator({ label = "Componiendo" }: Props) {
  return (
    <div className="flex animate-slide-up-fade items-center gap-2 text-text-2">
      <span className="font-mono text-eyebrow text-umber">TQUOT</span>
      <span className="text-body-sm">{label}</span>
      <span className="flex gap-0.5 font-mono text-mono-md" aria-hidden>
        <span
          className="animate-[pulse-soft_1200ms_ease-in-out_infinite]"
          style={{ animationDelay: "0ms" }}
        >
          ·
        </span>
        <span
          className="animate-[pulse-soft_1200ms_ease-in-out_infinite]"
          style={{ animationDelay: "200ms" }}
        >
          ·
        </span>
        <span
          className="animate-[pulse-soft_1200ms_ease-in-out_infinite]"
          style={{ animationDelay: "400ms" }}
        >
          ·
        </span>
      </span>
    </div>
  );
}
