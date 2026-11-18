import { NextRequest, NextResponse } from "next/server";
import { replyTo } from "@/lib/cyberguard/chatbot";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const question = typeof body?.question === "string" ? body.question.trim() : "";

    if (!question) {
      return NextResponse.json({ error: "Please type a cybersecurity question." }, { status: 400 });
    }
    if (question.length > 1000) {
      return NextResponse.json({ error: "Question too long (max 1000 characters)." }, { status: 400 });
    }

    const reply = replyTo(question);
    return NextResponse.json({ ok: true, ...reply });
  } catch (err) {
    console.error("chat route error", err);
    return NextResponse.json({ error: "Chat service unavailable. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  const { getSuggestedQuestions } = await import("@/lib/cyberguard/chatbot");
  return NextResponse.json({ ok: true, suggestions: getSuggestedQuestions() });
}
