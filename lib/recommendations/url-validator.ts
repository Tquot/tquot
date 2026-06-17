import "server-only";

const TIMEOUT_MS = 4000;

export async function validateProviderUrls(
  urls: string[],
  enabled = false,
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (!enabled) {
    for (const url of urls) map.set(url, true);
    return map;
  }

  await Promise.all(
    urls.map(async (url) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timer);
        map.set(url, response.ok || response.status === 405);
      } catch {
        map.set(url, false);
      }
    }),
  );

  return map;
}
