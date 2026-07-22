import { AnalysisFrame, WAVE_POINTS } from '../visualizerCore/dsp'
import {
  FULLSCREEN_VERT,
  RenderTarget,
  buildProgram,
  clamp,
  createRenderTarget,
  createTexture,
  createVisualizerContext,
  destroyRenderTarget,
  hexToRgb,
  hueRotate,
} from '../visualizerCore/glUtils'

export interface SynthwaveParams {
  /* Wave height as a fraction of half the canvas height */
  amp: number
  /* Vertical position of the line, -0.5 (bottom) .. 0.5 (top) */
  yPos: number
  /* Core stroke half-width in CSS pixels */
  lineWidth: number
  glow: number
  /* Number of ghost lines behind the main one (0-4) */
  ghosts: number
  arcAmp: number
  arcFreq: number
  arcSpeed: number
  colorA: string
  colorB: string
  hueDrift: number
  trailDecay: number
  /* Vertical trail expansion per frame at 60fps */
  smearY: number
  /* Horizontal trail drift per frame at 60fps, -1..1 */
  driftX: number
  /* Chromatic aberration amount, 0..1 */
  chroma: number
  /* Scanline strength, 0..1 */
  scanlines: number
  exposure: number
  sensitivity: number
}

const MAX_LINES = 5

/* Scene pass: each pixel computes its slope-corrected distance to the phase-locked waveform,
   displaced per-line by domain-warped fbm noise. Treble transients (uBolt) gate the arc
   amplitude and the ghost-line intensity, so the electricity leaps on hats and snares. */
const SCENE_FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform sampler2D uWave;
uniform float uTime;
uniform int uLineCount;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uAmp;
uniform float uYPos;
uniform float uLineWidthPx;
uniform float uGlowPx;
uniform float uGlowGain;
uniform float uArcAmp;
uniform float uArcFreq;
uniform float uArcSpeed;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uBolt;
out vec4 outColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

float curveY(float x, float seed, float arcScale) {
  float w = texture(uWave, vec2(x, 0.5)).r * 2.0 - 1.0;
  float gate = min(1.5, 0.2 + 0.6 * uTreble * uTreble + 0.35 * uMid + 0.7 * uBolt);
  float arc = (fbm(vec2(x * uArcFreq + seed, uTime * uArcSpeed + seed * 0.73)) - 0.5) * 2.0 * uArcAmp * arcScale * gate;
  return w * uAmp + arc + uYPos * 2.0;
}

void main() {
  float x = gl_FragCoord.x / uRes.x;
  float ex = 2.0 / uRes.x;
  vec3 col = vec3(0.0);
  for (int g = 0; g < ${MAX_LINES}; g++) {
    if (g >= uLineCount) break;
    float fg = float(g);
    float seed = fg * 13.7;
    float arcScale = 0.55 + 0.5 * fg;
    float y0 = curveY(x, seed, arcScale);
    float y1 = curveY(x + ex, seed, arcScale);
    float Y0 = (y0 * 0.5 + 0.5) * uRes.y;
    float Y1 = (y1 * 0.5 + 0.5) * uRes.y;
    float slope = (Y1 - Y0) / (ex * uRes.x);
    float d = abs(gl_FragCoord.y - Y0) / sqrt(1.0 + slope * slope);
    float core = smoothstep(uLineWidthPx + 1.0, uLineWidthPx - 1.0, d) * (1.2 + uBolt);
    float glow = exp(-d / uGlowPx) * uGlowGain * (0.5 + 0.5 * uBass);
    float intensity = g == 0 ? 1.0 : pow(0.5, fg) * (0.45 + 0.55 * uBolt);
    float mixT = uLineCount > 1 ? fg / float(uLineCount - 1) : 0.0;
    vec3 lineColor = mix(uColorA, uColorB, mixT);
    col += lineColor * (core + glow) * intensity;
  }
  outColor = vec4(col, 1.0);
}`

/* Feedback pass: phosphor persistence — the previous accumulation is sampled slightly
   compressed toward the line so trails dissipate away from it vertically, with optional wind */
const FEEDBACK_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform float uDecay;
uniform float uSmear;
uniform float uDriftX;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv - 0.5;
  p.y /= uSmear;
  p.x -= uDriftX;
  vec3 prev = texture(uPrev, p + 0.5).rgb;
  vec3 scene = texture(uScene, uv).rgb;
  outColor = vec4(scene + prev * uDecay, 1.0);
}`

/* Present pass: filmic tonemap + chromatic aberration + scanlines + dither — the CRT layer */
const PRESENT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uAccum;
uniform vec2 uRes;
uniform float uExposure;
uniform float uChroma;
uniform float uScanlines;
out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 off = (uv - 0.5) * uChroma;
  vec3 hdr = vec3(
    texture(uAccum, uv + off).r,
    texture(uAccum, uv).g,
    texture(uAccum, uv - off).b
  );
  vec3 col = vec3(1.0) - exp(-hdr * uExposure);
  col *= 1.0 - uScanlines * 0.35 * (0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159));
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}`

// WebGL2 renderer for the synthwave lightning. Same three-pass pipeline as the radial wave;
// the scene shader is where all the electricity lives.
export class SynthwaveRenderer {
  private readonly gl: WebGL2RenderingContext
  private readonly halfFloat: boolean
  private readonly sceneProg: WebGLProgram
  private readonly feedbackProg: WebGLProgram
  private readonly presentProg: WebGLProgram
  private readonly locs = new Map<string, WebGLUniformLocation | null>()
  private readonly waveTex: WebGLTexture
  private readonly waveData = new Uint8Array(WAVE_POINTS)
  private readonly baseColors = new Float32Array(6)
  private readonly colors = new Float32Array(6)
  private colorKey = ''
  private scene: RenderTarget | null = null
  private accum: [RenderTarget | null, RenderTarget | null] = [null, null]
  private readIdx = 0
  private width = 0
  private height = 0
  private bolt = 0
  private prevTreble = 0

  constructor(canvas: HTMLCanvasElement) {
    const gl = createVisualizerContext(canvas)
    this.gl = gl
    this.halfFloat = gl.getExtension('EXT_color_buffer_float') !== null

    this.sceneProg = buildProgram(gl, FULLSCREEN_VERT, SCENE_FRAG)
    this.feedbackProg = buildProgram(gl, FULLSCREEN_VERT, FEEDBACK_FRAG)
    this.presentProg = buildProgram(gl, FULLSCREEN_VERT, PRESENT_FRAG)

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    this.waveTex = createTexture(gl)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, WAVE_POINTS, 1, 0, gl.RED, gl.UNSIGNED_BYTE, null)
  }

  // Resize the backing store and reallocate render targets (physical pixels)
  resize(w: number, h: number): void {
    if ((w === this.width && h === this.height) || w === 0 || h === 0) return
    const gl = this.gl
    this.width = w
    this.height = h
    gl.canvas.width = w
    gl.canvas.height = h
    this.destroyTargets()
    this.scene = createRenderTarget(gl, w, h, this.halfFloat)
    this.accum = [createRenderTarget(gl, w, h, this.halfFloat), createRenderTarget(gl, w, h, this.halfFloat)]
  }

  // Draw one frame
  render(frame: AnalysisFrame, params: SynthwaveParams, timeSec: number, dt: number): void {
    const gl = this.gl
    const scene = this.scene
    const read = this.accum[this.readIdx]
    const write = this.accum[1 - this.readIdx]
    if (!scene || !read || !write) return

    // bolt envelope: the *attack* of the treble band, so arcs flash on transients then die fast
    const treble = frame.pulses[2] ?? 0
    this.bolt = Math.max(this.bolt * Math.exp(-dt / 0.09), clamp((treble - this.prevTreble) * 6, 0, 1))
    this.prevTreble = treble

    this.uploadWave(frame)
    this.updateColors(params, timeSec)

    gl.viewport(0, 0, this.width, this.height)

    // pass 1: electric lines -> scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo)
    gl.useProgram(this.sceneProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.waveTex)
    gl.uniform1i(this.loc(this.sceneProg, 'scene', 'uWave'), 0)
    gl.uniform2f(this.loc(this.sceneProg, 'scene', 'uRes'), this.width, this.height)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uTime'), timeSec)
    gl.uniform1i(this.loc(this.sceneProg, 'scene', 'uLineCount'), 1 + Math.round(clamp(params.ghosts, 0, MAX_LINES - 1)))
    gl.uniform3f(this.loc(this.sceneProg, 'scene', 'uColorA'), this.colors[0], this.colors[1], this.colors[2])
    gl.uniform3f(this.loc(this.sceneProg, 'scene', 'uColorB'), this.colors[3], this.colors[4], this.colors[5])
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uAmp'), params.amp)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uYPos'), params.yPos)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uLineWidthPx'), params.lineWidth * devicePixelRatio)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uGlowPx'), (0.008 + 0.075 * params.glow) * this.height)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uGlowGain'), 0.05 + 0.2 * params.glow)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uArcAmp'), params.arcAmp)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uArcFreq'), params.arcFreq)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uArcSpeed'), params.arcSpeed)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uBass'), frame.pulses[0] ?? 0)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uMid'), frame.pulses[1] ?? 0)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uTreble'), treble)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uBolt'), this.bolt)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // pass 2: scene + previous accumulation -> next accumulation (frame-rate independent decay)
    const frames = dt * 60
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fbo)
    gl.useProgram(this.feedbackProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, scene.tex)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, read.tex)
    gl.uniform1i(this.loc(this.feedbackProg, 'fb', 'uScene'), 0)
    gl.uniform1i(this.loc(this.feedbackProg, 'fb', 'uPrev'), 1)
    gl.uniform2f(this.loc(this.feedbackProg, 'fb', 'uRes'), this.width, this.height)
    gl.uniform1f(this.loc(this.feedbackProg, 'fb', 'uDecay'), Math.pow(clamp(params.trailDecay, 0, 0.985), frames))
    gl.uniform1f(this.loc(this.feedbackProg, 'fb', 'uSmear'), 1 + params.smearY * frames)
    gl.uniform1f(this.loc(this.feedbackProg, 'fb', 'uDriftX'), params.driftX * 0.002 * frames)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // pass 3: tonemap + CRT -> screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.useProgram(this.presentProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, write.tex)
    gl.uniform1i(this.loc(this.presentProg, 'present', 'uAccum'), 0)
    gl.uniform2f(this.loc(this.presentProg, 'present', 'uRes'), this.width, this.height)
    gl.uniform1f(this.loc(this.presentProg, 'present', 'uExposure'), params.exposure)
    gl.uniform1f(this.loc(this.presentProg, 'present', 'uChroma'), params.chroma * 0.008)
    gl.uniform1f(this.loc(this.presentProg, 'present', 'uScanlines'), params.scanlines)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    this.readIdx = 1 - this.readIdx
  }

  dispose(): void {
    const gl = this.gl
    this.destroyTargets()
    gl.deleteTexture(this.waveTex)
    gl.deleteProgram(this.sceneProg)
    gl.deleteProgram(this.feedbackProg)
    gl.deleteProgram(this.presentProg)
  }

  private uploadWave(frame: AnalysisFrame): void {
    for (let p = 0; p < WAVE_POINTS; p++) {
      this.waveData[p] = clamp(Math.round((frame.wave[p] * 0.5 + 0.5) * 255), 0, 255)
    }
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.waveTex)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, WAVE_POINTS, 1, gl.RED, gl.UNSIGNED_BYTE, this.waveData)
  }

  // Parse hex colors when they change; apply the time-based hue drift every frame
  private updateColors(params: SynthwaveParams, timeSec: number): void {
    const key = `${params.colorA}|${params.colorB}`
    if (key !== this.colorKey) {
      this.colorKey = key
      const [ar, ag, ab] = hexToRgb(params.colorA)
      const [br, bg, bb] = hexToRgb(params.colorB)
      this.baseColors.set([ar, ag, ab, br, bg, bb])
    }
    hueRotate(this.baseColors, params.hueDrift * timeSec, this.colors)
  }

  private destroyTargets(): void {
    const gl = this.gl
    destroyRenderTarget(gl, this.scene)
    destroyRenderTarget(gl, this.accum[0])
    destroyRenderTarget(gl, this.accum[1])
    this.scene = null
    this.accum = [null, null]
  }

  private loc(prog: WebGLProgram, progKey: string, name: string): WebGLUniformLocation | null {
    const key = `${progKey}:${name}`
    if (!this.locs.has(key)) this.locs.set(key, this.gl.getUniformLocation(prog, name))
    return this.locs.get(key) ?? null
  }
}
