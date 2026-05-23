import type { RefineAction } from "@/lib/quotes/refine/types";

export function isServerRefinementAction(action: RefineAction): boolean {
  return (
    action.action === "add_insurance" ||
    action.action === "change_hotel_level" ||
    action.action === "add_experience" ||
    action.action === "search_web"
  );
}
