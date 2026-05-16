"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

type LoginFormProps = {
  redirectTo?: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-[#E8EEF7]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@agency.com"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[#E8EEF7] placeholder:text-[#8B9CB3]/60 outline-none transition-colors focus:border-[#00C9A7]/50 focus:ring-2 focus:ring-[#00C9A7]/20"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-medium text-[#E8EEF7]"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[#E8EEF7] placeholder:text-[#8B9CB3]/60 outline-none transition-colors focus:border-[#00C9A7]/50 focus:ring-2 focus:ring-[#00C9A7]/20"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-[#FF6B35]/30 bg-[#FF6B35]/10 px-4 py-3 text-sm text-[#FF6B35]"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-[#00C9A7] px-4 py-3 text-sm font-semibold text-[#03080F] transition-all hover:bg-[#00E5BB] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
