import { NextResponse } from "next/server";

export async function GET() {
  const gKey = process.env.GOOGLE_API_KEY || "UNDEFINED";
  const gemiKey = process.env.GEMINI_API_KEY || "UNDEFINED";
  
  return NextResponse.json({
    GOOGLE_API_KEY_PREFIX: gKey.substring(0, 10),
    GOOGLE_API_KEY_LENGTH: gKey.length,
    GEMINI_API_KEY_PREFIX: gemiKey.substring(0, 10),
    using_local: gKey !== "UNDEFINED",
    timestamp: new Date().toISOString()
  });
}
