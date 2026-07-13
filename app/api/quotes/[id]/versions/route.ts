import { listVersions } from "@/lib/versioning/list-versions";
import { getAuthenticatedUser } from "@/app/api/parser/_auth";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const versions = await listVersions(id);
  return new Response(JSON.stringify({ versions }), {
    headers: { "Content-Type": "application/json" },
  });
}
