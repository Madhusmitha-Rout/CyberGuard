// CyberGuard Safety Scorecard — heuristic risk indicators (NOT a validated
// fraud probability). Each indicator is transparent and explainable.

export interface RiskIndicator {
  id: string;
  label: string;
  description: string;
  points: number;
  detected: boolean;
  evidence: string[];
}

export interface Scorecard {
  score: number; // 0..100, higher = riskier
  level: "LOW" | "MEDIUM" | "HIGH";
  indicators: RiskIndicator[];
  summary: string;
  disclaimer: string;
}

const PATTERNS: { id: string; label: string; description: string; points: number; regexes: RegExp[] }[] = [
  {
    id: "urgency",
    label: "Urgency / pressure tactics",
    description: "Scammers rush you (“immediately”, “last chance”, “24 hours”) so you act without thinking.",
    points: 25,
    regexes: [/\burgent\b/i, /\bimmediately\b/i, /\blast chance\b/i, /\bact now\b/i, /\bexpire[sd]?\b/i, /\bwithin\s+\d+\s*hours?\b/i, /\btoday only\b/i, /\bsuspended\b/i, /\bblocked\b/i, /\bdeactivat/i, /\bpower cut\b/i, /\b2 hours?\b/i, /\bmidnight\b/i],
  },
  {
    id: "links",
    label: "Suspicious link / URL",
    description: "Shortened or odd-domain links (bit.ly, .xyz, .top, .tk) often lead to fake login pages.",
    points: 25,
    regexes: [/https?:\/\//i, /www\./i, /bit\.ly/i, /tinyurl/i, /\.xyz/i, /\.top/i, /\.tk/i, /\.ml/i, /\.ga/i, /\.win/i, /\.club/i, /click here/i, /\bclick\b.*\blink\b/i, /-verify\./i, /-claim\./i, /-pay\./i],
  },
  {
    id: "sensitive",
    label: "Request for sensitive info",
    description: "Asking for OTP, CVV, PIN, passwords, Aadhaar/PAN or bank logins is a major red flag.",
    points: 20,
    regexes: [/\botp\b/i, /\bcvv\b/i, /\bupi\s*pin\b/i, /\bpin\b/i, /\bpassword\b/i, /\baadhaar\b/i, /\bpan\b card/i, /\bbank\s*(details|login|account)\b/i, /\bcard number\b/i, /\bshare.*otp\b/i, /\banydesk\b/i, /\bteamviewer\b/i, /\bscreen.*share\b/i],
  },
  {
    id: "money",
    label: "Unexpected money / prize offer",
    description: "Lotteries, cashback, refunds or “double your money” offers you never applied for.",
    points: 15,
    regexes: [/\blottery\b/i, /\bprize\b/i, /\bwinner\b/i, /\bwon\b/i, /\bcongratulations\b/i, /\bcashback\b/i, /\brefund\b/i, /\bfree\b.*(iphone|recharge|gift)/i, /\bdouble.*money\b/i, /\bguaranteed.*profit\b/i, /\bscholarship\b/i, /\bsubsidy\b/i, /\breward/i, /rs\.?\s*\d/i, /₹\s*\d/i, /\blakh\b/i, /\bcrore\b/i],
  },
  {
    id: "authority",
    label: "Authority impersonation",
    description: "Claims to be RBI, CBI, police, Income Tax, customs or a bank officer to create fear.",
    points: 10,
    regexes: [/\brbi\b/i, /\bcbi\b/i, /\bpolice\b/i, /\bcustoms\b/i, /\bincome tax\b/i, /\bbank (officer|manager)\b/i, /\bcyber cell\b/i, /\barmy\b/i, /\bofficer\b/i, /\bcourt\b/i, /\barrest\b/i, /\bfine\b/i, /\blegal action\b/i],
  },
  {
    id: "advance",
    label: "Advance fee request",
    description: "Asking for upfront fees (registration, processing, delivery) before you get anything.",
    points: 12,
    regexes: [/\badvance\b/i, /\bprocessing fee\b/i, /\bregistration\b.*(fee|rs)/i, /\bpay.*rs\.?\s*\d+/i, /\bpay.*fee\b/i, /\bdeposit\b/i, /\bfiling charge\b/i, /\bclearance fee\b/i, /\bdelivery.*(fee|charge|rs)/i],
  },
];

function snippet(text: string, matchIndex: number, len = 42): string {
  const start = Math.max(0, matchIndex - 20);
  const end = Math.min(text.length, matchIndex + len);
  return "…" + text.slice(start, end).trim() + "…";
}

export function buildScorecard(rawText: string): Scorecard {
  const text = rawText || "";
  const indicators: RiskIndicator[] = PATTERNS.map((p) => {
    const evidence: string[] = [];
    for (const re of p.regexes) {
      // fresh regex each time to avoid lastIndex issues
      const r = new RegExp(re.source, re.flags);
      const m = r.exec(text);
      if (m && m.index !== undefined) {
        evidence.push(`“${snippet(text, m.index)}” matched /${re.source}/`);
        if (evidence.length >= 2) break;
      }
    }
    return {
      id: p.id,
      label: p.label,
      description: p.description,
      points: p.points,
      detected: evidence.length > 0,
      evidence,
    };
  });

  let score = indicators.filter((i) => i.detected).reduce((s, i) => s + i.points, 0);
  // Small bonus if 3+ indicators fire (compounding risk)
  const fired = indicators.filter((i) => i.detected).length;
  if (fired >= 4) score += 8;
  else if (fired === 3) score += 4;
  score = Math.min(100, score);

  const level: Scorecard["level"] = score >= 61 ? "HIGH" : score >= 31 ? "MEDIUM" : "LOW";
  const summary =
    level === "HIGH"
      ? "Multiple strong warning signs detected. Treat as highly risky — do not click, pay, or share details."
      : level === "MEDIUM"
        ? "Some warning signs detected. Pause and verify through official channels before acting."
        : "Few warning signs detected. Still stay cautious — scammers constantly change wording.";

  return {
    score,
    level,
    indicators,
    summary,
    disclaimer:
      "Heuristic risk score only — it counts visible warning patterns and is NOT a statistically validated probability that the message is fraud.",
  };
}
