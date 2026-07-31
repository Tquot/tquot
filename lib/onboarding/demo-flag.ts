/**
 * Module flag so useQuoteBuilder can send demo:true without prop drilling
 * through every hook. Set/cleared by QuoteConversation.
 */
let demoBuildActive = false;

export function setQuoteDemoFlag(active: boolean) {
  demoBuildActive = active;
}

export function useQuoteDemoFlag(): boolean {
  return demoBuildActive;
}

export function isQuoteDemoBuild(): boolean {
  return demoBuildActive;
}
