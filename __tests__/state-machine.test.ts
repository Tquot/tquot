import { describe, it, expect } from "vitest";
import {
  conversationReducer,
  initialState,
} from "@/lib/quote-conversation/state-machine";
import type { Quote } from "@/lib/quotes/build-quote";

describe("conversationReducer — flujo de refinamiento con plan", () => {
  const mockParsed = {
    destination: "Roma",
    dates: { start: "2026-03-15", end: "2026-03-18" },
    passengers: { adults: 2, children: 0 },
    preferences: { hotelLevel: "standard", directFlights: false, accessibility: false },
    includeHotels: true,
    includeExperiences: true,
    includeFlights: true,
    origin: "MAD",
  } as const;
  const mockQuote: Quote = {
    id: "q-1",
    pricing: { finalTotal: 1500, baseTotal: 1200, margin: 300, currency: "EUR" },
    summary: {
      route: "MAD → Roma",
      durationDays: 4,
      passengers: { adults: 2, children: 0, total: 2 },
    },
    flights: [],
    hotels: [],
    experiences: [],
    transfers: [],
    _meta: {
      flightsSource: "mock",
      hotelsSource: "mock",
      experiencesSource: "mock",
      transfersSource: "mock",
    },
  };
  const mockPlan = {
    id: "plan-1",
    userInput: "cambia el hotel",
    intent: { kind: "change_hotel" as const, criteria: "más barato" },
    planMessage: "Te cambio el hotel...",
    operation: { action: "cheaper" as const },
    estimatedImpact: { affectedSections: ["hotels" as const], reasoning: "x" },
    createdAt: new Date().toISOString(),
  };

  it("complete → planning_refinement con USER_REFINE_INPUT", () => {
    const initial = {
      status: "complete" as const,
      parsed: mockParsed,
      quote: mockQuote,
    };
    const next = conversationReducer(initial, {
      type: "USER_REFINE_INPUT",
      userInput: "cambia el hotel",
    });
    expect(next.status).toBe("planning_refinement");
    if (next.status === "planning_refinement") {
      expect(next.userInput).toBe("cambia el hotel");
    }
  });

  it("planning_refinement → awaiting_confirmation con REFINE_PLAN_READY", () => {
    const initial = {
      status: "planning_refinement" as const,
      parsed: mockParsed,
      quote: mockQuote,
      userInput: "cambia el hotel",
    };
    const next = conversationReducer(initial, {
      type: "REFINE_PLAN_READY",
      plan: mockPlan,
    });
    expect(next.status).toBe("awaiting_confirmation");
    if (next.status === "awaiting_confirmation") {
      expect(next.plan.id).toBe("plan-1");
    }
  });

  it("awaiting_confirmation → refining con REFINE_CONFIRM", () => {
    const initial = {
      status: "awaiting_confirmation" as const,
      parsed: mockParsed,
      quote: mockQuote,
      plan: mockPlan,
    };
    const next = conversationReducer(initial, { type: "REFINE_CONFIRM" });
    expect(next.status).toBe("refining");
    if (next.status === "refining") {
      expect(next.operationId).toBe("plan-1");
    }
  });

  it("awaiting_confirmation → complete con REFINE_CANCEL", () => {
    const initial = {
      status: "awaiting_confirmation" as const,
      parsed: mockParsed,
      quote: mockQuote,
      plan: mockPlan,
    };
    const next = conversationReducer(initial, { type: "REFINE_CANCEL" });
    expect(next.status).toBe("complete");
  });

  it("REFINE_COMPLETE con operationId obsoleto se ignora", () => {
    const initial = {
      status: "refining" as const,
      parsed: mockParsed,
      quote: mockQuote,
      operation: { action: "cheaper" as const },
      operationId: "plan-1",
    };
    const next = conversationReducer(initial, {
      type: "REFINE_COMPLETE",
      quote: { ...mockQuote, pricing: { ...mockQuote.pricing, finalTotal: 999 } },
      operationId: "plan-OLD",
    });
    expect(next.status).toBe("refining");
  });
});
