import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env["ANTHROPIC_API_KEY"];

  return NextResponse.json({
    ANTHROPIC_API_KEY: {
      present: !!key,
      length: key?.length ?? 0,
    },
  });
}
