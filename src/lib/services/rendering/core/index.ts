/**
 * src/services/rendering/core
 *
 * Barrel export for the WebGL2 infrastructure layer.
 *
 * Import order matches the typical dependency chain:
 *   WebGLContext → ShaderProgram / Texture → Framebuffer
 */
export { WebGLContext } from "./WebGLContext";
export { ShaderProgram } from "./ShaderProgram";
export { Texture } from "./Texture";
export type { TextureFilter, TextureWrap } from "./Texture";
export { Framebuffer } from "./Framebuffer";
