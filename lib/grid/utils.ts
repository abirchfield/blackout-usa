/**
 * Numerical utilities for the grid simulation.
 * Dense solvers (LU, Cholesky) and Union-Find, all using typed arrays for zero-GC-pressure.
 */

export function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value;
}

// =========================================================================
// Union-Find (disjoint-set with path halving + union by rank)
// =========================================================================

export class UnionFind {
  private parent: Int32Array;
  private rank: Int32Array;

  constructor(n: number) {
    this.parent = new Int32Array(n);
    this.rank = new Int32Array(n);
  }

  reset(): void {
    for (let i = 0; i < this.parent.length; i++) { this.parent[i] = i; this.rank[i] = 0; }
  }

  find(x: number): number {
    const p = this.parent;
    while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } // path halving
    return x;
  }

  union(a: number, b: number): void {
    const p = this.parent, r = this.rank;
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return;
    if (r[ra] < r[rb]) { const t = ra; ra = rb; rb = t; }
    p[rb] = ra;
    if (r[ra] === r[rb]) r[ra]++;
  }
}

// =========================================================================
// Dense Cholesky Solver (for symmetric positive-definite matrices)
// =========================================================================

/**
 * In-place Cholesky factorization: A = L·Lᵀ.
 * A is n×n row-major Float64Array (only lower triangle is read/written).
 * Returns false if the matrix is not positive definite.
 */
export function choleskyFactorize(A: Float64Array, n: number): boolean {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i * n + j];
      for (let k = 0; k < j; k++) sum -= A[i * n + k] * A[j * n + k];

      if (i === j) {
        if (sum <= 0) return false;
        A[i * n + j] = Math.sqrt(sum);
      } else {
        A[i * n + j] = sum / A[j * n + j];
      }
    }
  }
  return true;
}

/**
 * Solve L·Lᵀ·x = b where L comes from choleskyFactorize.
 * Result written directly into x (no scratch buffer needed).
 */
export function choleskySolve(
  L: Float64Array, b: Float64Array, x: Float64Array, n: number,
): void {
  // Forward substitution: L · y = b
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let j = 0; j < i; j++) sum -= L[i * n + j] * x[j];
    x[i] = sum / L[i * n + i];
  }

  // Backward substitution: Lᵀ · x = y
  for (let i = n - 1; i >= 0; i--) {
    let sum = x[i];
    for (let j = i + 1; j < n; j++) sum -= L[j * n + i] * x[j];
    x[i] = sum / L[i * n + i];
  }
}
