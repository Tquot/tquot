import { NextRequest, NextResponse } from "next/server";
import { deleteConnection } from "@/lib/connectors/storage";

// AUTH_TODO: usar tu helper real.
async function requireAuth(_req: NextRequest): Promise<void> {
  throw new Error("AUTH_TODO: implementar requireAuth.");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req);
    const { id } = await params;
    await deleteConnection(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
