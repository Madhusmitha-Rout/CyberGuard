// Scam Spotter quiz bank — realistic India-context scenarios.
// Each question: scenario → user judges SAFE or SUSPICIOUS.

export type QuizCategory = "phishing" | "upi" | "password" | "otp" | "social";

export interface QuizQuestion {
  id: string;
  category: QuizCategory;
  categoryLabel: string;
  scenario: string;
  correct: "safe" | "suspicious";
  explanation: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    category: "phishing",
    categoryLabel: "Phishing",
    scenario: "SMS: “SBI Alert: Your account blocked due to KYC pending. Update now at sbi-kyc-verify.xyz or account closes today.”",
    correct: "suspicious",
    explanation: "Suspicious. Real banks never send KYC links or threaten instant closure. The domain sbi-kyc-verify.xyz is fake (real: sbi.co.in). Ignore and check in the official app.",
  },
  {
    id: "q2",
    category: "upi",
    categoryLabel: "UPI Safety",
    scenario: "OLX buyer says: “I will pay Rs 12,000 advance. Just scan this QR and enter your UPI PIN to receive the money.”",
    correct: "suspicious",
    explanation: "Suspicious. Entering UPI PIN or scanning a QR always SENDS money — you never need a PIN to receive money. This is the classic marketplace QR scam.",
  },
  {
    id: "q3",
    category: "password",
    categoryLabel: "Password Safety",
    scenario: "You use “Chai@Bengaluru#2024” for email, a different long password for banking, and 2-factor authentication is ON.",
    correct: "safe",
    explanation: "Safe. Long, unique passwords per site plus 2FA is exactly right. A password manager can help you keep them all different.",
  },
  {
    id: "q4",
    category: "otp",
    categoryLabel: "OTP Safety",
    scenario: "Caller: “I am from HDFC customer care. Your card is blocked. Please tell me the OTP you just received so I can unblock it.”",
    correct: "suspicious",
    explanation: "Suspicious. No bank employee will ever ask for OTP/CVV/PIN. Cut the call and dial the bank's official number from its website.",
  },
  {
    id: "q5",
    category: "social",
    categoryLabel: "Social Engineering",
    scenario: "WhatsApp: “You won a KBC lottery of 25 lakh! Pay Rs 5,500 filing charge on this link to claim.” You never entered any lottery.",
    correct: "suspicious",
    explanation: "Suspicious. You cannot win a lottery you never entered, and real prizes never need advance fees. KBC winners are never asked to pay on WhatsApp links.",
  },
  {
    id: "q6",
    category: "upi",
    categoryLabel: "UPI Safety",
    scenario: "Tea stall: you pay Rs 40 via GPay by scanning the shop's printed QR, verify the shop name, and enter your PIN yourself.",
    correct: "safe",
    explanation: "Safe. You initiated the payment to a known merchant, verified the name, and entered your own PIN — the correct UPI flow.",
  },
  {
    id: "q7",
    category: "phishing",
    categoryLabel: "Phishing",
    scenario: "Email from “support@amaz0n-deals.top”: “Order undelivered. Pay Rs 49 redelivery fee here within 12 hours.”",
    correct: "suspicious",
    explanation: "Suspicious. Sender uses a lookalike domain (amaz0n, .top) and pressures with a deadline. Track orders only inside the official Amazon app.",
  },
  {
    id: "q8",
    category: "otp",
    categoryLabel: "OTP Safety",
    scenario: "Your bank SMS reads: “OTP 739201 for login. Valid 10 mins. Never share with anyone, including bank staff.” You typed it only on the official site.",
    correct: "safe",
    explanation: "Safe. This is a genuine OTP pattern — short validity, warning not to share, used only by you on the official website.",
  },
  {
    id: "q9",
    category: "password",
    categoryLabel: "Password Safety",
    scenario: "A “technician” on a call asks you to install AnyDesk and share the code so he can “fix your bank app and check passwords”.",
    correct: "suspicious",
    explanation: "Suspicious. Screen-sharing apps give full control of your phone including OTPs and banking apps. Banks never fix apps this way.",
  },
  {
    id: "q10",
    category: "social",
    categoryLabel: "Social Engineering",
    scenario: "Telegram: “Earn Rs 2,000 daily liking YouTube videos. Just pay Rs 500 activation fee first to our agent.”",
    correct: "suspicious",
    explanation: "Suspicious. Real jobs never charge activation fees. Task scams pay tiny amounts first to build trust, then vanish after a large “deposit”.",
  },
];

export const CATEGORY_LABELS: Record<QuizCategory, string> = {
  phishing: "Phishing",
  upi: "UPI Safety",
  password: "Password Safety",
  otp: "OTP Safety",
  social: "Social Engineering",
};

export const CATEGORY_TIPS: Record<QuizCategory, string> = {
  phishing: "Revise: sender domains, shortened links, and the “open the official app yourself” rule.",
  upi: "Revise: PIN = pay (never receive), QR scans send money, verify collect requests.",
  password: "Revise: 12+ char unique passwords, password manager, 2FA with authenticator app.",
  otp: "Revise: nobody — not even bank staff — may ask for OTP/CVV/PIN. Ever.",
  social: "Revise: advance-fee prizes/jobs, romance & marketplace pressure tactics, 1930 reporting.",
};

export interface GradedAnswer {
  questionId: string;
  category: QuizCategory;
  chosen: "safe" | "suspicious";
  correct: "safe" | "suspicious";
  isCorrect: boolean;
}

export function gradeQuiz(answers: Record<string, "safe" | "suspicious">): {
  score: number;
  total: number;
  percentage: number;
  graded: GradedAnswer[];
  categoryBreakdown: Record<string, { correct: number; total: number }>;
} {
  const graded: GradedAnswer[] = QUIZ_QUESTIONS.map((q) => {
    const chosen = answers[q.id];
    const isCorrect = chosen === q.correct;
    return { questionId: q.id, category: q.category, chosen, correct: q.correct, isCorrect };
  });
  const score = graded.filter((g) => g.isCorrect).length;
  const total = QUIZ_QUESTIONS.length;
  const categoryBreakdown: Record<string, { correct: number; total: number }> = {};
  for (const q of QUIZ_QUESTIONS) {
    categoryBreakdown[q.category] = categoryBreakdown[q.category] ?? { correct: 0, total: 0 };
    categoryBreakdown[q.category].total += 1;
  }
  for (const g of graded) {
    if (g.isCorrect) categoryBreakdown[g.category].correct += 1;
  }
  return { score, total, percentage: Math.round((score / total) * 100), graded, categoryBreakdown };
}
