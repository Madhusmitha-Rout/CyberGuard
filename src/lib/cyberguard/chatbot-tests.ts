// Chatbot robustness test-suite: >=20 inputs covering genuine cyber questions,
// greetings, random words, gibberish, incomplete and unrelated requests.
// Each case is actually executed through replyTo() — responses are displayed
// verbatim in the UI (/api/chat-tests + chat tab panel).

import {
  replyTo,
  GIBBERISH_MESSAGE,
  INCOMPLETE_MESSAGE,
} from "./chatbot";

export interface ChatTestCase {
  id: string;
  input: string;
  category: "cyber" | "greeting" | "random" | "gibberish" | "incomplete" | "unrelated";
  expect: string; // human-readable expectation
}

export const CHAT_TEST_CASES: ChatTestCase[] = [
  // --- Genuine cybersecurity questions (must keep accurate answers) ---
  { id: "c1", input: "What is phishing?", category: "cyber", expect: "phishing intent, explains fake messages" },
  { id: "c2", input: "How do I stay safe on UPI?", category: "cyber", expect: "upi intent" },
  { id: "c3", input: "Someone asked for my OTP — what do I do?", category: "cyber", expect: "otp intent" },
  { id: "c4", input: "How do I create a strong password?", category: "cyber", expect: "password intent" },
  { id: "c5", input: "How do I report cyber fraud in India?", category: "cyber", expect: "report intent, mentions 1930" },
  { id: "c6", input: "Are work-from-home job offers on Telegram safe?", category: "cyber", expect: "job intent" },
  { id: "c7", input: "What is KYC fraud?", category: "cyber", expect: "kyc intent" },
  { id: "c8", input: "Is this KBC lottery message real?", category: "cyber", expect: "lottery intent" },
  // --- Greetings (natural handling) ---
  { id: "g1", input: "Hi", category: "greeting", expect: "greeting intent" },
  { id: "g2", input: "Hello", category: "greeting", expect: "greeting intent" },
  { id: "g3", input: "Good morning", category: "greeting", expect: "greeting intent" },
  { id: "g4", input: "Namaste", category: "greeting", expect: "greeting intent" },
  // --- Random single words (clarification, never "Which X are you referring to?") ---
  { id: "r1", input: "Egg", category: "random", expect: "clarification, no invented context" },
  { id: "r2", input: "Banana", category: "random", expect: "clarification, no invented context" },
  { id: "r3", input: "Table", category: "random", expect: "clarification, no invented context" },
  { id: "r4", input: "Quantum", category: "random", expect: "clarification, no invented context" },
  // --- Gibberish (exact message) ---
  { id: "x1", input: "Dctfsfvjbdfjbcx", category: "gibberish", expect: `exact: "${GIBBERISH_MESSAGE}"` },
  { id: "x2", input: "asdfghjkl", category: "gibberish", expect: `exact: "${GIBBERISH_MESSAGE}"` },
  { id: "x3", input: "qwertyuiopzxcv", category: "gibberish", expect: `exact: "${GIBBERISH_MESSAGE}"` },
  // --- Incomplete (exact message) ---
  { id: "i1", input: "ABCD", category: "incomplete", expect: `exact: "${INCOMPLETE_MESSAGE}"` },
  { id: "i2", input: "What is", category: "incomplete", expect: `exact: "${INCOMPLETE_MESSAGE}"` },
  { id: "i3", input: "???", category: "incomplete", expect: `exact: "${INCOMPLETE_MESSAGE}"` },
  // --- Unrelated (specialization message) ---
  { id: "u1", input: "What is the capital of France?", category: "unrelated", expect: "out-of-scope, mentions specializes + cybersecurity" },
  { id: "u2", input: "Tell me a joke", category: "unrelated", expect: "out-of-scope, mentions specializes + cybersecurity" },
  { id: "u3", input: "Recipe for chicken biryani", category: "unrelated", expect: "out-of-scope, mentions specializes + cybersecurity" },
  { id: "u4", input: "Who won yesterday's cricket match?", category: "unrelated", expect: "out-of-scope, mentions specializes + cybersecurity" },
];

export interface ChatTestResult {
  id: string;
  input: string;
  category: string;
  intentId: string;
  title: string;
  answer: string;
  pass: boolean;
  detail: string;
}

export function runChatbotTests(): { passed: number; total: number; results: ChatTestResult[] } {
  const results: ChatTestResult[] = CHAT_TEST_CASES.map((tc) => {
    const r = replyTo(tc.input);
    let pass = false;
    let detail = "";
    const ansLower = r.answer.toLowerCase();
    switch (tc.category) {
      case "cyber":
        pass = !["clarification", "out-of-scope", "gibberish", "incomplete", "empty", "greeting"].includes(r.intentId);
        if (tc.id === "c1") pass = pass && r.intentId === "phishing" && ansLower.includes("phish");
        if (tc.id === "c2") pass = pass && r.intentId === "upi" && ansLower.includes("upi");
        if (tc.id === "c3") pass = pass && r.intentId === "otp" && ansLower.includes("otp");
        if (tc.id === "c4") pass = pass && r.intentId === "password" && ansLower.includes("password");
        if (tc.id === "c5") pass = pass && r.intentId === "report-india" && r.answer.includes("1930");
        if (tc.id === "c6") pass = pass && (r.intentId === "job" || r.intentId === "social");
        if (tc.id === "c7") pass = pass && r.intentId === "kyc";
        if (tc.id === "c8") pass = pass && r.intentId === "lottery";
        detail = `intent=${r.intentId}`;
        break;
      case "greeting":
        pass = r.intentId === "greeting";
        detail = `intent=${r.intentId}`;
        break;
      case "random":
        pass =
          (r.intentId === "clarification" || r.intentId === "out-of-scope") &&
          !/which\s+\S+\s+are you referring to/i.test(r.answer) &&
          !/which\s+(person|object|egg)/i.test(r.answer);
        detail = `intent=${r.intentId}, invented-context=${/referring to/i.test(r.answer) ? "YES (bad)" : "no (good)"}`;
        break;
      case "gibberish":
        pass = r.answer === GIBBERISH_MESSAGE && r.intentId === "gibberish";
        detail = r.answer === GIBBERISH_MESSAGE ? "exact gibberish message" : `WRONG: "${r.answer.slice(0, 80)}"`;
        break;
      case "incomplete":
        pass = r.answer === INCOMPLETE_MESSAGE && r.intentId === "incomplete";
        detail = r.answer === INCOMPLETE_MESSAGE ? "exact incomplete message" : `WRONG: "${r.answer.slice(0, 80)}"`;
        break;
      case "unrelated":
        pass =
          r.intentId === "out-of-scope" &&
          ansLower.includes("specializ") &&
          ansLower.includes("cybersecurity");
        detail = `intent=${r.intentId}`;
        break;
    }
    return { id: tc.id, input: tc.input, category: tc.category, intentId: r.intentId, title: r.title, answer: r.answer, pass, detail };
  });
  return { passed: results.filter((r) => r.pass).length, total: results.length, results };
}
