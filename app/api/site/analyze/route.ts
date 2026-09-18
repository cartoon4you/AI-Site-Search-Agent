import { NextRequest, NextResponse } from "next/server";
import { analyzeSite } from "@/lib/site/strategy-picker";

export async function POST(req: NextRequest) {
  try {
    const { host } = await req.json();

    if (!host || typeof host !== "string") {
      return NextResponse.json({ error: "Host parameter is required" }, { status: 400 });
    }

    const analysis = await analyzeSite(host);
    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error("Analyze site API error:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze site" }, { status: 500 });
  }
}
