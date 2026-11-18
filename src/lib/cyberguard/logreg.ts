// Logistic Regression with batch gradient descent + L2 —
// TypeScript equivalent of sklearn.linear_model.LogisticRegression.

function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

export interface LogRegOptions {
  learningRate?: number;
  epochs?: number;
  l2?: number;
}

export class LogisticRegression {
  weights: number[] = [];
  bias = 0;
  lr: number;
  epochs: number;
  l2: number;

  constructor(opts?: LogRegOptions) {
    this.lr = opts?.learningRate ?? 0.8;
    this.epochs = opts?.epochs ?? 900;
    this.l2 = opts?.l2 ?? 0.001;
  }

  fit(X: number[][], y: number[]): this {
    const n = X.length;
    if (n === 0) throw new Error("Empty training set");
    const dim = X[0].length;
    this.weights = new Array(dim).fill(0);
    this.bias = 0;
    const m = n;
    for (let epoch = 0; epoch < this.epochs; epoch++) {
      const gradW = new Array(dim).fill(0);
      let gradB = 0;
      for (let i = 0; i < n; i++) {
        const xi = X[i];
        let z = this.bias;
        for (let j = 0; j < dim; j++) z += this.weights[j] * xi[j];
        const p = sigmoid(z);
        const err = p - y[i];
        for (let j = 0; j < dim; j++) gradW[j] += err * xi[j];
        gradB += err;
      }
      for (let j = 0; j < dim; j++) {
        gradW[j] = gradW[j] / m + this.l2 * this.weights[j];
        this.weights[j] -= this.lr * gradW[j];
      }
      this.bias -= this.lr * (gradB / m);
    }
    return this;
  }

  predictProba(X: number[][]): number[] {
    return X.map((xi) => {
      let z = this.bias;
      for (let j = 0; j < this.weights.length; j++) z += this.weights[j] * xi[j];
      return sigmoid(z);
    });
  }

  predict(X: number[][], threshold = 0.5): number[] {
    return this.predictProba(X).map((p) => (p >= threshold ? 1 : 0));
  }
}

export function computeMetrics(yTrue: number[], yPred: number[]) {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === 1 && yPred[i] === 1) tp++;
    else if (yTrue[i] === 0 && yPred[i] === 0) tn++;
    else if (yTrue[i] === 0 && yPred[i] === 1) fp++;
    else fn++;
  }
  const total = yTrue.length || 1;
  const accuracy = (tp + tn) / total;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { accuracy, precision, recall, f1, confusion: { tp, tn, fp, fn } };
}
