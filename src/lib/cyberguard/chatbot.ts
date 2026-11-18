// CyberGuard AI Cyber Chatbot — offline rule-based NLP (no paid APIs).
// Intent matching with keyword scoring + curated cybersecurity knowledge base,
// including Indian cyber safety resources (1930 helpline, cybercrime.gov.in).
//
// Robustness rules (do NOT invent context for random words):
// - Genuine cybersecurity questions -> accurate answers.
// - Greetings -> natural greeting.
// - Gibberish (e.g. "Dctfsfvjbdfjbcx") -> exact: "I couldn't understand your message. Please check your input and try again."
// - Incomplete (e.g. "ABCD") -> exact: "Could you please enter a complete question?"
// - Random single words (e.g. "Egg") -> polite clarification, NEVER "Which Egg are you referring to?"
// - Unrelated requests -> polite specialization message (CyberGuard = cybersecurity only).

interface Intent {
  id: string;
  keywords: string[];
  title: string;
  answer: string;
  followUp?: string[];
}

const INTENTS: Intent[] = [
  {
    id: "greeting",
    keywords: ["hello", "hi", "hey", "namaste", "good morning", "good evening"],
    title: "Greeting",
    answer:
      "Hello! I am CyberGuard, your cyber safety assistant. Ask me about phishing, UPI fraud, passwords, OTP scams, or type “help” to see what I can explain.",
    followUp: ["What is phishing?", "How to stay safe on UPI?", "India cyber helpline"],
  },
  {
    id: "help",
    keywords: ["help", "what can you", "options", "menu", "topics", "guide"],
    title: "What I can do",
    answer:
      "I can explain: 1) Phishing & email scams 2) UPI & OTP fraud 3) Password safety 4) KYC / bank fraud 5) Job & lottery scams 6) How to report cybercrime in India (helpline 1930, cybercrime.gov.in). Try: “What is phishing?” or “How do I report cyber fraud in India?”",
  },
  {
    id: "phishing",
    keywords: ["phish", "email scam", "fake email", "fake link", "spoof", "spear phish"],
    title: "Phishing explained",
    answer:
      "Phishing is a fake message that pretends to be a trusted sender (bank, Amazon, IT dept) to steal passwords or money.\n\nWarning signs: urgent tone (“account blocked in 24 hrs”), strange sender address, shortened links (bit.ly), spelling errors, attachments asking for login.\n\nStay safe: never click links in unexpected messages — open the official app/website yourself. Check sender domain carefully (e.g. sbi.co.in vs sbi-kyc-verify.xyz). Enable 2-factor authentication.",
    followUp: ["How do I report cyber fraud in India?", "What is UPI fraud?"],
  },
  {
    id: "upi",
    keywords: ["upi", "gpay", "google pay", "phonepe", "paytm", "bhim", "qr code", "qr", "collect request", "cashback"],
    title: "UPI fraud",
    answer:
      "Common UPI frauds in India: 1) Fake collect requests — entering your UPI PIN always SENDS money, never receives it. 2) QR-scan-to-receive scams on OLX/Facebook Marketplace. 3) Fake cashback links. 4) Screen-share apps (AnyDesk) to steal OTPs.\n\nRules: NEVER enter UPI PIN to receive money. NEVER scan a QR to receive payment. Verify collect requests, check receiver name, keep daily limits low, and never share OTP.",
    followUp: ["What is OTP fraud?", "What is phishing?"],
  },
  {
    id: "otp",
    keywords: ["otp", "one time password", "cvv", "pin", "share otp"],
    title: "OTP & PIN safety",
    answer:
      "Your OTP, CVV and UPI PIN are keys to your money. No bank, RBI officer, police or customer-care agent will EVER ask for them.\n\nIf anyone calls asking for OTP — even showing a bank logo on WhatsApp — it is a scam. Cut the call, block the number, and call your bank's official number from its website. Never read OTPs aloud to “verify” anything.",
  },
  {
    id: "password",
    keywords: ["password", "passcode", "strong password", "2fa", "two factor", "passphrase"],
    title: "Password safety",
    answer:
      "Use long unique passwords: 12+ characters, a mix of words + numbers + symbols (e.g. “Chai@Bengaluru#2024”). Never reuse banking passwords elsewhere.\n\nBest practices: use a password manager, turn on 2-factor authentication (authenticator app > SMS), change passwords after any breach, and never share passwords on phone or WhatsApp — even with “support staff”.",
  },
  {
    id: "kyc",
    keywords: ["kyc", "account blocked", "suspended", "verify account", "update kyc"],
    title: "KYC / bank impersonation fraud",
    answer:
      "The “KYC expired, account blocked” SMS is India's most common scam. Real banks NEVER send links to update KYC or threaten instant closure.\n\nDo this instead: ignore the link, open your bank's official app or visit the branch, and check KYC status there. Forward scam SMS to 1930 and report at cybercrime.gov.in.",
  },
  {
    id: "lottery",
    // NOTE: bare "won" removed — it misclassified unrelated wins (e.g. cricket).
    // Lottery still matches via lottery/kbc/prize/winner/jackpot/giveaway/reward.
    keywords: ["lottery", "kbc", "prize", "winner", "jackpot", "giveaway", "reward", "congratulations you won"],
    title: "Lottery & prize scams",
    answer:
      "You cannot win a lottery you never entered. KBC, Amazon and Flipkart NEVER ask winners to pay “filing charges” or “delivery fees” in advance.\n\nScammers use excitement + urgency (“only 3 left!”). Rule: any prize asking for advance payment, gift cards or bank details is fake. Verify on official websites only.",
  },
  {
    id: "job",
    keywords: ["job", "work from home", "part time", "earn money", "telegram task", "youtube like", "registration fee"],
    title: "Job & task scams",
    answer:
      "Fake jobs promise Rs 30,000–50,000/month for liking videos or data entry, then ask for a “registration / laptop deposit / activation fee”. Real employers NEVER ask you to pay to get hired.\n\nCheck: company website + GST, interview on official email (not Gmail), no Telegram-only contact, no advance fees. Search “company name + fraud” before paying anything.",
  },
  {
    id: "loan",
    keywords: ["loan", "cibil", "instant loan", "personal loan", "credit"],
    title: "Instant loan app fraud",
    answer:
      "Fraud loan apps promise instant approval with zero CIBIL, then demand advance “processing fees” or steal contacts/photos to blackmail you.\n\nUse only RBI-registered lenders (check rbi.org.in), never grant contacts/gallery access to loan apps, and never pay fees before disbursal. Report abusive apps to 1930.",
  },
  {
    id: "report-india",
    keywords: ["report", "complaint", "1930", "cybercrime.gov.in", "helpline", "police", "fir", "india", "indian"],
    title: "Report cybercrime in India",
    answer:
      "To report cyber fraud in India:\n\n1) Call the National Cyber Helpline 1930 immediately (fastest way to freeze fraudulent transactions).\n2) File a complaint at https://cybercrime.gov.in (National Cyber Crime Reporting Portal).\n3) Inform your bank's official customer care and block cards/UPI.\n4) Save screenshots, SMS, UPI transaction IDs (UTR) and caller numbers as evidence.\n5) Visit your nearest Cyber Crime Police Station for amounts above Rs 50,000.\n\nAct within the “golden hours” — the first 2 hours give the best chance of freezing scammer accounts.",
  },
  {
    id: "ransomware",
    keywords: ["ransomware", "malware", "virus", "hack", "hacked", "antivirus"],
    title: "Malware & device safety",
    answer:
      "Malware arrives via fake apps, APK files on WhatsApp/Telegram, and infected pen drives. Signs: battery draining fast, unknown apps, pop-ups.\n\nProtect yourself: install apps only from Play Store, never install APKs from chats, keep phone updated, use Play Protect, back up photos to Google Drive, and never grant accessibility permission to unknown apps.",
  },
  {
    id: "wifi",
    keywords: ["wifi", "public wifi", "vpn", "safe browsing", "https"],
    title: "Safe browsing & Wi-Fi",
    answer:
      "Avoid banking on free café/airport Wi-Fi. Look for the padlock + “https” in the address bar before entering passwords. Use UPI apps with app-lock/fingerprint, log out of shared computers, and check app permissions every few months (Settings → Privacy).",
  },
  {
    id: "social",
    keywords: ["instagram", "facebook", "whatsapp", "telegram", "romance", "dating", "matrimonial", "friend request"],
    title: "Social media & romance scams",
    answer:
      "Scammers build trust on Instagram/WhatsApp/matrimonial sites, then invent emergencies (“stuck at airport, need customs fee”). Never send money to someone you have not met in person. Video-call to verify identity, reverse-image-search profile photos, and never share Aadhaar/PAN photos in chats.",
  },
  {
    id: "children",
    keywords: ["child", "kid", "student", "school", "parent", "teen"],
    title: "Safety for students & parents",
    answer:
      "For students: never share school ID, location or OTP in gaming chats (Free Fire, BGMI). Beware fake “exam paper leak” groups that steal money. For parents: enable parental controls, review app downloads together, and teach kids to say NO to video calls from strangers and report bullying to 1098 (Childline) or 1930.",
  },
];

// --- Fixed response strings (exact match required by spec) ---
export const GIBBERISH_MESSAGE =
  "I couldn't understand your message. Please check your input and try again.";
export const INCOMPLETE_MESSAGE = "Could you please enter a complete question?";
export const OUT_OF_SCOPE_MESSAGE =
  "Thanks for your message — I'm CyberGuard, and I specialize in cybersecurity topics such as phishing, UPI and OTP fraud, password safety, and reporting cybercrime in India (helpline 1930, cybercrime.gov.in). I can't help with unrelated topics. Could you please ask a cybersecurity question instead? For example: “What is phishing?” or “How do I stay safe on UPI?”";
export const CLARIFICATION_MESSAGE =
  "I didn't quite catch that. Could you please ask a complete cybersecurity question? I specialize in online safety (phishing, UPI fraud, passwords, OTP scams, reporting to 1930) — for example: “What is phishing?”. I don't guess about random words or objects outside cybersecurity.";

// Small common-words lexicon: used to tell real words ("egg") apart from
// initials/gibberish ("ABCD"). Intentionally does NOT contain "abcd"/"xyz".
const COMMON_WORDS = new Set(
  (
    "a an the i you he she it we they me him her us them my your his our their this that these those " +
    "is are was were be been being am do does did done can could should would will shall may might must " +
    "what which who whom whose when where why how do does is are tell me give show explain define meaning about please thanks thank hello hi hey " +
    "egg eggs banana bananas apple apples table tables chair chairs dog dogs cat cats car cars book books water food foods rice bread milk tea coffee " +
    "capital capitals france paris joke jokes funny funnies recipe recipes chicken biryani cook cooking cricket match matches score scores weather today tomorrow rain sunny movie movies song songs music love friend friends school schools exam exams student students " +
    "quantum physics chemistry maths math science history geography morning evening night day yesterday win won winning losskey hello morning namaste evening " +
    "good there cyberguard bot friend please help you your"
  )
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary phrase match. Short keywords (<=3 chars) need exact words
 *  so "hi" never matches "this"/"phishing"; longer ones allow suffixes so
 *  "phish" matches "phishing" and "hack" matches "hacked". */
function containsPhrase(haystackLower: string, phraseRaw: string): boolean {
  const phrase = phraseRaw.toLowerCase().trim();
  if (!phrase) return false;
  const words = phrase.split(/\s+/).map(escapeRegExp);
  if (words.length === 1 && phrase.length <= 3) {
    return new RegExp(`\\b${words[0]}\\b`).test(haystackLower);
  }
  if (words.length === 1) {
    return new RegExp(`\\b${words[0]}\\w*\\b`).test(haystackLower);
  }
  return new RegExp(`\\b${words.join("\\s+")}\\b`).test(haystackLower);
}

function scoreIntent(questionLower: string, intent: Intent): number {
  let score = 0;
  for (const kw of intent.keywords) {
    if (containsPhrase(questionLower, kw)) score += kw.length > 4 ? 2 : 1;
  }
  return score;
}

function isGreetingOnly(raw: string): boolean {
  const t = raw.trim().toLowerCase().replace(/[!.,?]+$/g, "").trim();
  if (/^(hi|hello|hey|namaste|hii+|heyy+)$/.test(t)) return true;
  if (/^good\s+(morning|evening|afternoon)$/.test(t)) return true;
  if (/^(hi|hello|hey)\s+(there|cyberguard|bot|friend)$/.test(t)) return true;
  return false;
}

function isGibberish(raw: string): boolean {
  const cleaned = raw.trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const alphaTokens = tokens
    .map((t) => t.replace(/[^a-zA-Z]/g, ""))
    .filter((t) => t.length > 0);
  if (alphaTokens.length === 0) return false;

  if (alphaTokens.length === 1) {
    const tok = alphaTokens[0];
    if (tok.length < 7) return false;
    const lower = tok.toLowerCase();
    if (COMMON_WORDS.has(lower)) return false;
    if (/(asdf|qwer|zxcv|jkl|qwerty|hjkl)/.test(lower)) return true;
    const vowels = (lower.match(/[aeiou]/g) || []).length;
    const ratio = vowels / lower.length;
    const longConsonantRun = /[^aeiou]{5,}/.test(lower);
    if (ratio < 0.2) return true;
    if (ratio < 0.3 && (longConsonantRun || lower.length >= 12)) return true;
    return false;
  }

  // Multi-token: gibberish only if EVERY token is unknown AND overall vowel-poor.
  const allUnknown = alphaTokens.every(
    (t) => t.length >= 4 && !COMMON_WORDS.has(t.toLowerCase())
  );
  if (!allUnknown) return false;
  const joined = alphaTokens.join("").toLowerCase();
  if (joined.length < 12) return false;
  const vowels = (joined.match(/[aeiou]/g) || []).length;
  return vowels / joined.length < 0.2;
}

function isIncomplete(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false; // empty handled separately
  // Only punctuation / numbers / symbols.
  if (/^[^a-zA-Z]*$/.test(t)) return true;
  const letters = t.replace(/[^a-zA-Z]/g, "");
  if (letters.length <= 1) return true;
  // Very short inputs: real words ("Egg") go to clarification, non-words ("ABCD") are incomplete.
  if (t.length <= 4) {
    const tok = letters;
    if (tok && COMMON_WORDS.has(tok.toLowerCase()) && t !== t.toUpperCase()) {
      return false;
    }
    return true;
  }
  // Dangling fragments with no object.
  if (/^(what is|what are|whats|what's|tell me about|how to|how do i|explain|define|meaning of)\s*[?.!]*$/i.test(t)) {
    return true;
  }
  // Single short ALL-CAPS token like "ABCDE" (unknown initials).
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const tok = parts[0].replace(/[^a-zA-Z]/g, "");
    if (tok.length >= 2 && tok.length <= 6 && tok === tok.toUpperCase() && !COMMON_WORDS.has(tok.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function isSingleWord(raw: string): boolean {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 1) return false;
  const letters = parts[0].replace(/[^a-zA-Z]/g, "");
  return letters.length >= 2;
}

export interface ChatReply {
  title: string;
  answer: string;
  intentId: string;
  followUp: string[];
  confidence: number;
}

export function replyTo(question: string): ChatReply {
  const q = (question || "").trim();
  if (!q) {
    return {
      title: "Empty question",
      answer: "Please type a cybersecurity question, e.g. “What is phishing?”",
      intentId: "empty",
      followUp: ["What is phishing?", "How do I report cyber fraud in India?"],
      confidence: 0,
    };
  }
  const qLower = q.toLowerCase();

  // 1) Genuine cybersecurity intents first (excluding greeting/help so that
  //    "Hi, what is phishing?" still answers phishing).
  const cyberIntents = INTENTS.filter((i) => i.id !== "greeting" && i.id !== "help");
  let best: Intent | null = null;
  let bestScore = 0;
  for (const intent of cyberIntents) {
    const s = scoreIntent(qLower, intent);
    if (s > bestScore) {
      bestScore = s;
      best = intent;
    }
  }
  if (best && bestScore > 0) {
    return {
      title: best.title,
      answer: best.answer,
      intentId: best.id,
      followUp: best.followUp ?? [],
      confidence: Math.min(0.95, 0.5 + bestScore * 0.1),
    };
  }

  // 2) Help (only when no cyber intent matched).
  const helpIntent = INTENTS.find((i) => i.id === "help")!;
  if (scoreIntent(qLower, helpIntent) > 0) {
    return {
      title: helpIntent.title,
      answer: helpIntent.answer,
      intentId: helpIntent.id,
      followUp: [],
      confidence: 0.8,
    };
  }

  // 3) Greetings handled naturally (and only when the whole message is a greeting).
  if (isGreetingOnly(q)) {
    const g = INTENTS.find((i) => i.id === "greeting")!;
    return {
      title: g.title,
      answer: g.answer,
      intentId: g.id,
      followUp: g.followUp ?? [],
      confidence: 0.95,
    };
  }

  // 4) Incomplete fragments -> exact message (e.g. "ABCD").
  if (isIncomplete(q)) {
    return {
      title: "Incomplete input",
      answer: INCOMPLETE_MESSAGE,
      intentId: "incomplete",
      followUp: ["What is phishing?", "How do I report cyber fraud in India?"],
      confidence: 0.95,
    };
  }

  // 5) Gibberish -> exact message (e.g. "Dctfsfvjbdfjbcx").
  if (isGibberish(q)) {
    return {
      title: "Unclear input",
      answer: GIBBERISH_MESSAGE,
      intentId: "gibberish",
      followUp: ["What is phishing?", "How do I report cyber fraud in India?"],
      confidence: 0.95,
    };
  }

  // 6) Random single words (e.g. "Egg") -> polite clarification.
  //    Never invent context like "Which Egg are you referring to?".
  if (isSingleWord(q)) {
    return {
      title: "Need a clearer question",
      answer: CLARIFICATION_MESSAGE,
      intentId: "clarification",
      followUp: ["What is phishing?", "How do I stay safe on UPI?", "How do I report cyber fraud in India?"],
      confidence: 0.9,
    };
  }

  // 7) Ordinary unrelated multi-word requests -> specialization message.
  return {
    title: "Outside my expertise",
    answer: OUT_OF_SCOPE_MESSAGE,
    intentId: "out-of-scope",
    followUp: ["What is phishing?", "What is UPI fraud?", "How do I report cyber fraud in India?"],
    confidence: 0.9,
  };
}

export function getSuggestedQuestions(): string[] {
  return [
    "What is phishing?",
    "How do I stay safe on UPI?",
    "Someone asked for my OTP — what do I do?",
    "How do I create a strong password?",
    "Is this KBC lottery message real?",
    "How do I report cyber fraud in India?",
    "Are work-from-home job offers on Telegram safe?",
    "How do I spot a fake loan app?",
  ];
}
