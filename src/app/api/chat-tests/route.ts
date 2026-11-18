import { NextResponse } from "next/server";
import { runChatbotTests, CHAT_TEST_CASES } from "@/lib/cyberguard/chatbot-tests";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { passed, total, results } = runChatbotTests();
    return NextResponse.json({
      ok: true,
      summary: `${passed}/${total} chatbot robustness tests passed`,
      passed,
      total,
      cases: CHAT_TEST_CASES.length,
      results,
      note: "Every case executed live through replyTo(); answers shown verbatim. Gibberish/incomplete use exact required strings; random words never invent context.",
    });
  } catch (err) {
    console.error("chat-tests error", err);
    return NextResponse.json({ error: "Test run failed." }, { status: 500 });
  }
}
