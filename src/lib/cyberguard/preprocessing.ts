// CyberGuard preprocessing — TypeScript equivalent of NLTK pipeline:
// lowercase → tokenize → remove stopwords → light stemming → n-grams.

const STOPWORDS = new Set([
  "i","me","my","myself","we","our","ours","ourselves","you","your","yours",
  "yourself","yourselves","he","him","his","himself","she","her","hers",
  "herself","it","its","itself","they","them","their","theirs","themselves",
  "what","which","who","whom","this","that","thatll","these","those","am",
  "is","are","was","were","be","been","being","have","has","had","having",
  "do","does","did","doing","a","an","the","and","but","if","or","because",
  "as","until","while","of","at","by","for","with","about","against",
  "between","into","through","during","before","after","above","below","to",
  "from","up","down","in","out","on","off","over","under","again","further",
  "then","once","here","there","when","where","why","how","all","any",
  "both","each","few","more","most","other","some","such","no","nor","not",
  "only","own","same","so","than","too","very","s","t","can","will","just",
  "don","should","now","please","dear","sir","madam","hello","hi","hey",
  "thank","thanks","kindly","u","ur","plz","pls",
]);

export function stemToken(token: string): string {
  // Light rule-based stemmer (Porter-lite) — no external dependency.
  if (token.length <= 3) return token;
  if (token.endsWith("ing") && token.length > 5) return token.slice(0, -3);
  if (token.endsWith("tion") && token.length > 6) return token.slice(0, -4) + "t";
  if (token.endsWith("ies") && token.length > 5) return token.slice(0, -3) + "y";
  if (token.endsWith("es") && token.length > 5) return token.slice(0, -2);
  if (token.endsWith("ed") && token.length > 5) return token.slice(0, -2);
  if (token.endsWith("ly") && token.length > 5) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 4 && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function tokenize(raw: string): string[] {
  const lowered = raw.toLowerCase();
  // keep letters+digits, split on anything else
  const rawTokens = lowered.split(/[^a-z0-9]+/).filter(Boolean);
  const filtered = rawTokens.filter((t) => {
    if (t.length < 2) return false;
    if (STOPWORDS.has(t)) return false;
    if (/^\d+$/.test(t)) return false; // pure numbers are not semantic tokens
    return true;
  });
  return filtered.map(stemToken);
}

export function preprocess(text: string): string[] {
  return tokenize(text);
}

/** Unigrams + bigrams, joined with underscore for bigrams. */
export function toNgrams(tokens: string[], nMin = 1, nMax = 2): string[] {
  const out: string[] = [];
  for (let n = nMin; n <= nMax; n++) {
    for (let i = 0; i + n <= tokens.length; i++) {
      out.push(tokens.slice(i, i + n).join(n === 1 ? "" : "_"));
    }
  }
  return out;
}

export function cleanForDisplay(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
