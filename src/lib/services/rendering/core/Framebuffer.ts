/**
 * Framebuffer
 *
 * Wraps a WebGL2 Framebuffer Object (FBO) backed by a `Texture` colour
 * attachment.  It is the standard mechanism for off-screen render passes:
 * bind the FBO, render into it, then read the result back via its `texture`.
 *
 * Design notes
 * ------------
 * - The `Texture` attachment is created internally by default so the sizes
 *   are always consistent, but you can also supply a pre-built `Texture` for
 *   cases where you want to share a texture between framebuffers.
 * - `ownsTexture` tracks whether this Framebuffer should delete the colour
 *   attachment texture when `dispose()` is called.  When you pass a texture
 *   in manually, ownership stays with the caller.
 * - No depth/stencil attachment is created; image-processing passes don't
 *   need depth testing.
 *
 * Usage
 * -----
 *   const fbo = Framebuffer.create(ctx, width, height);
 *   fbo.bind();
 *   ctx.setViewport(fbo.width, fbo.height);
 *   // … render pass …
 *   fbo.unbind();
 *   // Read result via fbo.texture
 *   fbo.dispose();   // deletes both FBO and its texture
 */
import { Texture } from "./Texture";
import type { WebGLContext } from "./WebGLContext";

export class Framebuffer {
  private readonly gl: WebGL2RenderingContext;
  readonly framebuffer: WebGLFramebuffer;

  /** The colour attachment texture.  Read-only outside this class. */
  readonly texture: Texture;

  readonly width: number;
  readonly height: number;

  /**
   * Whether this Framebuffer owns its texture attachment and should
   * delete it on `dispose()`.
   */
  private readonly ownsTexture: boolean;

  private constructor(
    gl: WebGL2RenderingContext,
    framebuffer: WebGLFramebuffer,
    texture: Texture,
    ownsTexture: boolean
  ) {
    this.gl = gl;
    this.framebuffer = framebuffer;
    this.texture = texture;
    this.width = texture.width;
    this.height = texture.height;
    this.ownsTexture = ownsTexture;
  }

  /**
   * Create a Framebuffer with an automatically allocated `Texture` colour
   * attachment of `width × height` RGBA8 pixels.
   *
   * @throws If the framebuffer is incomplete after creation.
   */
  static create(ctx: WebGLContext, width: number, height: number): Framebuffer {
    const texture = Texture.empty(ctx, width, height);
    return Framebuffer.fromTexture(ctx, texture, /* ownsTexture */ true);
  }

  /**
   * Create a Framebuffer that uses an existing `Texture` as its colour
   * attachment.  The caller retains ownership of the texture; `dispose()`
   * will **not** delete it.
   *
   * @throws If the framebuffer is incomplete after creation.
   */
  static fromTexture(
    ctx: WebGLContext,
    texture: Texture,
    ownsTexture = false
  ): Framebuffer {
    const { gl } = ctx;

    const fbo = gl.createFramebuffer();
    if (!fbo) {
      throw new Error(
        "Failed to create WebGLFramebuffer — context may be lost."
      );
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture.texture,
      /* mip level */ 0
    );

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(fbo);
      throw new Error(
        `Framebuffer is incomplete: ${Framebuffer.statusLabel(gl, status)}`
      );
    }

    return new Framebuffer(gl, fbo, texture, ownsTexture);
  }

  /**
   * Bind this FBO as the current draw target.
   *
   * Remember to call `ctx.setViewport(fbo.width, fbo.height)` after binding
   * if the FBO dimensions differ from the canvas size.
   */
  bind(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
  }

  /**
   * Restore the default framebuffer (the canvas back-buffer).
   */
  unbind(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  /**
   * Read pixels from this framebuffer into a `Uint8Array`.
   *
   * The FBO must be bound before calling this method.
   *
   * @param x       Left edge (default 0).
   * @param y       Bottom edge (default 0, WebGL origin is bottom-left).
   * @param width   Region width (default: full width).
   * @param height  Region height (default: full height).
   */
  readPixels(
    x = 0,
    y = 0,
    width = this.width,
    height = this.height
  ): Uint8Array {
    const { gl } = this;
    const buffer = new Uint8Array(width * height * 4);
    gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
    return buffer;
  }

  /**
   * Delete the underlying WebGLFramebuffer.  If this instance owns its texture
   * attachment, that is deleted too.  Do not use this instance afterwards.
   */
  dispose(): void {
    this.gl.deleteFramebuffer(this.framebuffer);
    if (this.ownsTexture) {
      this.texture.dispose();
    }
  }

  private static statusLabel(
    gl: WebGL2RenderingContext,
    status: number
  ): string {
    switch (status) {
      case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        return "FRAMEBUFFER_INCOMPLETE_ATTACHMENT";
      case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        return "FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";
      case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        return "FRAMEBUFFER_INCOMPLETE_DIMENSIONS";
      case gl.FRAMEBUFFER_UNSUPPORTED:
        return "FRAMEBUFFER_UNSUPPORTED";
      case gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:
        return "FRAMEBUFFER_INCOMPLETE_MULTISAMPLE";
      default:
        return `0x${status.toString(16)}`;
    }
  }
}
