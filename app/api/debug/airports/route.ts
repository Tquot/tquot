import { resolveCity } from "@/lib/airports/search";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "Londres";
  return Response.json({
    query: q,
    result: resolveCity(q),
  });
}
