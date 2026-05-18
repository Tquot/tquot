import { NextRequest, NextResponse } from "next/server";
import { getSessionStore } from "@/lib/parser/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getSessionStore();
  const session = await store.load(id);

  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = getSessionStore();
  await store.delete(id);
  return NextResponse.json({ ok: true });
}
