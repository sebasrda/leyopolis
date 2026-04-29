import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

function buildComicPrompt(targetLang: string): string {
  return `Analyze this comic book page image. Find ALL text-containing elements: speech bubbles, thought bubbles, narration boxes, captions, dialog boxes, and sound effects.

For EACH text element, return a JSON array where each object has:
- "x": left edge as decimal percentage (0-100) from the LEFT edge of the image
- "y": top edge as decimal percentage (0-100) from the TOP edge of the image
- "width": element width as decimal percentage (0-100) of image width
- "height": element height as decimal percentage (0-100) of image height
- "text": the EXACT original text as it appears in the comic
- "translatedText": fluent, natural translation into ${targetLang} appropriate for comics

Rules:
- Positions must accurately surround the text element so overlaid text covers the original
- Include every visible text element, even small ones
- For translatedText use natural ${targetLang} (conversational, not formal, suitable for comics)
- Return ONLY a valid JSON array — no markdown, no code blocks, no explanation
- If no text on the page, return: []`;
}

async function analyzeWithClaude(imageBase64: string, targetLang: string, apiKey: string): Promise<any[] | null> {
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
            { type: "text", text: buildComicPrompt(targetLang) },
          ],
        }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) return null;
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/g, "").trim();
    return JSON.parse(cleaned);
  } catch { return null; }
}

async function analyzeWithOpenAI(imageBase64: string, targetLang: string, apiKey: string): Promise<any[] | null> {
  if (!apiKey || apiKey.length < 10) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" } },
            { type: "text", text: buildComicPrompt(targetLang) },
          ],
        }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/g, "").trim();
    return JSON.parse(cleaned);
  } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { imageBase64, targetLanguage, pageNum, bookId } = await req.json();
    if (!imageBase64 || !targetLanguage) {
      return NextResponse.json({ error: "Missing imageBase64 or targetLanguage" }, { status: 400 });
    }

    // Cache key based on image content hash + language
    const imgHash = createHash("sha1").update(imageBase64.slice(0, 20000)).digest("hex");
    const cacheHash = `comic-v1::${targetLanguage}::${imgHash}`;

    const cached = await prisma.translation.findUnique({ where: { hash: cacheHash } });
    if (cached) {
      try {
        return NextResponse.json({ bubbles: JSON.parse(cached.translatedText), engine: "cache" });
      } catch { /* stale cache, re-analyze */ }
    }

    // Fetch API keys from system settings
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc: Record<string, string>, s) => { acc[s.key] = s.value; return acc; }, {} as Record<string, string>);
    const sanitize = (v?: string) => (v || "").trim().replace(/^["']|["']$/g, "");
    const anthropicKey = sanitize(settingsMap.ANTHROPIC_API_KEY) || process.env.ANTHROPIC_API_KEY || "";
    const openaiKey = sanitize(settingsMap.OPENAI_API_KEY) || process.env.OPENAI_API_KEY || "";

    let bubbles: any[] | null = null;
    let engine = "";

    bubbles = await analyzeWithClaude(imageBase64, targetLanguage, anthropicKey);
    if (bubbles) engine = "claude-vision";

    if (!bubbles) {
      bubbles = await analyzeWithOpenAI(imageBase64, targetLanguage, openaiKey);
      if (bubbles) engine = "gpt4o-vision";
    }

    if (!Array.isArray(bubbles)) bubbles = [];

    try {
      await prisma.translation.upsert({
        where: { hash: cacheHash },
        update: {},
        create: {
          hash: cacheHash,
          originalText: `comic:${bookId ?? "?"}:p${pageNum ?? "?"}`,
          translatedText: JSON.stringify(bubbles),
          targetLanguage,
          engine: engine || "none",
        },
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ bubbles, engine });
  } catch (err) {
    console.error("[COMIC-VISION]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
