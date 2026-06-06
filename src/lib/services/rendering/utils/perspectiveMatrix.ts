import type { FourPoints } from "@/types/edit";

/**
 * Compute the 3×3 homography matrix mapping `source` points to `destination`
 * points, both in pixel space.
 *
 * Points must follow the FourPoints convention: [topLeft, topRight, bottomLeft,
 * bottomRight]. For normalised input, denormalise to pixel coordinates before
 * calling (multiply x by image width, y by image height) — matching
 * TransformService.applyWarp.
 *
 * Returns a row-major Float32Array of length 9:
 *   [ h00 h01 h02 ]
 *   [ h10 h11 h12 ]
 *   [ h20 h21 h22 ]
 *
 * Apply as: [X', Y', W']ᵀ = H · [x, y, 1]ᵀ  →  X = X'/W', Y = Y'/W'
 *
 * Algorithm: Direct Linear Transform (DLT). Each correspondence contributes
 * two rows to an 8×8 system (h22 = 1 removes the scale ambiguity). Solved
 * with Gaussian elimination and partial pivoting.
 */
export function computePerspectiveMatrix(
  source: FourPoints,
  destination: FourPoints
): Float32Array {
  const A = new Float64Array(64);
  const b = new Float64Array(8);

  for (let i = 0; i < 4; i++) {
    const { x, y } = source[i];
    const { x: X, y: Y } = destination[i];

    const r0 = i * 16;
    A[r0 + 0] = -x;
    A[r0 + 1] = -y;
    A[r0 + 2] = -1;
    A[r0 + 3] = 0;
    A[r0 + 4] = 0;
    A[r0 + 5] = 0;
    A[r0 + 6] = x * X;
    A[r0 + 7] = y * X;
    b[i * 2] = -X;

    const r1 = r0 + 8;
    A[r1 + 0] = 0;
    A[r1 + 1] = 0;
    A[r1 + 2] = 0;
    A[r1 + 3] = -x;
    A[r1 + 4] = -y;
    A[r1 + 5] = -1;
    A[r1 + 6] = x * Y;
    A[r1 + 7] = y * Y;
    b[i * 2 + 1] = -Y;
  }

  solveInPlace(A, b, 8);

  return new Float32Array([b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], 1]);
}

/**
 * Solve A·x = b in-place via Gaussian elimination with partial pivoting.
 * On return, b contains the solution. A is destroyed.
 * Throws if the system is singular (degenerate point configuration).
 */
function solveInPlace(A: Float64Array, b: Float64Array, n: number): void {
  for (let col = 0; col < n; col++) {
    let maxVal = Math.abs(A[col * n + col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(A[row * n + col]);
      if (v > maxVal) {
        maxVal = v;
        maxRow = row;
      }
    }

    if (maxVal < 1e-10) {
      throw new Error(
        `Homography system is singular at column ${col}. ` +
          "Verify no three source or destination points are collinear."
      );
    }

    if (maxRow !== col) {
      for (let k = col; k < n; k++) {
        const tmp = A[col * n + k];
        A[col * n + k] = A[maxRow * n + k];
        A[maxRow * n + k] = tmp;
      }
      const tmp = b[col];
      b[col] = b[maxRow];
      b[maxRow] = tmp;
    }

    const pivotInv = 1 / A[col * n + col];
    for (let row = col + 1; row < n; row++) {
      const factor = A[row * n + col] * pivotInv;
      if (factor === 0) continue;
      b[row] -= factor * b[col];
      for (let k = col; k < n; k++) {
        A[row * n + k] -= factor * A[col * n + k];
      }
    }
  }

  for (let row = n - 1; row >= 0; row--) {
    for (let k = row + 1; k < n; k++) {
      b[row] -= A[row * n + k] * b[k];
    }
    b[row] /= A[row * n + row];
  }
}
