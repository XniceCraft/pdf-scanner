/**
 * src/services/rendering/core
 *
 * Barrel export for the WebGL2 infrastructure layer.
 *
 * Import order matches the typical dependency chain:
 *   WebGLContext → ShaderProgram / Texture → Framebuffer
 */
export { WebGLContext } from "./webgl-context";
export { ShaderProgram } from "./shader-program";
export { Texture } from "./texture";
export { Framebuffer } from "./framebuffer";

export type { TextureFilter, TextureWrap } from "./texture";
