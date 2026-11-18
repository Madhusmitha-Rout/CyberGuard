// CyberGuard scam-detection model: TF-IDF + Logistic Regression.
// Trained at server startup on the labelled dataset (no hardcoded predictions).

import { DATASET, DATASET_INFO } from "./dataset";
import { TfidfVectorizer } from "./tfidf";
import { LogisticRegression, computeMetrics } from "./logreg";
import { preprocess, toNgrams } from "./preprocessing";

// Seeded RNG so train/test split is reproducible (like sklearn random_state=42).
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TokenContribution {
  token: string;
  weight: number;
  tfidf: number;
  contribution: number;
}

export interface Prediction {
  label: 0 | 1;
  labelText: "SPAM / SUSPICIOUS" | "NOT SPAM (likely safe)";
  spamProbability: number;
  confidence: "low" | "medium" | "high";
  topSignals: TokenContribution[];
  foundKeywords: string[];
  disclaimer: string;
}

export interface ModelEvaluation {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusion: { tp: number; tn: number; fp: number; fn: number };
  trainSize: number;
  testSize: number;
  vocabSize: number;
  testSamples: { text: string; trueLabel: number; predLabel: number }[];
}

// Curated suspicious keyword lexicon used for human-readable explanations
// (complements — never replaces — the learned model weights).
export const SUSPICIOUS_KEYWORDS = [
  "otp", "cvv", "pin", "password", "bank", "account", "blocked", "suspended",
  "urgent", "immediately", "expire", "verify", "kyc", "click", "link",
  "lottery", "winner", "prize", "congratulations", "cashback", "reward", "free",
  "claim", "http", "bit.ly", "tinyurl", ".xyz", ".top", ".tk", ".ml", ".ga", ".win", ".club",
  "whatsapp", "telegram", "qr", "scan", "upi", "refund", "customs", "parcel",
  "job", "earn", "investment", "double", "guaranteed", "profit", "loan",
  "aadhaar", "pan", "arrest", "police", "cbi", "rbi", "fine", "limited",
];

const DISCLAIMER =
  "This is an ML-based estimate, not a guarantee. A “NOT SPAM” result does not prove a message is safe, and a “SPAM” result does not prove fraud — always verify through official channels.";

let vectorizer: TfidfVectorizer | null = null;
let classifier: LogisticRegression | null = null;
let evaluation: ModelEvaluation | null = null;
let featureNames: string[] = [];

function trainOnce(): void {
  if (vectorizer && classifier && evaluation) return;

  const rng = mulberry32(42);
  const idx = DATASET.map((_, i) => i);
  // Fisher-Yates with seeded rng
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const split = Math.floor(idx.length * 0.8);
  const trainIdx = idx.slice(0, split);
  const testIdx = idx.slice(split);

  const trainDocs = trainIdx.map((i) => DATASET[i].text);
  const trainY = trainIdx.map((i) => DATASET[i].label);
  const testDocs = testIdx.map((i) => DATASET[i].text);
  const testY = testIdx.map((i) => DATASET[i].label);

  vectorizer = new TfidfVectorizer({ maxFeatures: 600, nMin: 1, nMax: 2 });
  const Xtrain = vectorizer.fitTransform(trainDocs);
  const Xtest = vectorizer.transform(testDocs);

  classifier = new LogisticRegression({ learningRate: 0.8, epochs: 900, l2: 0.001 });
  classifier.fit(Xtrain, trainY);

  const yPred = classifier.predict(Xtest);
  const m = computeMetrics(testY, yPred);
  featureNames = vectorizer.getFeatureNames();

  evaluation = {
    ...m,
    trainSize: trainDocs.length,
    testSize: testDocs.length,
    vocabSize: featureNames.length,
    testSamples: testIdx.map((origI, k) => ({
      text: DATASET[origI].text,
      trueLabel: testY[k],
      predLabel: yPred[k],
    })),
  };
}

export function getEvaluation(): ModelEvaluation {
  trainOnce();
  return evaluation!;
}

export function getDatasetInfo() {
  return DATASET_INFO;
}

export function getVocabularySize(): number {
  trainOnce();
  return featureNames.length;
}

function confidenceOf(p: number): "low" | "medium" | "high" {
  const d = Math.abs(p - 0.5) * 2; // 0..1
  if (d >= 0.6) return "high";
  if (d >= 0.25) return "medium";
  return "low";
}

export function predictMessage(rawText: string): Prediction {
  trainOnce();
  const vec = vectorizer!.transformSingle(rawText);
  const proba = classifier!.predictProba([vec])[0];
  const label: 0 | 1 = proba >= 0.5 ? 1 : 0;

  // Explainability: contribution = weight * tfidf per feature present.
  const contribs: TokenContribution[] = [];
  for (let j = 0; j < vec.length; j++) {
    if (vec[j] > 0) {
      const w = classifier!.weights[j] ?? 0;
      contribs.push({
        token: featureNames[j],
        weight: w,
        tfidf: vec[j],
        contribution: w * vec[j],
      });
    }
  }
  contribs.sort((a, b) => b.contribution - a.contribution);
  const topSignals = contribs.slice(0, 6);

  const lowered = rawText.toLowerCase();
  const foundKeywords = SUSPICIOUS_KEYWORDS.filter((k) => lowered.includes(k)).slice(0, 10);

  // Fallback explainability when text has no vocab overlap:
  // surface generic n-gram tokens so UI never shows empty explanation.
  if (topSignals.length === 0) {
    const toks = toNgrams(preprocess(rawText), 1, 1).slice(0, 6);
    for (const t of toks) {
      topSignals.push({ token: t, weight: 0, tfidf: 0, contribution: 0 });
    }
  }

  return {
    label,
    labelText: label === 1 ? "SPAM / SUSPICIOUS" : "NOT SPAM (likely safe)",
    spamProbability: proba,
    confidence: confidenceOf(proba),
    topSignals,
    foundKeywords,
    disclaimer: DISCLAIMER,
  };
}

export function getTopSpamFeatures(n = 15): { token: string; weight: number }[] {
  trainOnce();
  return featureNames
    .map((t, i) => ({ token: t, weight: classifier!.weights[i] ?? 0 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n);
}

export function getTopHamFeatures(n = 15): { token: string; weight: number }[] {
  trainOnce();
  return featureNames
    .map((t, i) => ({ token: t, weight: classifier!.weights[i] ?? 0 }))
    .sort((a, b) => a.weight - b.weight)
    .slice(0, n);
}
