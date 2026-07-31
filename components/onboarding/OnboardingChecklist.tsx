"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface ChecklistItem {
  key: string;
  label: string;
  href: string;
  done: boolean;
}

interface Props {
  items: ChecklistItem[];
}

export function OnboardingChecklist({ items }: Props) {
  const remaining = items.filter((i) => !i.done);
  if (remaining.length === 0) return null;

  return (
    <section className="rounded-lg border border-border-1 bg-paper-2 p-5">
      <Eyebrow className="mb-3 block" tone="accent">
        Configuración pendiente
      </Eyebrow>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3">
            <span
              className={
                item.done
                  ? "text-body-sm text-text-3 line-through"
                  : "text-body-sm text-ink"
              }
            >
              {item.label}
            </span>
            {!item.done ? (
              <Link
                href={item.href}
                className="text-body-sm text-accent underline-offset-2 hover:underline"
              >
                Completar
              </Link>
            ) : (
              <span className="text-body-sm text-success">Hecho</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
