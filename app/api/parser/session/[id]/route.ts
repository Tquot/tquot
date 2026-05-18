import { NextRequest, NextResponse } from "next/server";
import { getSessionStore } from "@/tquot-parser/lib/parser/session";
import { getAuthenticatedUser, validateAgentId } from "../../_auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const store = getSessionStore();
  const session = await store.load(id);

  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const agentError = validateAgentId(session.agentId ?? "", auth.user.id);
  if (agentError) return agentError;

  return NextResponse.json(session);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const store = getSessionStore();
  const session = await store.load(id);

  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const agentError = validateAgentId(session.agentId ?? "", auth.user.id);
  if (agentError) return agentError;

  await store.delete(id);
  return NextResponse.json({ ok: true });
}
