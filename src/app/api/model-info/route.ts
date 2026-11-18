import { NextResponse } from "next/server";
import { getEvaluation, getDatasetInfo, getTopSpamFeatures, getTopHamFeatures } from "@/lib/cyberguard/model";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const evaluation = getEvaluation();
    const dataset = getDatasetInfo();
    return NextResponse.json({
      ok: true,
      pipeline: {
        preprocessing: "lowercase → tokenize → stopword removal → light stemming → unigrams+bigrams",
        vectorizer: `TF-IDF (maxFeatures 600, smooth IDF, train-only fit)`,
        classifier: "Logistic Regression (gradient descent, lr=0.8, epochs=900, L2=0.001)",
        split: `80/20 stratified-style shuffle, seed=42 — train ${evaluation.trainSize}, test ${evaluation.testSize}`,
      },
      dataset,
      metrics: {
        accuracy: Number(evaluation.accuracy.toFixed(4)),
        precision: Number(evaluation.precision.toFixed(4)),
        recall: Number(evaluation.recall.toFixed(4)),
        f1: Number(evaluation.f1.toFixed(4)),
        confusion: evaluation.confusion,
      },
      vocabSize: evaluation.vocabSize,
      topSpamFeatures: getTopSpamFeatures(12),
      topHamFeatures: getTopHamFeatures(12),
      testSamples: evaluation.testSamples,
      disclaimer:
        "Metrics are measured on a held-out test split of the curated demo corpus. They describe model fit on this data — not a real-world fraud probability.",
    });
  } catch (err) {
    console.error("model-info error", err);
    return NextResponse.json({ error: "Model info unavailable." }, { status: 500 });
  }
}
