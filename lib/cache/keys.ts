export const cacheKeys = {
  analytics: (agencyId: string, preset: string) =>
    // Natural invalidation: key changes every hour.
    `analytics:${agencyId}:${preset}:${new Date().toISOString().slice(0, 13)}`,
};

