import { NextRequest, NextResponse } from "next/server";
import { QUIZ_QUESTIONS, gradeQuiz, CATEGORY_TIPS } from "@/lib/cyberguard/quiz";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";

export const dynamic = "force-dynamic";

const VALID = new Set(["safe", "suspicious"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const learnerId = typeof body?.learnerId === "string" ? body.learnerId.trim() : "";
    const displayName =
      typeof body?.displayName === "string" && body.displayName.trim()
        ? body.displayName.trim().slice(0, 40)
        : "Learner";
    const answers = body?.answers as Record<string, string> | undefined;

    if (!learnerId || learnerId.length > 64) {
      return NextResponse.json({ error: "Missing or invalid learnerId." }, { status: 400 });
    }
    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Answers object is required." }, { status: 400 });
    }
    // Validate every quiz question answered with safe/suspicious
    for (const q of QUIZ_QUESTIONS) {
      const v = answers[q.id];
      if (v !== "safe" && !VALID.has(v as string)) {
        return NextResponse.json({ error: `Answer for ${q.id} must be "safe" or "suspicious".` }, { status: 400 });
      }
      if (v === undefined) {
        return NextResponse.json({ error: `Missing answer for ${q.id}.` }, { status: 400 });
      }
    }

    const typed = answers as Record<string, "safe" | "suspicious">;
    const result = gradeQuiz(typed);

    // Weak topics: categories below 100%
    const weak: { category: string; correct: number; total: number; tip: string }[] = [];
    for (const [cat, stat] of Object.entries(result.categoryBreakdown)) {
      if (stat.correct < stat.total) {
        weak.push({
          category: cat,
          correct: stat.correct,
          total: stat.total,
          tip: CATEGORY_TIPS[cat as keyof typeof CATEGORY_TIPS] ?? "Revise this topic.",
        });
      }
    }

    // Persist to PostgreSQL (SQLite-equivalent tracker for the hosted build).
    const inserted = await db
      .insert(quizAttempts)
      .values({
        learnerId,
        displayName,
        score: result.score,
        total: result.total,
        percentage: result.percentage,
        categoryBreakdown: result.categoryBreakdown,
        answers: result.graded,
      })
      .returning();

    const detailed = QUIZ_QUESTIONS.map((q) => ({
      id: q.id,
      category: q.category,
      categoryLabel: q.categoryLabel,
      scenario: q.scenario,
      correct: q.correct,
      chosen: typed[q.id],
      isCorrect: typed[q.id] === q.correct,
      explanation: q.explanation,
    }));

    return NextResponse.json({
      ok: true,
      attemptId: inserted[0]?.id ?? null,
      score: result.score,
      total: result.total,
      percentage: result.percentage,
      graded: detailed,
      categoryBreakdown: result.categoryBreakdown,
      weakTopics: weak,
      message:
        result.percentage >= 80
          ? "Excellent cyber awareness! Keep it up."
          : result.percentage >= 50
            ? "Good progress — review the topics below."
            : "Needs improvement — work through the recommended topics and retry.",
    });
  } catch (err) {
    console.error("quiz submit error", err);
    return NextResponse.json({ error: "Could not save quiz attempt. Please try again." }, { status: 500 });
  }
}
