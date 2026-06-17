"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";

interface Props {
  onSubmit: (input: string) => void;
  disabled: boolean;
  placeholder: string;
}

export function MessageInput({ onSubmit, disabled, placeholder }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (disabled) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-neutral-200 p-3 bg-white">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          className="flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-50 disabled:text-neutral-400"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
