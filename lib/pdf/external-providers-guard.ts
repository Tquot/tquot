import type { ProviderBlock } from "@/lib/recommendations/providers/types";

/** Hard rule: never render external operator contacts on the client PDF. */
export function shouldRenderExternalProvidersOnPdf(
  variant: "agent" | "client",
  blocks: ProviderBlock[],
): boolean {
  if (variant === "client") return false;
  return blocks.some((b) => b.providers.length > 0);
}
