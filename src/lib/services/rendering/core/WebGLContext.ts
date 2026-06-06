/**
 * WebGLContext
 *
 * Wraps a WebGL2RenderingContext obtained from either an HTMLCanvasElement or an
 * OffscreenCanvas.  All other core objects (ShaderProgram, Texture, Framebuffer)
 * accept a WebGLContext so they never have to reach outside for the raw `gl`.
 *
 * Usage
 * -----
 *   const ctx = WebGLContext.fromCanvas(canvas);
 *   // … build shaders, textures, framebuffers …
 *   ctx.dispose();   // tears down the context when you are done with it
 */
export class WebGLContext {
  /** The underlying WebGL2 context.  Treat as read-only outside this class. */
  readonly gl: WebGL2RenderingContext;

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Create a WebGLContext from an HTMLCanvasElement.
   *
   * @param canvas  The canvas element to obtain a context from.
   * @param options Optional WebGL2 context attributes (e.g. `{ alpha: false }`).
   * @throws        If WebGL2 is not supported or context creation fails.
   */
  static fromCanvas(
    canvas: HTMLCanvasElement,
    options?: WebGLContextAttributes
  ): WebGLContext {
    return WebGLContext.createFromSource(canvas, options);
  }

  /**
   * Create a WebGLContext from an OffscreenCanvas (e.g. inside a Worker).
   *
   * @param canvas  The offscreen canvas.
   * @param options Optional WebGL2 context attributes.
   * @throws        If WebGL2 is not supported or context creation fails.
   */
  static fromOffscreenCanvas(
    canvas: OffscreenCanvas,
    options?: WebGLContextAttributes
  ): WebGLContext {
    return WebGLContext.createFromSource(canvas, options);
  }

  private static createFromSource(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    options?: WebGLContextAttributes
  ): WebGLContext {
    const gl = canvas.getContext(
      "webgl2",
      options
    ) as WebGL2RenderingContext | null;

    if (!gl) {
      throw new Error(
        "WebGL2 is not supported in this environment, or context creation failed."
      );
    }

    return new WebGLContext(gl);
  }

  /**
   * Set the WebGL viewport to match the canvas's current logical dimensions.
   * Call this after resizing the canvas.
   */
  fitViewport(): void {
    const { gl } = this;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  /**
   * Set the WebGL viewport to an explicit size.
   * Useful when rendering into a Framebuffer whose dimensions differ from the canvas.
   */
  setViewport(width: number, height: number): void {
    this.gl.viewport(0, 0, width, height);
  }

  /**
   * Clear the currently bound framebuffer with the given colour (default: transparent black).
   */
  clear(r = 0, g = 0, b = 0, a = 0): void {
    const { gl } = this;
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * Lose the WebGL context and release GPU resources.
   *
   * After calling `dispose()` this instance must not be used again.
   */
  dispose(): void {
    const ext = this.gl.getExtension("WEBGL_lose_context");
    ext?.loseContext();
  }
}
