/**
 * ShaderProgram
 *
 * Compiles a vertex shader and a fragment shader, links them into a
 * WebGLProgram, and exposes helpers for looking up uniform / attribute
 * locations.
 *
 * Design notes
 * ------------
 * - Compilation and linking errors surface as exceptions with the full GLSL
 *   info log attached, so failures are visible immediately during development.
 * - Uniform and attribute lookups are cached after the first call so subsequent
 *   uses (e.g. per-frame uploads) incur no driver round-trips.
 * - The program is cleaned up together with its intermediate shader objects;
 *   call `dispose()` when the program is no longer needed.
 *
 * Usage
 * -----
 *   const program = ShaderProgram.create(ctx, vertSrc, fragSrc);
 *   program.use();
 *   program.setUniform1i("u_texture", 0);
 *   // … draw calls …
 *   program.dispose();
 */
import type { WebGLContext } from "./WebGLContext";

export class ShaderProgram {
  private readonly gl: WebGL2RenderingContext;
  readonly program: WebGLProgram;

  /** Cached uniform locations — populated lazily. */
  private readonly uniformCache = new Map<
    string,
    WebGLUniformLocation | null
  >();
  /** Cached attribute locations — populated lazily. */
  private readonly attribCache = new Map<string, number>();

  private constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
    this.gl = gl;
    this.program = program;
  }

  /**
   * Compile `vertexSource` and `fragmentSource`, link them, and return a
   * ready-to-use ShaderProgram.
   *
   * @throws If either shader fails to compile or the program fails to link.
   */
  static create(
    ctx: WebGLContext,
    vertexSource: string,
    fragmentSource: string
  ): ShaderProgram {
    const { gl } = ctx;

    const vert = ShaderProgram.compileShader(
      gl,
      gl.VERTEX_SHADER,
      vertexSource
    );
    const frag = ShaderProgram.compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentSource
    );

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      throw new Error("Failed to create WebGLProgram.");
    }

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    gl.detachShader(program, vert);
    gl.detachShader(program, frag);
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? "(no info log)";
      gl.deleteProgram(program);
      throw new Error(`Shader program link error:\n${log}`);
    }

    return new ShaderProgram(gl, program);
  }

  /** Bind this program as the active program. */
  use(): void {
    this.gl.useProgram(this.program);
  }

  /**
   * Look up a uniform location by name (cached).
   * Returns `null` if the uniform is not present or has been optimised away.
   */
  getUniformLocation(name: string): WebGLUniformLocation | null {
    if (!this.uniformCache.has(name)) {
      this.uniformCache.set(
        name,
        this.gl.getUniformLocation(this.program, name)
      );
    }
    return this.uniformCache.get(name)!;
  }

  setUniform1i(name: string, value: number): void {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniform1i(loc, value);
  }

  setUniform1f(name: string, value: number): void {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniform1f(loc, value);
  }

  setUniform2f(name: string, x: number, y: number): void {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniform2f(loc, x, y);
  }

  setUniform3f(name: string, x: number, y: number, z: number): void {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniform3f(loc, x, y, z);
  }

  setUniform4f(name: string, x: number, y: number, z: number, w: number): void {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniform4f(loc, x, y, z, w);
  }

  setUniformMatrix3fv(
    name: string,
    value: Float32Array,
    transpose = false
  ): void {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniformMatrix3fv(loc, transpose, value);
  }

  setUniformMatrix4fv(
    name: string,
    value: Float32Array,
    transpose = false
  ): void {
    const loc = this.getUniformLocation(name);
    if (loc !== null) this.gl.uniformMatrix4fv(loc, transpose, value);
  }

  /**
   * Look up an attribute location by name (cached).
   * Returns `-1` if the attribute is not present.
   */
  getAttribLocation(name: string): number {
    if (!this.attribCache.has(name)) {
      this.attribCache.set(name, this.gl.getAttribLocation(this.program, name));
    }
    return this.attribCache.get(name)!;
  }

  /** Delete the underlying WebGLProgram.  Do not use this instance afterwards. */
  dispose(): void {
    this.gl.deleteProgram(this.program);
    this.uniformCache.clear();
    this.attribCache.clear();
  }

  private static compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string
  ): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error(
        `Failed to create shader of type ${type === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT"}.`
      );
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? "(no info log)";
      gl.deleteShader(shader);
      const typeName = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
      throw new Error(`${typeName} shader compile error:\n${log}`);
    }

    return shader;
  }
}
