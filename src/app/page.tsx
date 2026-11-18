"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QUIZ_QUESTIONS } from "@/lib/cyberguard/quiz";

type Tab = "chat" | "analyze" | "quiz" | "progress" | "model";

interface ChatMsg {
  role: "user" | "bot";
  text: string;
  title?: string;
}

interface AnalyzeResult {
  ok: boolean;
  privacy: string;
  prediction: {
    label: number;
    labelText: string;
    spamProbability: number;
    confidence: string;
    topSignals: { token: string; weight: number; tfidf: number; contribution: number }[];
    foundKeywords: string[];
    disclaimer: string;
  };
  scorecard: {
    score: number;
    level: string;
    indicators: { id: string; label: string; description: string; points: number; detected: boolean; evidence: string[] }[];
    summary: string;
    disclaimer: string;
  };
  recommendations: string[];
  model: string;
}

interface QuizResult {
  ok: boolean;
  attemptId: number | null;
  score: number;
  total: number;
  percentage: number;
  graded: {
    id: string; category: string; categoryLabel: string; scenario: string;
    correct: string; chosen: string; isCorrect: boolean; explanation: string;
  }[];
  categoryBreakdown: Record<string, { correct: number; total: number }>;
  weakTopics: { category: string; correct: number; total: number; tip: string }[];
  message: string;
}

interface ProgressData {
  ok: boolean;
  attempts: { id: number; displayName: string; score: number; total: number; percentage: number; createdAt: string }[];
  stats: null | {
    totalAttempts: number; bestScore: number; bestPercentage: number;
    averageScore: number; averagePercentage: number;
    latest: { score: number; total: number; percentage: number };
    categoryPerformance: { category: string; label: string; accuracy: number; correct: number; total: number; tip: string; needsWork: boolean }[];
    weakestTopics: { category: string; label: string; accuracy: number; tip: string }[];
    trend: { score: number; percentage: number; at: string }[];
  };
  message?: string;
}

interface ModelInfo {
  ok: boolean;
  pipeline: { preprocessing: string; vectorizer: string; classifier: string; split: string };
  dataset: { name: string; total: number; spam: number; ham: number; note: string };
  metrics: { accuracy: number; precision: number; recall: number; f1: number; confusion: { tp: number; tn: number; fp: number; fn: number } };
  vocabSize: number;
  topSpamFeatures: { token: string; weight: number }[];
  topHamFeatures: { token: string; weight: number }[];
  testSamples: { text: string; trueLabel: number; predLabel: number }[];
  disclaimer: string;
}

interface ChatTestsData {
  ok: boolean;
  summary: string;
  passed: number;
  total: number;
  results: { id: string; input: string; category: string; intentId: string; title: string; answer: string; pass: boolean; detail: string }[];
  note: string;
}

const SAMPLES: { label: string; text: string }[] = [
  { label: "Sample: KYC scam", text: "SBI Alert: Your account blocked due to KYC pending. Update immediately at sbi-kyc-verify.xyz or account closes today." },
  { label: "Sample: Lottery scam", text: "Congratulations! You have won Rs 5,00,000 lottery. Claim now at http://bit.ly/win500k send bank details" },
  { label: "Sample: UPI QR scam", text: "OLX buyer wants your sofa. He sent QR code, scan and enter UPI PIN to receive Rs 12000 advance" },
  { label: "Sample: Genuine meeting", text: "Hi Rahul, meeting moved to 3pm tomorrow in conference room B. Please bring the report." },
  { label: "Sample: Genuine delivery", text: "Your Amazon package shipped. Expected delivery Tuesday. Track in Your Orders section of the app." },
];

const SUGGESTIONS = [
  "What is phishing?",
  "How do I stay safe on UPI?",
  "Someone asked for my OTP — what do I do?",
  "How do I create a strong password?",
  "How do I report cyber fraud in India?",
  "Are work-from-home jobs on Telegram safe?",
];

function getOrCreateLearnerId(): string {
  try {
    const k = "cyberguard-learner-id";
    let v = localStorage.getItem(k);
    if (!v) {
      v = (crypto as unknown as { randomUUID?: () => string }).randomUUID
        ? (crypto as unknown as { randomUUID: () => string }).randomUUID()
        : `learner-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return `learner-${Date.now()}`;
  }
}

export default function CyberGuardApp() {
  const [tab, setTab] = useState<Tab>("chat");

  // ---- chat ----
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { role: "bot", title: "Welcome to CyberGuard", text: "Ask me about phishing, UPI fraud, passwords, OTP scams — or how to report cybercrime in India (helpline 1930). Try a suggestion below." },
  ]);

  // ---- analyzer ----
  const [analyzeInput, setAnalyzeInput] = useState("");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);

  // ---- quiz ----
  const [quizAnswers, setQuizAnswers] = useState<Record<string, "safe" | "suspicious">>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [displayName, setDisplayName] = useState("Student");

  // ---- progress ----
  const [learnerId, setLearnerId] = useState("");
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  // ---- model ----
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [modelLoading, setModelLoading] = useState(false);

  // ---- chatbot robustness tests (20+ inputs, actual responses) ----
  const [chatTests, setChatTests] = useState<ChatTestsData | null>(null);
  const [chatTestsLoading, setChatTestsLoading] = useState(false);

  useEffect(() => {
    setLearnerId(getOrCreateLearnerId());
    try {
      const n = localStorage.getItem("cyberguard-name");
      if (n) setDisplayName(n);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("cyberguard-name", displayName); } catch { /* ignore */ }
  }, [displayName]);

  const loadProgress = useCallback(async () => {
    const id = getOrCreateLearnerId();
    setLearnerId(id);
    setProgressLoading(true);
    try {
      const res = await fetch(`/api/progress?learnerId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await res.json();
      setProgress(data);
    } catch {
      setProgress({ ok: false, attempts: [], stats: null } as unknown as ProgressData);
    } finally {
      setProgressLoading(false);
    }
  }, []);

  const loadModel = useCallback(async () => {
    setModelLoading(true);
    try {
      const res = await fetch("/api/model-info", { cache: "no-store" });
      setModelInfo(await res.json());
    } catch { /* ignore */ } finally { setModelLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "progress" && !progress) loadProgress();
    if (tab === "model" && !modelInfo) loadModel();
  }, [tab, progress, modelInfo, loadProgress, loadModel]);

  const sendChat = useCallback(async (text?: string) => {
    const q = (text ?? chatInput).trim();
    if (!q || chatLoading) return;
    setChatMsgs((m) => [...m, { role: "user", text: q }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) setChatMsgs((m) => [...m, { role: "bot", text: data.error || "Sorry, I could not answer that." }]);
      else setChatMsgs((m) => [...m, { role: "bot", title: data.title, text: data.answer }]);
    } catch {
      setChatMsgs((m) => [...m, { role: "bot", text: "Network error. Please try again." }]);
    } finally { setChatLoading(false); }
  }, [chatInput, chatLoading]);

  const runAnalyze = useCallback(async () => {
    setAnalyzeError("");
    setAnalyzeResult(null);
    if (!analyzeInput.trim()) { setAnalyzeError("Please paste an SMS, email or suspicious text first."); return; }
    if (analyzeInput.length > 2000) { setAnalyzeError("Message too long (max 2000 characters)."); return; }
    setAnalyzeLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: analyzeInput }),
      });
      const data = await res.json();
      if (!res.ok) setAnalyzeError(data.error || "Analysis failed.");
      else setAnalyzeResult(data);
    } catch {
      setAnalyzeError("Network error during analysis.");
    } finally { setAnalyzeLoading(false); }
  }, [analyzeInput]);

  const submitQuiz = useCallback(async () => {
    setQuizError("");
    if (Object.keys(quizAnswers).length < QUIZ_QUESTIONS.length) {
      setQuizError(`Please answer all ${QUIZ_QUESTIONS.length} questions (${Object.keys(quizAnswers).length}/${QUIZ_QUESTIONS.length} answered).`);
      return;
    }
    setQuizLoading(true);
    try {
      const id = getOrCreateLearnerId();
      const res = await fetch("/api/quiz/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerId: id, displayName: displayName || "Learner", answers: quizAnswers }),
      });
      const data = await res.json();
      if (!res.ok) setQuizError(data.error || "Submit failed.");
      else { setQuizResult(data); setProgress(null); }
    } catch {
      setQuizError("Network error while submitting.");
    } finally { setQuizLoading(false); }
  }, [quizAnswers, displayName]);

  const runChatTests = useCallback(async () => {
    setChatTestsLoading(true);
    try {
      const res = await fetch("/api/chat-tests", { cache: "no-store" });
      setChatTests(await res.json());
    } catch { /* ignore */ } finally { setChatTestsLoading(false); }
  }, []);

  const tabs: { id: Tab; label: string }[] = useMemo(() => ([
    { id: "chat", label: "1 · AI Chatbot" },
    { id: "analyze", label: "2 · Scam Analyzer + 3 · Scorecard" },
    { id: "quiz", label: "4 · Scam Spotter Quiz" },
    { id: "progress", label: "5 · Progress Tracker" },
    { id: "model", label: "Model & Metrics" },
  ]), []);

  const quizAnswered = Object.keys(quizAnswers).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 text-2xl font-black text-white shadow-lg">🛡</div>
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-xl font-extrabold tracking-tight text-white leading-tight">CyberGuard <span className="text-cyan-300">· AI Cyber Safety Assistant</span></h1>
            <p className="text-xs text-slate-400">Explainable scam detection · Safety scorecard · Quiz · Learning tracker — no paid APIs, messages never stored</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-cyan-200">🇮🇳 Helpline 1930</span>
            <span className="rounded-full border border-violet-400/40 bg-violet-400/10 px-3 py-1 text-violet-200">cybercrime.gov.in</span>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-emerald-200">🔒 Privacy: pasted texts not saved</span>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-4 pb-3 flex gap-2 overflow-x-auto scroll-thin">
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`cyber-btn whitespace-nowrap text-sm ${tab === t.id ? "tab-active" : "btn-ghost"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">

        {/* ============ 1. CHATBOT ============ */}
        {tab === "chat" && (
          <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="cyber-card p-5">
              <h2 className="text-lg font-bold text-white">Module 1 · AI Cyber Chatbot</h2>
              <p className="text-sm text-slate-400 mt-1">Ask about phishing, UPI fraud, passwords, OTP, KYC, jobs, loans — plus Indian reporting help.</p>
              <div className="mt-4 h-[380px] overflow-y-auto scroll-thin space-y-3 rounded-xl bg-slate-950/60 p-3 border border-slate-800" id="chat-history">
                {chatMsgs.map((m, i) => (
                  <div key={i} className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${m.role === "user" ? "ml-auto bg-cyan-500/20 border border-cyan-400/30 text-cyan-50" : "bg-slate-800/80 border border-slate-700 text-slate-100"}`}>
                    {m.title && <div className="font-bold text-cyan-300 mb-1">{m.title}</div>}
                    {m.text}
                  </div>
                ))}
                {chatLoading && <div className="text-xs text-slate-500">CyberGuard is thinking…</div>}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  id="chat-input"
                  className="cyber-input"
                  placeholder="e.g. What is phishing?  |  How do I report fraud in India?"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                  maxLength={1000}
                />
                <button id="chat-send" onClick={() => sendChat()} disabled={chatLoading || !chatInput.trim()} className="cyber-btn btn-primary">Send</button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="cyber-card p-5">
                <h3 className="font-bold text-white text-sm">Try these questions</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => sendChat(s)} className="cyber-btn btn-ghost text-xs">{s}</button>
                  ))}
                </div>
              </div>
              <div className="cyber-card p-5">
                <h3 className="font-bold text-white text-sm">🇮🇳 Indian cyber safety desk</h3>
                <ul className="mt-2 text-sm text-slate-300 space-y-1.5 list-disc pl-5">
                  <li><b>1930</b> — National Cyber Helpline (call first, within 2 “golden hours”).</li>
                  <li><b>cybercrime.gov.in</b> — National Cyber Crime Reporting Portal.</li>
                  <li>Save UTR / transaction IDs, screenshots, caller numbers.</li>
                  <li>Block cards/UPI via your bank&apos;s official app immediately.</li>
                </ul>
              </div>
            </div>
            <div className="cyber-card p-5 lg:col-span-2">
              <div className="flex flex-wrap gap-3 items-center">
                <div>
                  <h3 className="font-bold text-white">Chatbot robustness tests — 26 inputs, actual responses</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Cyber questions · greetings · random words · gibberish · incomplete · unrelated. Gibberish/incomplete use exact required strings; random words never invent context.</p>
                </div>
                <button id="chat-tests-run" onClick={runChatTests} disabled={chatTestsLoading} className="cyber-btn btn-ghost ml-auto text-sm">{chatTestsLoading ? "Running…" : "▶ Run 26 input tests"}</button>
              </div>
              {chatTests && <p className="mt-2 text-sm font-bold text-cyan-200">{chatTests.summary}</p>}
              {!chatTests && <p className="mt-2 text-xs text-slate-500">{chatTestsLoading ? "Executing replyTo() on 26 inputs…" : "Press the button — each input is executed live and its verbatim reply shown below."}</p>}
              {chatTests && (
                <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto scroll-thin">
                  {chatTests.results.map((t) => (
                    <div key={t.id} className={`rounded-lg border p-3 text-xs ${t.pass ? "border-emerald-400/30 bg-emerald-500/5" : "border-red-400/40 bg-red-500/5"}`}>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className={`rounded-full px-2 py-0.5 font-black ${t.pass ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"}`}>{t.pass ? "PASS" : "FAIL"}</span>
                        <span className="text-slate-400">[{t.id} · {t.category} · {t.intentId}]</span>
                        <span className="font-bold text-slate-100">“{t.input}”</span>
                      </div>
                      <p className="mt-1 text-slate-200 whitespace-pre-line break-words">→ {t.answer}</p>
                      <p className="mt-0.5 text-slate-500">{t.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ============ 2+3. ANALYZER + SCORECARD ============ */}
        {tab === "analyze" && (
          <section className="space-y-4">
            <div className="cyber-card p-5">
              <h2 className="text-lg font-bold text-white">Module 2 · Smart Scam Analyzer <span className="text-slate-400 font-normal">+ Module 3 · Safety Scorecard</span></h2>
              <p className="text-sm text-slate-400 mt-1">Paste any SMS / email / chat text. A real <b className="text-slate-200">TF-IDF + Logistic Regression</b> model classifies it — never hardcoded. Nothing you paste is stored.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SAMPLES.map((s) => (
                  <button key={s.label} onClick={() => { setAnalyzeInput(s.text); setAnalyzeResult(null); setAnalyzeError(""); }} className="cyber-btn btn-ghost text-xs">{s.label}</button>
                ))}
              </div>
              <textarea
                id="analyze-input"
                className="cyber-input mt-3 min-h-[110px]"
                placeholder="Paste suspicious message here… (max 2000 chars)"
                value={analyzeInput}
                onChange={(e) => setAnalyzeInput(e.target.value)}
                maxLength={2000}
              />
              <div className="mt-2 flex items-center gap-2">
                <button id="analyze-btn" onClick={runAnalyze} disabled={analyzeLoading} className="cyber-btn btn-primary">{analyzeLoading ? "Analyzing…" : "Analyze message"}</button>
                <button onClick={() => { setAnalyzeInput(""); setAnalyzeResult(null); setAnalyzeError(""); }} className="cyber-btn btn-ghost">Clear</button>
                <span className="text-xs text-slate-500 ml-auto">{analyzeInput.length}/2000</span>
              </div>
              {analyzeError && <p className="mt-2 text-sm text-red-300">⚠ {analyzeError}</p>}
            </div>

            {analyzeResult && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="cyber-card p-5">
                  <h3 className="font-bold text-white">Classification</h3>
                  <div className={`mt-2 rounded-xl border px-4 py-3 ${analyzeResult.prediction.label === 1 ? "border-red-400/50 bg-red-500/10" : "border-emerald-400/50 bg-emerald-500/10"}`}>
                    <div className={`text-lg font-extrabold ${analyzeResult.prediction.label === 1 ? "text-red-300" : "text-emerald-300"}`}>{analyzeResult.prediction.labelText}</div>
                    <div className="text-sm text-slate-300 mt-1">Spam probability: <b>{(analyzeResult.prediction.spamProbability * 100).toFixed(1)}%</b> · Confidence: {analyzeResult.prediction.confidence}</div>
                    <div className="mt-2 h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div className={`h-full ${analyzeResult.prediction.label === 1 ? "bg-red-400" : "bg-emerald-400"}`} style={{ width: `${Math.round(analyzeResult.prediction.spamProbability * 100)}%` }} />
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="font-semibold text-slate-200">Suspicious keywords found</div>
                    {analyzeResult.prediction.foundKeywords.length === 0
                      ? <p className="text-slate-400">None from the watchlist.</p>
                      : <div className="mt-1 flex flex-wrap gap-1.5">{analyzeResult.prediction.foundKeywords.map((k) => <span key={k} className="rounded-full bg-amber-400/15 border border-amber-300/40 px-2 py-0.5 text-xs text-amber-200">{k}</span>)}</div>}
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="font-semibold text-slate-200">Why the model thinks so (top TF-IDF × weight signals)</div>
                    <ul className="mt-1 space-y-1 text-xs text-slate-300">
                      {analyzeResult.prediction.topSignals.map((s) => (
                        <li key={s.token} className="flex justify-between gap-2 border-b border-slate-800 pb-1">
                          <code className="text-cyan-200">{s.token}</code>
                          <span>contrib {s.contribution.toFixed(4)} (w {s.weight.toFixed(3)} × tfidf {s.tfidf.toFixed(3)})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-400 border-l-2 border-amber-300/60 pl-2">⚠ {analyzeResult.prediction.disclaimer}</p>
                  <p className="mt-1 text-[11px] text-slate-500">🔒 {analyzeResult.privacy}</p>
                </div>

                <div className="cyber-card p-5">
                  <h3 className="font-bold text-white">Safety Scorecard <span className="text-xs font-normal text-slate-400">(heuristic — not a fraud probability)</span></h3>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="text-4xl font-black text-white">{analyzeResult.scorecard.score}<span className="text-base text-slate-400">/100</span></div>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${analyzeResult.scorecard.level === "HIGH" ? "bg-red-500/20 text-red-200 border border-red-400/40" : analyzeResult.scorecard.level === "MEDIUM" ? "bg-amber-500/20 text-amber-200 border border-amber-400/40" : "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"}`}>{analyzeResult.scorecard.level} RISK</span>
                  </div>
                  <div className="mt-2 h-3 rounded-full bg-slate-700 overflow-hidden">
                    <div className={`h-full ${analyzeResult.scorecard.level === "HIGH" ? "bg-red-400" : analyzeResult.scorecard.level === "MEDIUM" ? "bg-amber-300" : "bg-emerald-400"}`} style={{ width: `${analyzeResult.scorecard.score}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{analyzeResult.scorecard.summary}</p>
                  <div className="mt-3 space-y-2">
                    {analyzeResult.scorecard.indicators.map((ind) => (
                      <div key={ind.id} className={`rounded-lg border p-2.5 text-sm ${ind.detected ? "border-red-400/40 bg-red-500/5" : "border-slate-700 bg-slate-900/40"}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-100">{ind.detected ? "🔴" : "⚪"} {ind.label}</span>
                          <span className="text-xs text-slate-400">+{ind.points} pts</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{ind.description}</p>
                        {ind.detected && ind.evidence.map((e, i) => <p key={i} className="text-[11px] text-red-200/90 mt-1 font-mono break-words">{e}</p>)}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400 border-l-2 border-cyan-300/60 pl-2">ℹ {analyzeResult.scorecard.disclaimer}</p>
                  <div className="mt-3">
                    <div className="font-semibold text-slate-100 text-sm">Safety recommendations</div>
                    <ul className="mt-1 space-y-1 text-sm text-slate-300 list-disc pl-5">
                      {analyzeResult.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ============ 4. QUIZ ============ */}
        {tab === "quiz" && (
          <section className="space-y-4">
            <div className="cyber-card p-5">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <h2 className="text-lg font-bold text-white">Module 4 · Scam Spotter — Interactive Quiz</h2>
                  <p className="text-sm text-slate-400">Judge each scenario <b>safe</b> or <b>suspicious</b>. {quizAnswered}/{QUIZ_QUESTIONS.length} answered.</p>
                </div>
                <div className="ml-auto flex gap-2 items-center">
                  <label className="text-xs text-slate-400">Your name</label>
                  <input id="quiz-name" className="cyber-input !w-40" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
                </div>
              </div>
            </div>
            {quizError && <p className="text-sm text-red-300">⚠ {quizError}</p>}
            <div className="grid gap-3">
              {QUIZ_QUESTIONS.map((q, idx) => (
                <div key={q.id} className="cyber-card p-4">
                  <div className="flex flex-wrap gap-2 items-center text-xs">
                    <span className="rounded-full bg-violet-500/20 border border-violet-400/40 px-2 py-0.5 text-violet-200">Q{idx + 1} · {q.categoryLabel}</span>
                    {quizResult && (
                      <span className={`rounded-full px-2 py-0.5 font-bold ${quizResult.graded[idx].isCorrect ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40" : "bg-red-500/20 text-red-200 border border-red-400/40"}`}>
                        {quizResult.graded[idx].isCorrect ? "✓ Correct" : "✗ Wrong"} (answer: {q.correct})
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-100 leading-relaxed">{q.scenario}</p>
                  <div className="mt-2 flex gap-2">
                    {(["safe", "suspicious"] as const).map((opt) => (
                      <button
                        key={opt}
                        id={`${q.id}-${opt}`}
                        onClick={() => setQuizAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className={`cyber-btn text-sm ${quizAnswers[q.id] === opt ? (opt === "safe" ? "tab-active" : "bg-red-500 text-white") : "btn-ghost"}`}
                      >
                        {opt === "safe" ? "✅ Safe" : "🚨 Suspicious"}
                      </button>
                    ))}
                  </div>
                  {quizResult && <p className="mt-2 text-xs text-slate-300 border-l-2 border-cyan-300/50 pl-2">💡 {q.explanation}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button id="quiz-submit" onClick={submitQuiz} disabled={quizLoading} className="cyber-btn btn-primary">{quizLoading ? "Saving…" : "Submit quiz & save score"}</button>
              <button onClick={() => { setQuizAnswers({}); setQuizResult(null); setQuizError(""); }} className="cyber-btn btn-ghost">Reset</button>
            </div>
            {quizResult && (
              <div className="cyber-card p-5">
                <h3 className="font-bold text-white text-lg">Your score: {quizResult.score}/{quizResult.total} ({quizResult.percentage}%)</h3>
                <p className="text-sm text-slate-300 mt-1">{quizResult.message} {quizResult.attemptId ? `(saved as attempt #${quizResult.attemptId})` : ""}</p>
                <div className="mt-3 grid sm:grid-cols-5 gap-2">
                  {Object.entries(quizResult.categoryBreakdown).map(([cat, s]) => (
                    <div key={cat} className="rounded-lg border border-slate-700 bg-slate-900/50 p-2 text-center text-xs">
                      <div className="font-bold text-slate-100 capitalize">{cat}</div>
                      <div className={`text-lg font-black ${s.correct === s.total ? "text-emerald-300" : "text-amber-300"}`}>{s.correct}/{s.total}</div>
                    </div>
                  ))}
                </div>
                {quizResult.weakTopics.length > 0 && (
                  <div className="mt-3 text-sm">
                    <div className="font-semibold text-amber-200">📚 Recommended revision</div>
                    <ul className="mt-1 space-y-1 text-slate-300 list-disc pl-5">
                      {quizResult.weakTopics.map((w) => <li key={w.category}><b className="capitalize">{w.category}</b> ({w.correct}/{w.total}) — {w.tip}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ============ 5. PROGRESS ============ */}
        {tab === "progress" && (
          <section className="space-y-4">
            <div className="cyber-card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Module 5 · Learning Progress Tracker</h2>
                  <p className="text-xs text-slate-400 mt-1">Learner ID (auto-saved in this browser, survives refresh): <code className="text-cyan-200 break-all">{learnerId}</code></p>
                </div>
                <button id="progress-refresh" onClick={loadProgress} disabled={progressLoading} className="cyber-btn btn-primary ml-auto text-sm">{progressLoading ? "Loading…" : "↻ Refresh progress"}</button>
              </div>
            </div>
            {!progress?.stats && (
              <div className="cyber-card p-5 text-sm text-slate-300">{progressLoading ? "Loading…" : (progress?.message ?? "No attempts yet. Take the Scam Spotter quiz first — your scores will appear here even after refresh.")}</div>
            )}
            {progress?.stats && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { l: "Attempts", v: String(progress.stats.totalAttempts) },
                    { l: "Best", v: `${progress.stats.bestScore}/${progress.attempts[0]?.total ?? 10} (${progress.stats.bestPercentage}%)` },
                    { l: "Average", v: `${progress.stats.averageScore}/${progress.attempts[0]?.total ?? 10} (${progress.stats.averagePercentage}%)` },
                    { l: "Latest", v: `${progress.stats.latest.score}/${progress.stats.latest.total} (${progress.stats.latest.percentage}%)` },
                  ].map((c) => (
                    <div key={c.l} className="cyber-card p-4 text-center">
                      <div className="text-xs text-slate-400 uppercase tracking-wide">{c.l}</div>
                      <div className="text-xl font-black text-white mt-1">{c.v}</div>
                    </div>
                  ))}
                </div>
                <div className="cyber-card p-5">
                  <h3 className="font-bold text-white">Category-wise performance</h3>
                  <div className="mt-3 space-y-2">
                    {progress.stats.categoryPerformance.map((c) => (
                      <div key={c.category} className="text-sm">
                        <div className="flex justify-between"><span className="text-slate-200 font-semibold">{c.label}</span><span className={c.needsWork ? "text-amber-300" : "text-emerald-300"}>{c.accuracy}% ({c.correct}/{c.total})</span></div>
                        <div className="h-2 rounded-full bg-slate-700 mt-1 overflow-hidden"><div className={`h-full ${c.needsWork ? "bg-amber-300" : "bg-emerald-400"}`} style={{ width: `${c.accuracy}%` }} /></div>
                        {c.needsWork && <p className="text-xs text-slate-400 mt-0.5">📖 {c.tip}</p>}
                      </div>
                    ))}
                  </div>
                  {progress.stats.weakestTopics.length > 0 && (
                    <p className="mt-3 text-sm text-amber-200">🎯 Focus next: {progress.stats.weakestTopics.map((w) => w.label).join(", ")}</p>
                  )}
                </div>
                <div className="cyber-card p-5">
                  <h3 className="font-bold text-white">Attempt history (persists after refresh)</h3>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-slate-400 text-xs uppercase"><th className="py-1 pr-3">#</th><th className="py-1 pr-3">Name</th><th className="py-1 pr-3">Score</th><th className="py-1 pr-3">%</th><th className="py-1">When</th></tr></thead>
                      <tbody>
                        {progress.attempts.map((a) => (
                          <tr key={a.id} className="border-t border-slate-800 text-slate-200">
                            <td className="py-1.5 pr-3">#{a.id}</td><td className="pr-3">{a.displayName}</td>
                            <td className="pr-3 font-bold">{a.score}/{a.total}</td><td className="pr-3">{a.percentage}%</td>
                            <td className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* ============ MODEL ============ */}
        {tab === "model" && (
          <section className="space-y-4">
            <div className="cyber-card p-5">
              <div className="flex items-center gap-3">
                <div><h2 className="text-lg font-bold text-white">Model training & evaluation</h2>
                <p className="text-sm text-slate-400">TF-IDF + Logistic Regression trained in code on a labelled corpus — inspect every metric.</p></div>
                <button onClick={loadModel} disabled={modelLoading} className="cyber-btn btn-ghost ml-auto text-sm">{modelLoading ? "Loading…" : "Reload"}</button>
              </div>
            </div>
            {!modelInfo && <div className="cyber-card p-5 text-sm text-slate-400">{modelLoading ? "Training + evaluating…" : "Loading model…"}</div>}
            {modelInfo && (
              <>
                <div className="cyber-card p-5 text-sm text-slate-300 space-y-1">
                  <div><b className="text-white">Preprocessing:</b> {modelInfo.pipeline.preprocessing}</div>
                  <div><b className="text-white">Vectorizer:</b> {modelInfo.pipeline.vectorizer}</div>
                  <div><b className="text-white">Classifier:</b> {modelInfo.pipeline.classifier}</div>
                  <div><b className="text-white">Split:</b> {modelInfo.pipeline.split}</div>
                  <div><b className="text-white">Dataset:</b> {modelInfo.dataset.name} — {modelInfo.dataset.total} msgs ({modelInfo.dataset.spam} spam / {modelInfo.dataset.ham} ham). Vocab {modelInfo.vocabSize}.</div>
                  <p className="text-xs text-slate-500">{modelInfo.dataset.note}</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[["Accuracy", modelInfo.metrics.accuracy], ["Precision", modelInfo.metrics.precision], ["Recall", modelInfo.metrics.recall], ["F1-score", modelInfo.metrics.f1]].map(([l, v]) => (
                    <div key={l as string} className="cyber-card p-4 text-center">
                      <div className="text-xs text-slate-400 uppercase">{l}</div>
                      <div className="text-2xl font-black text-cyan-300">{((v as number) * 100).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="cyber-card p-5">
                    <h3 className="font-bold text-white text-sm">Confusion matrix (held-out test set)</h3>
                    <table className="mt-2 w-full text-sm text-center">
                      <thead><tr className="text-slate-400 text-xs"><th></th><th className="py-1">Pred HAM</th><th>Pred SPAM</th></tr></thead>
                      <tbody>
                        <tr><td className="text-slate-400 text-xs text-left">True HAM</td><td className="py-1 font-bold text-emerald-300">TN {modelInfo.metrics.confusion.tn}</td><td className="font-bold text-red-300">FP {modelInfo.metrics.confusion.fp}</td></tr>
                        <tr><td className="text-slate-400 text-xs text-left">True SPAM</td><td className="py-1 font-bold text-red-300">FN {modelInfo.metrics.confusion.fn}</td><td className="font-bold text-emerald-300">TP {modelInfo.metrics.confusion.tp}</td></tr>
                      </tbody>
                    </table>
                    <p className="text-[11px] text-slate-500 mt-2">{modelInfo.disclaimer}</p>
                  </div>
                  <div className="cyber-card p-5 text-xs">
                    <h3 className="font-bold text-white text-sm">Top learned spam signals (highest weights)</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">{modelInfo.topSpamFeatures.map((f) => <span key={f.token} className="rounded bg-red-500/15 border border-red-400/40 px-2 py-0.5 text-red-200">{f.token} ({f.weight.toFixed(2)})</span>)}</div>
                    <h3 className="font-bold text-white text-sm mt-3">Top ham signals (lowest weights)</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">{modelInfo.topHamFeatures.map((f) => <span key={f.token} className="rounded bg-emerald-500/15 border border-emerald-400/40 px-2 py-0.5 text-emerald-200">{f.token} ({f.weight.toFixed(2)})</span>)}</div>
                  </div>
                </div>
                <div className="cyber-card p-5">
                  <h3 className="font-bold text-white text-sm">Held-out test samples (prediction vs truth)</h3>
                  <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto scroll-thin text-xs">
                    {modelInfo.testSamples.map((s, i) => (
                      <div key={i} className={`rounded-lg border p-2 ${s.trueLabel === s.predLabel ? "border-emerald-400/30 bg-emerald-500/5" : "border-red-400/30 bg-red-500/5"}`}>
                        <span className={`font-bold ${s.trueLabel === s.predLabel ? "text-emerald-300" : "text-red-300"}`}>{s.trueLabel === s.predLabel ? "✓" : "✗"} true={s.trueLabel === 1 ? "SPAM" : "HAM"} pred={s.predLabel === 1 ? "SPAM" : "HAM"}</span>
                        <span className="text-slate-300"> — {s.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        <footer className="text-center text-[11px] text-slate-500 pb-8">
          CyberGuard · TF-IDF + Logistic Regression (no paid APIs) · Predictions are estimates, never guarantees — verify via official channels · 🇮🇳 1930 · cybercrime.gov.in · Pasted messages are never stored.
          <br />
          <a href="/cyberguard-source.zip" download className="mt-2 inline-block rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-cyan-200 hover:bg-cyan-400/20">
            ⬇ Download complete source code (.zip)
          </a>
        </footer>
      </main>
    </div>
  );
}
