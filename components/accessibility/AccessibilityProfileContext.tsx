"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AccessibilityProfile } from "@/lib/accessibility/types";

interface AccessibilityProfileContextValue {
  profile: AccessibilityProfile | undefined;
  setProfile: (profile: AccessibilityProfile) => void;
}

const AccessibilityProfileContext =
  createContext<AccessibilityProfileContextValue>({
    profile: undefined,
    setProfile: () => undefined,
  });

export function AccessibilityProfileProvider({
  initial,
  children,
}: {
  initial?: AccessibilityProfile;
  children: ReactNode;
}) {
  const [profile, setProfile] = useState<AccessibilityProfile | undefined>(
    initial,
  );

  const value = useMemo(
    () => ({ profile, setProfile }),
    [profile],
  );

  return (
    <AccessibilityProfileContext.Provider value={value}>
      {children}
    </AccessibilityProfileContext.Provider>
  );
}

export function useAccessibilityProfile() {
  return useContext(AccessibilityProfileContext);
}
