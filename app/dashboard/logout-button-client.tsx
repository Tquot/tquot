"use client";

import { logoutAction } from "./actions";
import { useLanguage } from "./language-provider";

export function LogoutButtonClient() {
  const { t } = useLanguage();

  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-medium text-[#E8EEF7] transition-colors hover:border-[#00C9A7]/40 hover:bg-[#00C9A7]/10 hover:text-[#00C9A7]"
      >
        {t.logout}
      </button>
    </form>
  );
}
