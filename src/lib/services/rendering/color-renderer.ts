import type { Edit } from "@/types/edit";

const MAX_COLOR_SHIFT = 25;
const MAX_BRIGHTNESS = 100;
const MAX_TONE_SHIFT = 80;
const MAX_POINT_SHIFT = 50;
const MAX_CONTRAST_C = 127;

const VERTEX_SHADER_SRC = /* glsl */ `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const FRAGMENT_SHADER_SRC = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D u_image;

uniform float u_brightness;
uniform float u_contrastFactor;
uniform float u_black;
uniform float u_white;
uniform float u_shadow;
uniform float u_highlight;
uniform float u_temperature;
uniform float u_tint;
uniform bool u_noShadow;

in vec2 v_texCoord;
out vec4 fragColor;

vec3 rgbToLab(vec3 rgb) {
  vec3 linear = mix(
    rgb / 12.92,
    pow((rgb + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, rgb)
  );

  mat3 toXYZ = mat3(
    0.4124564, 0.2126729, 0.0193339,
    0.3575761, 0.7151522, 0.1191920,
    0.1804375, 0.0721750, 0.9503041
  );
  vec3 xyz = toXYZ * linear;

  vec3 d65 = vec3(0.95047, 1.00000, 1.08883);
  vec3 f = xyz / d65;
  vec3 fc = mix(
    7.787 * f + 16.0 / 116.0,
    pow(f, vec3(1.0 / 3.0)),
    step(0.008856, f)
  );

  return vec3(
    116.0 * fc.y - 16.0,
    500.0 * (fc.x - fc.y),
    200.0 * (fc.y - fc.z)
  );
}

vec3 labToRgb(vec3 lab) {
  float fy = (lab.x + 16.0) / 116.0;
  float fx = lab.y / 500.0 + fy;
  float fz = fy - lab.z / 200.0;

  vec3 f = vec3(fx, fy, fz);
  vec3 xyz = mix(
    (f - 16.0 / 116.0) / 7.787,
    f * f * f,
    step(0.206897, f)
  );

  vec3 d65 = vec3(0.95047, 1.00000, 1.08883);
  xyz *= d65;

  mat3 toRGB = mat3(
     3.2404542, -0.9692660,  0.0556434,
    -1.5371385,  1.8760108, -0.2040259,
    -0.4985314,  0.0415560,  1.0572252
  );
  vec3 linear = toRGB * xyz;

  return mix(
    12.92 * linear,
    1.055 * pow(max(linear, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, linear)
  );
}

float applyLuminanceCurve(float v255) {
  float t = v255 / 255.0;

  float out255 = v255;

  if (!u_noShadow) {
    out255 += u_black    * (1.0 - t);
    out255 += u_white    * t;
    out255 += u_shadow   * (1.0 - t) * (1.0 - t);
    out255 += u_highlight * t * t;
  }

  out255 += u_brightness;
  out255  = u_contrastFactor * (out255 - 128.0) + 128.0;

  return clamp(out255, 0.0, 255.0);
}

void main() {
  vec4 rgba = texture(u_image, v_texCoord);
  vec3 rgb = rgba.rgb;

  vec3 lab = rgbToLab(rgb);

  float L_255 = lab.x * (255.0 / 100.0);
  L_255 = applyLuminanceCurve(L_255);
  lab.x = L_255 * (100.0 / 255.0);

  if (!u_noShadow) {
    lab.z += u_temperature;
    lab.y += u_tint;
  }

  vec3 result = clamp(labToRgb(lab), 0.0, 1.0);
  fragColor = vec4(result, rgba.a);
}
`;

/**
 * Compiles a GLSL shader of the given type and returns it.
 */
function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log}`);
  }

  return shader;
}

/**
 * Links a WebGL program from a compiled vertex and fragment shader.
 */
function linkProgram(
  gl: WebGL2RenderingContext,
  vs: WebGLShader,
  fs: WebGLShader
): WebGLProgram {
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${log}`);
  }

  return program;
}

interface GpuResources {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  posBuf: WebGLBuffer;
  texBuf: WebGLBuffer;
  texture: WebGLTexture;
}

/**
 * Derives the scalar uniform values that mirror the LUT math in
 * `TransformService` but expressed as pre-scaled floats suitable for the
 * fragment shader.
 */
function deriveUniforms(edit: Edit) {
  const noShadow = edit.preset === "no-shadow";

  const { brightness, contrast } = edit;
  const black = noShadow ? 0 : edit.black;
  const white = noShadow ? 0 : edit.white;
  const shadow = noShadow ? 0 : edit.shadow;
  const highlight = noShadow ? 0 : edit.highlight;
  const temperature = noShadow ? 0 : edit.temperature;
  const tint = noShadow ? 0 : edit.tint;

  const c = (contrast / 100) * MAX_CONTRAST_C;
  const contrastFactor = (259 * (c + 255)) / (255 * (259 - c));

  return {
    brightness: (brightness / 100) * MAX_BRIGHTNESS,
    contrastFactor,
    black: (black / 100) * MAX_POINT_SHIFT,
    white: (white / 100) * MAX_POINT_SHIFT,
    shadow: (shadow / 100) * MAX_TONE_SHIFT,
    highlight: (highlight / 100) * MAX_TONE_SHIFT,
    temperature: (temperature / 100) * MAX_COLOR_SHIFT * (100 / 255),
    tint: (tint / 100) * MAX_COLOR_SHIFT * (100 / 255),
    noShadow,
  };
}

/**
 * Shader-based image colour renderer.
 *
 * Accepts an {@link ImageBitmap} and an {@link Edit} descriptor and renders
 * the colour-corrected result into a caller-supplied `HTMLCanvasElement` using
 * a single WebGL2 full-screen-quad draw call.
 *
 * Supported adjustments:
 * - brightness, contrast
 * - black point, white point, shadow, highlight
 * - temperature, tint (Lab b* / a* shift)
 *
 * The renderer is stateless: every call to {@link render} is self-contained.
 * WebGL resources are created and immediately released after each render to
 * avoid GPU memory leaks on canvases that are discarded between frames.
 */
class ColorRenderer {
  /**
   * Renders colour-corrected `bitmap` into `canvas` according to `edit`.
   *
   * The canvas dimensions are set to match the bitmap. Any existing canvas
   * content is discarded.
   *
   * @throws If the browser does not support WebGL2 or a shader fails to compile.
   */
  render(bitmap: ImageBitmap, canvas: HTMLCanvasElement, edit: Edit): void {
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const resources = this.initGpu(canvas, bitmap);

    try {
      this.draw(resources, edit, bitmap.width, bitmap.height);
    } finally {
      this.releaseGpu(resources);
    }
  }

  private initGpu(
    canvas: HTMLCanvasElement,
    bitmap: ImageBitmap
  ): GpuResources {
    const gl = canvas.getContext("webgl2", {
      premultipliedAlpha: false,
    }) as WebGL2RenderingContext | null;
    if (!gl) throw new Error("WebGL2 is not supported in this environment.");

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    const program = linkProgram(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);

    const posBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    const texLoc = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return { gl, program, vao, posBuf, texBuf, texture };
  }

  private draw(
    { gl, program, vao, texture }: GpuResources,
    edit: Edit,
    width: number,
    height: number
  ): void {
    const u = deriveUniforms(edit);

    gl.viewport(0, 0, width, height);
    gl.useProgram(program);

    gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
    gl.uniform1f(gl.getUniformLocation(program, "u_brightness"), u.brightness);
    gl.uniform1f(
      gl.getUniformLocation(program, "u_contrastFactor"),
      u.contrastFactor
    );
    gl.uniform1f(gl.getUniformLocation(program, "u_black"), u.black);
    gl.uniform1f(gl.getUniformLocation(program, "u_white"), u.white);
    gl.uniform1f(gl.getUniformLocation(program, "u_shadow"), u.shadow);
    gl.uniform1f(gl.getUniformLocation(program, "u_highlight"), u.highlight);
    gl.uniform1f(
      gl.getUniformLocation(program, "u_temperature"),
      u.temperature
    );
    gl.uniform1f(gl.getUniformLocation(program, "u_tint"), u.tint);
    gl.uniform1i(
      gl.getUniformLocation(program, "u_noShadow"),
      u.noShadow ? 1 : 0
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  private releaseGpu({
    gl,
    program,
    vao,
    posBuf,
    texBuf,
    texture,
  }: GpuResources): void {
    gl.deleteTexture(texture);
    gl.deleteBuffer(posBuf);
    gl.deleteBuffer(texBuf);
    gl.deleteVertexArray(vao);
    gl.deleteProgram(program);
  }
}

const colorRenderer = new ColorRenderer();
export default colorRenderer;
