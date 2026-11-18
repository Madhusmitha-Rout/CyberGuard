import { NextRequest, NextResponse } from "next/server";
import { predictMessage } from "@/lib/cyberguard/model";
import { buildScorecard } from "@/lib/cyberguard/scorecard";

export const dynamic = "force-dynamic";

// NOTE: Privacy guarantee — this route is stateless. It never writes the
// pasted message to any database, log, or file. Only the ML prediction and
// heuristic scorecard are computed in memory and returned.

function recommendations(isSpam: boolean, level: string): string[] {
  if (isSpam || level === "HIGH") {
    return [
      "Do NOT click any link, scan any QR, or reply to the sender.",
      "Do NOT share OTP, CVV, UPI PIN, passwords, or Aadhaar/PAN photos.",
      "Verify independently: open the official app/website yourself (never via this link).",
      "Report: call 1930 and file at cybercrime.gov.in with screenshots + sender number.",
      "Block the sender and warn family members who may get the same message.",
    ];
  }
  if (level === "MEDIUM") {
    return [
      "Pause before acting — verify the sender through an official channel.",
      "Do not click links; type the official website address yourself.",
      "If money is involved, confirm by calling a known number (not one in the message).",
    ];
  }
  return [
    "Few warning signs found — but stay alert, wording changes constantly.",
    "Keep 2FA on, never share OTP/PIN, and verify unexpected requests anyway.",
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const raw = typeof body?.message === "string" ? body.message : "";

    if (typeof body?.message !== "string" || !raw.trim()) {
      return NextResponse.json({ error: "Please paste an SMS, email or suspicious text to analyze." }, { status: 400 });
    }
    if (raw.trim().length < 3) {
      return NextResponse.json({ error: "Message too short to analyze." }, { status: 400 });
    }
    if (raw.length > 2000) {
      return NextResponse.json({ error: "Message too long (max 2000 characters)." }, { status: 400 });
    }

    const text = raw.trim();
    // Real trained-model classification — never hardcoded.
    const prediction = predictMessage(text);
    const scorecard = buildScorecard(text);
    const isSpam = prediction.label === 1;

    return NextResponse.json({
      ok: true,
      privacy: "Your pasted message was analyzed in memory only and was NOT stored.",
      prediction: {
        label: prediction.label,
        labelText: prediction.labelText,
        spamProbability: Number(prediction.spamProbability.toFixed(4)),
        confidence: prediction.confidence,
        topSignals: prediction.topSignals,
        foundKeywords: prediction.foundKeywords,
        disclaimer: prediction.disclaimer,
      },
      scorecard,
      recommendations: recommendations(isSpam, scorecard.level),
      model: "TF-IDF (unigrams+bigrams) + Logistic Regression, trained on labelled corpus",
    });
  } catch (err) {
    console.error("analyze route error", err);
    return NextResponse.json({ error: "Analyzer unavailable. Please try again." }, { status: 500 });
  }
}
