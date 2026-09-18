import { NextRequest, NextResponse } from "next/server";
import { verifyDomainOwnership, createVerificationRequest } from "@/lib/site/verify";

export async function POST(req: NextRequest) {
  try {
    const { host, method, action } = await req.json();

    if (!host || !method) {
      return NextResponse.json({ error: "Host and method ('dns' | 'meta') are required" }, { status: 400 });
    }

    if (action === "init") {
      const initResult = await createVerificationRequest(host, method);
      return NextResponse.json(initResult);
    }

    const result = await verifyDomainOwnership(host, method);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Verification API error:", err);
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
}
