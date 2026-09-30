import { NextResponse } from "next/server";
import { ensureDbInitialized } from "@/lib/db-seed";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const res = await ensureDbInitialized();
    return NextResponse.json({ success: true, message: "Database initialized successfully", res });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: "Seed failed" }, { status: 500 });
  }
}
