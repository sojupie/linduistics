/**
 * Classical Multidimensional Scaling (MDS / Principal Coordinate Analysis)
 * Projects an N x N pairwise distance matrix onto optimal 2D or 3D Euclidean coordinates.
 *
 * Distances between points on screen mathematically minimize squared strain against
 * actual pairwise linguistic distances.
 */

export interface MDSPoint {
  code: string;
  x: number;
  y: number;
  z: number;
}

/**
 * Computes Classical Multidimensional Scaling on a symmetric distance matrix.
 *
 * @param codes List of language codes
 * @param distMatrix Symmetric NxN distance matrix where distMatrix[i][j] is distance (0 to 1)
 * @returns Array of MDSPoint coordinates scaled to suitable screen coordinates
 */
export function classicalMDS(codes: string[], distMatrix: number[][]): MDSPoint[] {
  const n = codes.length;
  if (n === 0) return [];
  if (n === 1) return [{ code: codes[0], x: 0, y: 0, z: 0 }];

  // 1. Squared distance matrix D^2
  const d2: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const d = distMatrix[i][j];
      d2[i][j] = d * d;
    }
  }

  // 2. Double centering: B = -0.5 * H * D^2 * H
  // B_ij = -0.5 * (d2_ij - mean_row_i - mean_col_j + grand_mean)
  const rowMeans = new Array(n).fill(0);
  const colMeans = new Array(n).fill(0);
  let grandMean = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rowMeans[i] += d2[i][j];
      colMeans[j] += d2[i][j];
      grandMean += d2[i][j];
    }
    rowMeans[i] /= n;
  }
  for (let j = 0; j < n; j++) {
    colMeans[j] /= n;
  }
  grandMean /= (n * n);

  const B: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      B[i][j] = -0.5 * (d2[i][j] - rowMeans[i] - colMeans[j] + grandMean);
    }
  }

  // 3. Eigendecomposition of symmetric matrix B using Jacobi method
  const { values, vectors } = jacobiEigenvalue(B);

  // 4. Sort eigenvalues descending
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => values[b] - values[a]);

  const lambda1 = Math.max(0, values[indices[0]]);
  const lambda2 = n > 1 ? Math.max(0, values[indices[1]]) : 0;
  const lambda3 = n > 2 ? Math.max(0, values[indices[2]]) : 0;

  const s1 = Math.sqrt(lambda1);
  const s2 = Math.sqrt(lambda2);
  const s3 = Math.sqrt(lambda3);

  // 5. Initial Classical MDS coordinates
  let X: number[][] = codes.map((_, i) => [
    vectors[i][indices[0]] * s1,
    n > 1 ? vectors[i][indices[1]] * s2 : 0,
    n > 2 ? vectors[i][indices[2]] * s3 : 0,
  ]);

  const initialX = X.map((row) => [...row]);

  // 6. SMACOF (Stress Majorization) refinement to distribute strain evenly across 3D space
  if (n >= 3) {
    const smacofIterations = 30;
    for (let iter = 0; iter < smacofIterations; iter++) {
      const curDist: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          curDist[i][j] = Math.hypot(X[i][0] - X[j][0], X[i][1] - X[j][1], X[i][2] - X[j][2]);
        }
      }

      const BSmacof: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j && curDist[i][j] > 1e-6) {
            BSmacof[i][j] = -distMatrix[i][j] / curDist[i][j];
          }
        }
        let sum = 0;
        for (let j = 0; j < n; j++) {
          if (i !== j) sum += BSmacof[i][j];
        }
        BSmacof[i][i] = -sum;
      }

      const nextX: number[][] = Array.from({ length: n }, () => [0, 0, 0]);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          nextX[i][0] += BSmacof[i][j] * X[j][0];
          nextX[i][1] += BSmacof[i][j] * X[j][1];
          nextX[i][2] += BSmacof[i][j] * X[j][2];
        }
        nextX[i][0] /= n;
        nextX[i][1] /= n;
        nextX[i][2] /= n;
      }
      X = nextX;
    }

    // 7. Align 3D coordinates along principal axes so (x, y) yields the optimal 2D projection
    const C: number[][] = Array.from({ length: 3 }, () => [0, 0, 0]);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < n; k++) {
          C[i][j] += X[k][i] * X[k][j];
        }
      }
    }

    const { values: cValues, vectors: cVectors } = jacobiEigenvalue(C);
    const cIdx = [0, 1, 2].sort((a, b) => cValues[b] - cValues[a]);

    const rotatedX: number[][] = Array.from({ length: n }, (_, i) => [
      X[i][0] * cVectors[0][cIdx[0]] + X[i][1] * cVectors[1][cIdx[0]] + X[i][2] * cVectors[2][cIdx[0]],
      X[i][0] * cVectors[0][cIdx[1]] + X[i][1] * cVectors[1][cIdx[1]] + X[i][2] * cVectors[2][cIdx[1]],
      X[i][0] * cVectors[0][cIdx[2]] + X[i][1] * cVectors[1][cIdx[2]] + X[i][2] * cVectors[2][cIdx[2]],
    ]);

    // Preserve orientation signs relative to initial Classical MDS seed
    for (let dim = 0; dim < 3; dim++) {
      let dot = 0;
      for (let i = 0; i < n; i++) {
        dot += rotatedX[i][dim] * initialX[i][dim];
      }
      if (dot < 0) {
        for (let i = 0; i < n; i++) {
          rotatedX[i][dim] = -rotatedX[i][dim];
        }
      }
    }
    X = rotatedX;
  }

  // 8. Normalize and scale to canvas coordinate bounds (160px plot radius)
  let maxNorm = 0;
  for (let i = 0; i < n; i++) {
    const dist = Math.hypot(X[i][0], X[i][1], X[i][2]);
    if (dist > maxNorm) maxNorm = dist;
  }

  const scale = maxNorm > 0 ? 160 / maxNorm : 1;

  return codes.map((code, i) => ({
    code,
    x: X[i][0] * scale,
    y: X[i][1] * scale,
    z: X[i][2] * scale,
  }));
}

/**
 * Jacobi eigenvalue algorithm for real symmetric NxN matrix.
 */
function jacobiEigenvalue(matrix: number[][], maxIterations = 100): { values: number[]; vectors: number[][] } {
  const n = matrix.length;
  // Deep clone matrix
  const A = matrix.map((row) => [...row]);
  // Initialize V as identity matrix
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  for (let iter = 0; iter < maxIterations; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const absVal = Math.abs(A[i][j]);
        if (absVal > maxVal) {
          maxVal = absVal;
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < 1e-9) break;

    // Compute Jacobi rotation angle
    const app = A[p][p];
    const aqq = A[q][q];
    const apq = A[p][q];

    const theta = (aqq - app) / (2 * apq);
    const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;

    // Apply Givens rotation to A
    A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    A[p][q] = 0;
    A[q][p] = 0;

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const aip = A[i][p];
        const aiq = A[i][q];
        A[i][p] = c * aip - s * aiq;
        A[p][i] = A[i][p];
        A[i][q] = s * aip + c * aiq;
        A[q][i] = A[i][q];
      }
    }

    // Accumulate eigenvectors in V
    for (let i = 0; i < n; i++) {
      const vip = V[i][p];
      const viq = V[i][q];
      V[i][p] = c * vip - s * viq;
      V[i][q] = s * vip + c * viq;
    }
  }

  const values = Array.from({ length: n }, (_, i) => A[i][i]);
  return { values, vectors: V };
}
