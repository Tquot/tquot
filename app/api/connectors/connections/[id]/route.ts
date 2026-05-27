import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import { deleteConnection } from "@/lib/connectors/storage";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserAndAgency(req);
    if ("response" in auth) return auth.response;
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
