/* Fullscreen triangle from gl_VertexID — no buffers, no attributes */
export const FULLSCREEN_VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

export interface RenderTarget {
  tex: WebGLTexture
  fbo: WebGLFramebuffer
}

// Create a WebGL2 context with the settings every visualizer wants
export function createVisualizerContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  })
  if (!gl) throw new Error('WebGL2 is not available')
  return gl
}

// Compile and link a fullscreen-pass program
export function buildProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc)
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)
  const prog = gl.createProgram() as WebGLProgram
  gl.attachShader(prog, vert)
  gl.attachShader(prog, frag)
  gl.linkProgram(prog)
  gl.deleteShader(vert)
  gl.deleteShader(frag)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`Shader link failed: ${gl.getProgramInfoLog(prog) ?? 'unknown'}`)
  }
  return prog
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type) as WebGLShader
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compile failed: ${gl.getShaderInfoLog(shader) ?? 'unknown'}`)
  }
  return shader
}

// Linear-filtered, edge-clamped, no mipmaps (a mipmap-less texture is otherwise incomplete)
export function createTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const tex = gl.createTexture() as WebGLTexture
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

// Offscreen HDR target when float rendering is available, LDR fallback otherwise
export function createRenderTarget(gl: WebGL2RenderingContext, w: number, h: number, halfFloat: boolean): RenderTarget {
  const tex = createTexture(gl)
  if (halfFloat) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  }
  const fbo = gl.createFramebuffer() as WebGLFramebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.clearColor(0, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  return { tex, fbo }
}

export function destroyRenderTarget(gl: WebGL2RenderingContext, target: RenderTarget | null): void {
  if (!target) return
  gl.deleteTexture(target.tex)
  gl.deleteFramebuffer(target.fbo)
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const v = parseInt(h, 16)
  if (Number.isNaN(v)) return [1, 1, 1]
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}

// SVG feColorMatrix hue-rotate applied to a flat array of RGB triples
export function hueRotate(src: Float32Array, deg: number, out: Float32Array): void {
  const rad = (deg * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  const m00 = 0.213 + c * 0.787 - s * 0.213
  const m01 = 0.715 - c * 0.715 - s * 0.715
  const m02 = 0.072 - c * 0.072 + s * 0.928
  const m10 = 0.213 - c * 0.213 + s * 0.143
  const m11 = 0.715 + c * 0.285 + s * 0.14
  const m12 = 0.072 - c * 0.072 - s * 0.283
  const m20 = 0.213 - c * 0.213 - s * 0.787
  const m21 = 0.715 - c * 0.715 + s * 0.715
  const m22 = 0.072 + c * 0.928 + s * 0.072
  for (let i = 0; i < src.length; i += 3) {
    const r = src[i]
    const g = src[i + 1]
    const b = src[i + 2]
    out[i] = Math.max(0, m00 * r + m01 * g + m02 * b)
    out[i + 1] = Math.max(0, m10 * r + m11 * g + m12 * b)
    out[i + 2] = Math.max(0, m20 * r + m21 * g + m22 * b)
  }
}
