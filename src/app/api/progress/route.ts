import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { CATEGORY_LABELS, CATEGORY_TIPS, QuizCategory } from "@/lib/cyberguard/quiz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const learnerId = req.nextUrl.searchParams.get("learnerId")?.trim() ?? "";
    if (!learnerId) {
      return NextResponse.json({ error: "learnerId query param is required." }, { status: 400 });
    }
    if (learnerId.length > 64) {
      return NextResponse.json({ error: "Invalid learnerId." }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.learnerId, learnerId))
      .orderBy(desc(quizAttempts.createdAt))
      .limit(20);

    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        attempts: [],
        stats: null,
        message: "No attempts yet. Take the Scam Spotter quiz to start tracking progress.",
      });
    }

    const scores = rows.map((r) => r.score);
    const total = rows[0].total;
    const best = Math.max(...scores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Category-wise aggregation across attempts
    const catAgg: Record<string, { correct: number; total: number; attempts: number }> = {};
    for (const r of rows) {
      const bd = r.categoryBreakdown as Record<string, { correct: number; total: number }>;
      for (const [cat, stat] of Object.entries(bd ?? {})) {
        catAgg[cat] = catAgg[cat] ?? { correct: 0, total: 0, attempts: 0 };
        catAgg[cat].correct += stat.correct;
        catAgg[cat].total += stat.total;
        catAgg[cat].attempts += 1;
      }
    }
    const categoryPerformance = Object.entries(catAgg).map(([cat, s]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat as QuizCategory] ?? cat,
      accuracy: s.total ? Number(((s.correct / s.total) * 100).toFixed(1)) : 0,
      correct: s.correct,
      total: s.total,
      tip: CATEGORY_TIPS[cat as QuizCategory] ?? "",
      needsWork: s.total ? s.correct / s.total < 1 : true,
    }));
    categoryPerformance.sort((a, b) => a.accuracy - b.accuracy);

    const weakest = categoryPerformance.filter((c) => c.needsWork).slice(0, 3);

    return NextResponse.json({
      ok: true,
      attempts: rows.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        score: r.score,
        total: r.total,
        percentage: r.percentage,
        categoryBreakdown: r.categoryBreakdown,
        createdAt: r.createdAt,
      })),
      stats: {
        totalAttempts: rows.length,
        bestScore: best,
        bestPercentage: Math.round((best / total) * 100),
        averageScore: Number(avg.toFixed(2)),
        averagePercentage: Math.round((avg / total) * 100),
        latest: { score: rows[0].score, total: rows[0].total, percentage: rows[0].percentage },
        categoryPerformance,
        weakestTopics: weakest,
        trend: rows
          .slice()
          .reverse()
          .map((r) => ({ score: r.score, percentage: r.percentage, at: r.createdAt })),
      },
    });
  } catch (err) {
    console.error("progress error", err);
    return NextResponse.json({ error: "Could not load progress." }, { status: 500 });
  }
}
