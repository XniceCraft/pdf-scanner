/**
 * Texture
 *
 * Wraps a WebGL2 2-D RGBA texture.  Two construction paths are provided:
 *
 *  - `Texture.fromBitmap`  — uploads pixel data from an ImageBitmap in one call.
 *  - `Texture.empty`       — allocates a blank texture of a given size (used as
 *                            a Framebuffer attachment).
 *
 * Filtering and wrapping defaults are chosen to work well for full-image
 * processing (linear filtering, clamp-to-edge), but can be overridden via
 * `setFilter` / `setWrap`.
 *
 * Usage
 * -----
 *   const tex = Texture.fromBitmap(ctx, bitmap);
 *   tex.bind(0);                 // bind to texture unit 0
 *   program.setUniform1i("u_texture", 0);
 *   // … draw …
 *   tex.dispose();
 */
import type { WebGLContext } from "./WebGLContext";

export type TextureFilter = "linear" | "nearest";
export type TextureWrap = "clamp" | "repeat" | "mirror";

export class Texture {
  private readonly gl: WebGL2RenderingContext;
  readonly texture: WebGLTexture;
  readonly width: number;
  readonly height: number;

  private constructor(
    gl: WebGL2RenderingContext,
    texture: WebGLTexture,
    width: number,
    height: number
  ) {
    this.gl = gl;
    this.texture = texture;
    this.width = width;
    this.height = height;
  }

  /**
   * Upload an ImageBitmap to a new RGBA8 texture.
   *
   * The bitmap is uploaded with `texImage2D` using `RGBA` / `UNSIGNED_BYTE`.
   * Mipmaps are NOT generated; filtering defaults to `linear` / `clamp`.
   *
   * @param ctx     The WebGLContext to create the texture in.
   * @param bitmap  Source image data.
   * @param filter  Minification / magnification filter (default: `"linear"`).
   */
  static fromBitmap(
    ctx: WebGLContext,
    bitmap: ImageBitmap,
    filter: TextureFilter = "linear"
  ): Texture {
    const { gl } = ctx;
    const tex = Texture.allocate(gl);

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      /* level     */ 0,
      /* internalFormat */ gl.RGBA8,
      /* format    */ gl.RGBA,
      /* type      */ gl.UNSIGNED_BYTE,
      bitmap
    );

    Texture.applyParams(gl, filter, "clamp");
    gl.bindTexture(gl.TEXTURE_2D, null);

    return new Texture(gl, tex, bitmap.width, bitmap.height);
  }

  /**
   * Allocate an uninitialised RGBA8 texture of `width × height` pixels.
   * Intended for use as a Framebuffer colour attachment.
   *
   * @param ctx    The WebGLContext to create the texture in.
   * @param width  Texture width in pixels.
   * @param height Texture height in pixels.
   * @param filter Minification / magnification filter (default: `"linear"`).
   */
  static empty(
    ctx: WebGLContext,
    width: number,
    height: number,
    filter: TextureFilter = "linear"
  ): Texture {
    const { gl } = ctx;
    const tex = Texture.allocate(gl);

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      /* level     */ 0,
      /* internalFormat */ gl.RGBA8,
      width,
      height,
      /* border    */ 0,
      /* format    */ gl.RGBA,
      /* type      */ gl.UNSIGNED_BYTE,
      /* pixels    */ null
    );

    Texture.applyParams(gl, filter, "clamp");
    gl.bindTexture(gl.TEXTURE_2D, null);

    return new Texture(gl, tex, width, height);
  }

  /**
   * Bind this texture to the given texture unit.
   *
   * @param unit  Texture unit index (0–31 for most devices).
   */
  bind(unit = 0): void {
    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
  }

  /** Unbind the texture from the given unit. */
  unbind(unit = 0): void {
    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * Update the min / mag filter of the currently bound texture.
   * You must call `bind()` before calling this method.
   */
  setFilter(filter: TextureFilter): void {
    const { gl } = this;
    const glFilter = filter === "nearest" ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter);
  }

  /**
   * Update the S/T wrap mode of the currently bound texture.
   * You must call `bind()` before calling this method.
   */
  setWrap(wrap: TextureWrap): void {
    const { gl } = this;
    const glWrap =
      wrap === "repeat"
        ? gl.REPEAT
        : wrap === "mirror"
          ? gl.MIRRORED_REPEAT
          : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, glWrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, glWrap);
  }

  /** Delete the underlying WebGLTexture.  Do not use this instance afterwards. */
  dispose(): void {
    this.gl.deleteTexture(this.texture);
  }

  private static allocate(gl: WebGL2RenderingContext): WebGLTexture {
    const tex = gl.createTexture();
    if (!tex) {
      throw new Error("Failed to create WebGLTexture — context may be lost.");
    }
    return tex;
  }

  private static applyParams(
    gl: WebGL2RenderingContext,
    filter: TextureFilter,
    wrap: TextureWrap
  ): void {
    const glFilter = filter === "nearest" ? gl.NEAREST : gl.LINEAR;
    const glWrap =
      wrap === "repeat"
        ? gl.REPEAT
        : wrap === "mirror"
          ? gl.MIRRORED_REPEAT
          : gl.CLAMP_TO_EDGE;

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, glWrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, glWrap);
  }
}
