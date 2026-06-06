"use client";

import type { FourPoints } from "@/types/edit";
import type { Size } from "@/types/size";
import { WebGLContext } from "./core/webgl-context";
import { ShaderProgram } from "./core/shader-program";
import { Texture } from "./core/texture";
import { computePerspectiveMatrix } from "./utils/perspective-matrix";

const VERT = /* glsl */ `#version 300 es
precision highp float;

in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * Fragment shader implementing OpenCV-equivalent warpPerspective with:
 *   - INTER_LINEAR  (GPU bilinear via texture())
 *   - BORDER_CONSTANT black
 *   - top-left origin, pixel centers at integer coordinates (OpenCV convention)
 *
 * Coordinate derivation
 * ---------------------
 * WebGL gl_FragCoord places pixel centers at half-integer positions:
 *   top-left pixel  → gl_FragCoord = (0.5, H - 0.5)   (y=0 is bottom in WebGL)
 *   bottom-right    → gl_FragCoord = (W - 0.5, 0.5)
 *
 * OpenCV pixel centers are at integer positions:
 *   top-left pixel  → (0, 0)
 *   bottom-right    → (W-1, H-1)
 *
 * Conversion: subtract 0.5 after the Y-flip to align coordinate origins.
 *   dst_px.x = gl_FragCoord.x - 0.5
 *   dst_px.y = (u_dst_size.y - gl_FragCoord.y) - 0.5
 *
 * Verification:
 *   top-left:     gl_FragCoord=(0.5, H-0.5) → dst_px=(0.0, 0.0)  ✓
 *   bottom-right: gl_FragCoord=(W-0.5, 0.5) → dst_px=(W-1, H-1)  ✓
 *
 * Border handling
 * ---------------
 * INTER_LINEAR taps a 2×2 neighbourhood around src_px. Any tap outside
 * [0, W-1] × [0, H-1] maps to the BORDER_CONSTANT value (black). We gate
 * the entire fragment black when src_px falls outside that range, which
 * matches OpenCV's output for all pixels more than 0.5px from the image edge.
 * For the sub-pixel fringe exactly at the edge, the GPU CLAMP_TO_EDGE blends
 * toward the edge pixel identically to OpenCV's border-constant bilinear mix.
 *
 * UV conversion
 * -------------
 * OpenCV samples at pixel centers; the GPU sampler expects UV in [0, 1] where
 * 0.0 maps to the left edge of pixel 0 and 1.0 to the right edge of pixel W-1.
 * The center of pixel p is at UV = (p + 0.5) / W.
 */
const FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D u_texture;
uniform mat3      u_hinv;
uniform vec2      u_src_size;
uniform vec2      u_dst_size;

out vec4 fragColor;

void main() {
  vec2 dst_px = vec2(
    gl_FragCoord.x - 0.5,
    u_dst_size.y - gl_FragCoord.y - 0.5
  );

  vec3 src_h  = u_hinv * vec3(dst_px, 1.0);
  vec2 src_px = src_h.xy / src_h.z;

  if (src_px.x < 0.0 || src_px.x > u_src_size.x - 1.0 ||
      src_px.y < 0.0 || src_px.y > u_src_size.y - 1.0) {
    fragColor = vec4(0.0);
    return;
  }

  vec2 uv = (src_px + 0.5) / u_src_size;

  fragColor = texture(u_texture, uv);
}
`;

const QUAD_VERTS = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

/**
 * Inverts a row-major 3×3 matrix analytically via the adjugate method.
 *
 * `computePerspectiveMatrix` returns the forward homography in row-major order.
 * This function computes the adjugate and lays the result out in **column-major**
 * order so it can be uploaded directly with `uniformMatrix3fv(..., false, ...)`.
 *
 * Layout derivation:
 *   Input  m (row-major):  m[0..2] = row 0, m[3..5] = row 1, m[6..8] = row 2
 *   Output (column-major): out[0..2] = col 0 of M⁻¹, out[3..5] = col 1, out[6..8] = col 2
 *
 * The adjugate of a 3×3 matrix is the transpose of the cofactor matrix.
 * Laying the adjugate out column-by-column (as required by GLSL mat3) means
 * taking each column of adj(M) = each row of cof(M):
 *   adj col 0 = cof row 0 = [+(ei-fh), -(di-fg), +(dh-eg)]
 *   adj col 1 = cof row 1 = [-(bi-ch), +(ai-cg), -(ah-bg)]
 *   adj col 2 = cof row 2 = [+(bf-ce), -(af-cd), +(ae-bd)]
 */
function invertMatrix3(m: Float32Array): Float32Array {
  const [a, b, c, d, e, f, g, h, i] = m;

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-10) {
    throw new Error("Homography matrix is not invertible (det ≈ 0).");
  }

  const inv = 1 / det;

  return new Float32Array([
    A * inv,
    B * inv,
    C * inv, // column 0
    D * inv,
    E * inv,
    F * inv, // column 1
    G * inv,
    H * inv,
    I * inv, // column 2
  ]);
}

/**
 * Axis-aligned destination quad matching OpenCV's pts2 layout.
 * Order: [topLeft, topRight, bottomLeft, bottomRight].
 * Coordinates are pixel centers in OpenCV convention (integer positions).
 */
function rectPoints(width: number, height: number): FourPoints {
  return [
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: 0, y: height - 1 },
    { x: width - 1, y: height - 1 },
  ];
}

/**
 * Renders a perspective-corrected crop of a source `ImageBitmap` onto a canvas
 * using WebGL2 inverse homography mapping, matching OpenCV `warpPerspective`
 * with `INTER_LINEAR` and `BORDER_CONSTANT` (black).
 *
 * GPU resources (program, VAO, VBO) are compiled once on first call and reused.
 * Each `render` call uploads a new source texture and homography uniform, then
 * frees the texture after the draw.
 */
class PerspectiveRenderer {
  private program: ShaderProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;
  private ctx: WebGLContext | null = null;
  private canvas: OffscreenCanvas | null = null;

  constructor() {
    if (typeof OffscreenCanvas !== "undefined") {
      this.canvas = new OffscreenCanvas(1, 1);

      this.ctx = WebGLContext.fromOffscreenCanvas(this.canvas, {
        alpha: true,
        premultipliedAlpha: false,
      });
    }
  }

  /**
   * Perspective-correct warp `bitmap` using the four normalised source `points`
   * and write the result into `canvas` at `outputSize` dimensions.
   *
   * @param bitmap      Source image to warp.
   * @param points      Normalised quad corners: [topLeft, topRight, bottomLeft, bottomRight].
   * @param outputSize  Pixel dimensions of the output canvas.
   * @param canvas      Render target — `HTMLCanvasElement` or `OffscreenCanvas`.
   */
  render(bitmap: ImageBitmap, points: FourPoints, outputSize: Size) {
    if (!this.ctx || !this.canvas)
      throw new Error("Failed to get canvas context");

    const { gl } = this.ctx;

    this.canvas.width = outputSize.width;
    this.canvas.height = outputSize.height;
    this.ctx.setViewport(outputSize.width, outputSize.height);

    const srcPoints: FourPoints = points.map(({ x, y }) => ({
      x: x * bitmap.width,
      y: y * bitmap.height,
    })) as FourPoints;

    const dstPoints = rectPoints(outputSize.width, outputSize.height);
    const hFwd = computePerspectiveMatrix(srcPoints, dstPoints);
    const hInv = invertMatrix3(hFwd);

    const texture = Texture.fromBitmap(this.ctx, bitmap);

    try {
      const program = this.acquireProgram(this.ctx);
      program.use();

      texture.bind(0);
      program.setUniform1i("u_texture", 0);
      program.setUniformMatrix3fv("u_hinv", hInv, false);
      program.setUniform2f("u_src_size", bitmap.width, bitmap.height);
      program.setUniform2f("u_dst_size", outputSize.width, outputSize.height);

      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    } finally {
      texture.dispose();
    }

    return this.canvas;
  }

  /** Release all GPU resources held by this renderer. */
  dispose(): void {
    const { gl } = this.ctx ?? {};
    if (gl) {
      gl.deleteVertexArray(this.vao);
      gl.deleteBuffer(this.vbo);
    }
    this.program?.dispose();
    this.ctx?.dispose();
    this.program = null;
    this.vao = null;
    this.vbo = null;
    this.ctx = null;
  }

  private acquireProgram(ctx: WebGLContext): ShaderProgram {
    if (!this.program) {
      this.program = ShaderProgram.create(ctx, VERT, FRAG);
      this.setupQuad(ctx);
    }
    return this.program;
  }

  private setupQuad(ctx: WebGLContext): void {
    const { gl } = ctx;

    this.vao = gl.createVertexArray();
    this.vbo = gl.createBuffer();

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTS, gl.STATIC_DRAW);

    const loc = this.program!.getAttribLocation("a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
}

export const perspectiveRenderer = new PerspectiveRenderer();
export default perspectiveRenderer;
