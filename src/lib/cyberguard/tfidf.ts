// TF-IDF vectorizer — TypeScript equivalent of sklearn's TfidfVectorizer.
// Supports unigrams+bigrams, smooth IDF, L2 normalization option.

import { preprocess, toNgrams } from "./preprocessing";

export class TfidfVectorizer {
  vocabulary: Map<string, number> = new Map();
  idf: number[] = [];
  docCount = 0;
  maxFeatures: number;
  nMin: number;
  nMax: number;

  constructor(opts?: { maxFeatures?: number; nMin?: number; nMax?: number }) {
    this.maxFeatures = opts?.maxFeatures ?? 600;
    this.nMin = opts?.nMin ?? 1;
    this.nMax = opts?.nMax ?? 2;
  }

  private docsToTerms(docs: string[]): string[][] {
    return docs.map((d) => toNgrams(preprocess(d), this.nMin, this.nMax));
  }

  fit(docs: string[]): this {
    const termsList = this.docsToTerms(docs);
    this.docCount = docs.length;
    const df = new Map<string, number>();
    for (const terms of termsList) {
      const seen = new Set(terms);
      for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
    }
    // select top maxFeatures by document frequency (common but not too common)
    const sorted = [...df.entries()].sort((a, b) => b[1] - a[1]).slice(0, this.maxFeatures);
    this.vocabulary = new Map(sorted.map(([t], i) => [t, i]));
    const N = this.docCount;
    this.idf = new Array(this.vocabulary.size).fill(0);
    for (const [term, idx] of this.vocabulary) {
      const dfi = df.get(term) ?? 1;
      this.idf[idx] = Math.log((N + 1) / (dfi + 1)) + 1; // smooth idf like sklearn
    }
    return this;
  }

  transform(docs: string[]): number[][] {
    const termsList = this.docsToTerms(docs);
    const dim = this.vocabulary.size;
    return termsList.map((terms) => {
      const vec = new Array<number>(dim).fill(0);
      if (terms.length === 0) return vec;
      const counts = new Map<number, number>();
      for (const t of terms) {
        const idx = this.vocabulary.get(t);
        if (idx !== undefined) counts.set(idx, (counts.get(idx) ?? 0) + 1);
      }
      for (const [idx, c] of counts) {
        const tf = c / terms.length;
        vec[idx] = tf * this.idf[idx];
      }
      return vec;
    });
  }

  fitTransform(docs: string[]): number[][] {
    this.fit(docs);
    return this.transform(docs);
  }

  transformSingle(text: string): number[] {
    return this.transform([text])[0];
  }

  getFeatureNames(): string[] {
    const arr = [...this.vocabulary.entries()].sort((a, b) => a[1] - b[1]).map(([t]) => t);
    return arr;
  }
}
