"use client";

import { useState } from "react";

const DEFAULT_REQUEST =
  "Necesito un viaje para 2 adultos a Ribadesella, 3 noches, hotel con encanto, vuelos desde Madrid y una experiencia local.";
const TEST_AGENT_ID = "test-agent";

export default function TestParserPage() {
  const [text, setText] = useState(DEFAULT_REQUEST);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [responseJson, setResponseJson] = useState<unknown>(null);

  async function parseRequest() {
    setIsSubmitting(true);
    setError("");
    setResponseJson(null);

    try {
      const response = await fetch("/api/parser/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          agentId: TEST_AGENT_ID,
          currentDate: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await response.json();

      setResponseJson(data);

      if (!response.ok) {
        setError(data.error ?? "Parser request failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parser request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isDisabled = isSubmitting || !text.trim();

  return (
    <main className="min-h-screen bg-[#03080F] px-6 py-10 text-[#E8EEF7]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(0,201,167,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(245,197,24,0.08),transparent_32%)]" />

      <section className="relative mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#00C9A7]">
            TQuot Parser Test
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Test parser API
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8B9CB3]">
            Paste a travel request, submit it to <code>/api/parser/parse</code>,
            and inspect the raw JSON response.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
            <label
              htmlFor="travel-request"
              className="mb-3 block text-sm font-semibold text-white"
            >
              Travel request
            </label>
            <textarea
              id="travel-request"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={14}
              className="w-full resize-none rounded-2xl border border-white/[0.1] bg-[#050D18] p-4 text-sm leading-6 text-white outline-none transition-colors placeholder:text-[#8B9CB3] focus:border-[#00C9A7]/60"
              placeholder="Paste a client request here..."
            />

            {error ? (
              <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={parseRequest}
              disabled={isDisabled}
              className="mt-5 rounded-2xl bg-[#00C9A7] px-5 py-3 text-sm font-bold text-[#03080F] shadow-[0_0_34px_-10px_rgba(0,201,167,0.9)] transition-colors hover:bg-[#00E5BB] disabled:cursor-not-allowed disabled:bg-[#18332F] disabled:text-[#8B9CB3]"
            >
              {isSubmitting ? "Parsing..." : "POST /api/parser/parse"}
            </button>
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-[#050D18] p-5 shadow-2xl shadow-black/30">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">JSON response</h2>
              <span className="rounded-full border border-[#F5C518]/20 bg-[#F5C518]/10 px-3 py-1 text-xs font-semibold text-[#F5C518]">
                Raw output
              </span>
            </div>
            <pre className="min-h-[430px] overflow-auto rounded-2xl border border-white/[0.06] bg-black/30 p-4 text-xs leading-5 text-[#C9D6E8]">
              {responseJson
                ? JSON.stringify(responseJson, null, 2)
                : "Submit a request to see the parser response."}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}
