import { AnalysisFrame, BIN_COUNT } from '../visualizerCore/dsp'
import {
  FULLSCREEN_VERT,
  RenderTarget,
  TONEMAP_PRESENT_FRAG,
  buildProgram,
  clamp,
  createRenderTarget,
  createTexture,
  createVisualizerContext,
  destroyRenderTarget,
  hexToRgb,
  hueRotate,
} from '../visualizerCore/glUtils'

export interface SpectrumBarsParams {
  /* Number of bars, bass left to treble right */
  barCount: number
  /* Gap between bars as a fraction of the bar cell */
  gap: number
  /* Max bar height as a fraction of the canvas height */
  maxHeight: number
  /* Floor position as a fraction of the canvas height */
  baseline: number
  /* Bar corner rounding, 0..1 of the half bar width */
  cornerRadius: number
  /* Peak cap thickness in CSS pixels */
  capThickness: number
  /* Peak cap fall acceleration, energy units per second squared */
  capGravity: number
  /* Seconds a fresh peak holds before falling */
  capHold: number
  /* Wet-floor reflection strength, 0..1 */
  reflection: number
  colorLow: string
  colorHigh: string
  colorCap: string
  hueDrift: number
  glow: number
  trailDecay: number
  /* Upward trail drift per frame at 60fps — energy evaporating off the bars */
  driftY: number
  exposure: number
  sensitivity: number
}

const MAX_BARS = 96

/* Scene pass: every pixel sums the SDF contribution of its own bar cell and both neighbours
   (so glow crosses cell boundaries without seams), then mirrors itself below the baseline for
   the wet-floor reflection. Bar energy and cap positions arrive in a 2-row data texture. */
const SCENE_FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform sampler2D uData;
uniform float uBarCount;
uniform float uGap;
uniform float uBaseline;
uniform float uMaxHeight;
uniform float uCornerRadius;
uniform float uCapThickPx;
uniform float uGlowPx;
uniform float uGlowGain;
uniform float uReflection;
uniform float uBass;
uniform vec3 uColorLow;
uniform vec3 uColorHigh;
uniform vec3 uColorCap;
out vec4 outColor;

float roundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

vec3 barContrib(float j, vec2 uv) {
  if (j < 0.0 || j >= uBarCount) return vec3(0.0);
  float tx = (j + 0.5) / ${MAX_BARS}.0;
  float e = texture(uData, vec2(tx, 0.25)).r;
  float cap = texture(uData, vec2(tx, 0.75)).r;
  float cx = (j + 0.5) / uBarCount;
  float halfWPx = (1.0 - uGap) * 0.5 / uBarCount * uRes.x;
  float hPx = max(e * uMaxHeight * uRes.y, 3.0);

  vec2 p = vec2((uv.x - cx) * uRes.x, uv.y * uRes.y - (uBaseline * uRes.y + hPx * 0.5));
  vec2 b = vec2(halfWPx, hPx * 0.5);
  float r = min(b.x, b.y) * uCornerRadius;
  float d = roundedRect(p, b, r);
  float core = smoothstep(1.0, -1.0, d);
  float glow = exp(-max(d, 0.0) / uGlowPx) * uGlowGain;
  vec3 base = mix(uColorLow, uColorHigh, cx);
  vec3 col = base * (core * (0.5 + 0.5 * e) + glow * (0.35 + 0.65 * e));

  float capYPx = (uBaseline + cap * uMaxHeight) * uRes.y + uCapThickPx + 3.0;
  vec2 pc = vec2(p.x, uv.y * uRes.y - capYPx);
  float dc = roundedRect(pc, vec2(halfWPx * 0.92, uCapThickPx), uCapThickPx * 0.8);
  float capCore = smoothstep(1.0, -1.0, dc);
  float capGlow = exp(-max(dc, 0.0) / (uGlowPx * 0.6)) * uGlowGain * 0.6;
  col += mix(base, uColorCap, 0.65) * (capCore * 1.5 + capGlow);
  return col;
}

vec3 sceneAt(vec2 uv) {
  float j = floor(uv.x * uBarCount);
  return barContrib(j - 1.0, uv) + barContrib(j, uv) + barContrib(j + 1.0, uv);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 col;
  if (uv.y >= uBaseline) {
    col = sceneAt(uv);
  } else {
    float depth = (uBaseline - uv.y) / max(uBaseline, 0.001);
    col = sceneAt(vec2(uv.x, 2.0 * uBaseline - uv.y)) * uReflection * exp(-depth * 3.5);
  }
  float dl = abs(uv.y - uBaseline) * uRes.y;
  col += mix(uColorLow, uColorHigh, uv.x) * exp(-dl / 2.5) * (0.12 + 0.45 * uBass);
  outColor = vec4(col, 1.0);
}`

/* Feedback pass: plain decay with a slight upward drift, so bar energy evaporates like heat */
const FEEDBACK_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform float uDecay;
uniform float uDriftY;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 prev = texture(uPrev, vec2(uv.x, uv.y - uDriftY)).rgb;
  vec3 scene = texture(uScene, uv).rgb;
  outColor = vec4(scene + prev * uDecay, 1.0);
}`

// WebGL2 renderer for the spectrum bars. The falling peak caps are simulated on the CPU
// (hold, then accelerate under gravity, reset on touch) and uploaded with the bar energies.
export class SpectrumBarsRenderer {
  private readonly gl: WebGL2RenderingContext
  private readonly halfFloat: boolean
  private readonly sceneProg: WebGLProgram
  private readonly feedbackProg: WebGLProgram
  private readonly presentProg: WebGLProgram
  private readonly locs = new Map<string, WebGLUniformLocation | null>()
  private readonly dataTex: WebGLTexture
  private readonly dataRows = new Uint8Array(MAX_BARS * 2)
  private readonly barEnergy = new Float32Array(MAX_BARS)
  private readonly caps = new Float32Array(MAX_BARS)
  private readonly capVels = new Float32Array(MAX_BARS)
  private readonly capHolds = new Float32Array(MAX_BARS)
  private readonly baseColors = new Float32Array(9)
  private readonly colors = new Float32Array(9)
  private colorKey = ''
  private lastBarCount = 0
  private scene: RenderTarget | null = null
  private accum: [RenderTarget | null, RenderTarget | null] = [null, null]
  private readIdx = 0
  private width = 0
  private height = 0

  constructor(canvas: HTMLCanvasElement) {
    const gl = createVisualizerContext(canvas)
    this.gl = gl
    this.halfFloat = gl.getExtension('EXT_color_buffer_float') !== null

    this.sceneProg = buildProgram(gl, FULLSCREEN_VERT, SCENE_FRAG)
    this.feedbackProg = buildProgram(gl, FULLSCREEN_VERT, FEEDBACK_FRAG)
    this.presentProg = buildProgram(gl, FULLSCREEN_VERT, TONEMAP_PRESENT_FRAG)

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    this.dataTex = createTexture(gl)
    /* NEAREST so adjacent bars never bleed into each other through the sampler */
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, MAX_BARS, 2, 0, gl.RED, gl.UNSIGNED_BYTE, null)
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
  render(frame: AnalysisFrame, params: SpectrumBarsParams, timeSec: number, dt: number): void {
    const gl = this.gl
    const scene = this.scene
    const read = this.accum[this.readIdx]
    const write = this.accum[1 - this.readIdx]
    if (!scene || !read || !write) return

    const barCount = Math.round(clamp(params.barCount, 4, MAX_BARS))
    this.updateBars(frame, params, barCount, dt)
    this.updateColors(params, timeSec)

    gl.viewport(0, 0, this.width, this.height)

    // pass 1: bars + caps + reflection -> scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo)
    gl.useProgram(this.sceneProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex)
    gl.uniform1i(this.loc(this.sceneProg, 'scene', 'uData'), 0)
    gl.uniform2f(this.loc(this.sceneProg, 'scene', 'uRes'), this.width, this.height)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uBarCount'), barCount)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uGap'), clamp(params.gap, 0, 0.8))
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uBaseline'), params.baseline)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uMaxHeight'), params.maxHeight)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uCornerRadius'), clamp(params.cornerRadius, 0, 1))
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uCapThickPx'), params.capThickness * devicePixelRatio)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uGlowPx'), (0.004 + 0.05 * params.glow) * this.height)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uGlowGain'), 0.04 + 0.2 * params.glow)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uReflection'), params.reflection)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uBass'), frame.pulses[0] ?? 0)
    gl.uniform3f(this.loc(this.sceneProg, 'scene', 'uColorLow'), this.colors[0], this.colors[1], this.colors[2])
    gl.uniform3f(this.loc(this.sceneProg, 'scene', 'uColorHigh'), this.colors[3], this.colors[4], this.colors[5])
    gl.uniform3f(this.loc(this.sceneProg, 'scene', 'uColorCap'), this.colors[6], this.colors[7], this.colors[8])
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
    gl.uniform1f(this.loc(this.feedbackProg, 'fb', 'uDriftY'), params.driftY * frames)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // pass 3: tonemap -> screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.useProgram(this.presentProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, write.tex)
    gl.uniform1i(this.loc(this.presentProg, 'present', 'uAccum'), 0)
    gl.uniform2f(this.loc(this.presentProg, 'present', 'uRes'), this.width, this.height)
    gl.uniform1f(this.loc(this.presentProg, 'present', 'uExposure'), params.exposure)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    this.readIdx = 1 - this.readIdx
  }

  dispose(): void {
    const gl = this.gl
    this.destroyTargets()
    gl.deleteTexture(this.dataTex)
    gl.deleteProgram(this.sceneProg)
    gl.deleteProgram(this.feedbackProg)
    gl.deleteProgram(this.presentProg)
  }

  // Resample the spectrum into bars, run the cap physics, upload both rows
  private updateBars(frame: AnalysisFrame, params: SpectrumBarsParams, barCount: number, dt: number): void {
    if (barCount !== this.lastBarCount) {
      this.lastBarCount = barCount
      this.caps.fill(0)
      this.capVels.fill(0)
      this.capHolds.fill(0)
    }

    const per = BIN_COUNT / barCount
    for (let j = 0; j < barCount; j++) {
      const start = Math.floor(j * per)
      const end = Math.max(start + 1, Math.floor((j + 1) * per))
      let e = 0
      for (let b = start; b < end && b < BIN_COUNT; b++) e = Math.max(e, frame.spectrum[b])
      this.barEnergy[j] = e

      /* classic peak cap: latch onto fresh peaks, hold briefly, then fall under gravity */
      if (e >= this.caps[j]) {
        this.caps[j] = e
        this.capVels[j] = 0
        this.capHolds[j] = params.capHold
      } else if (this.capHolds[j] > 0) {
        this.capHolds[j] -= dt
      } else {
        this.capVels[j] += params.capGravity * dt
        this.caps[j] = Math.max(e, this.caps[j] - this.capVels[j] * dt)
      }

      this.dataRows[j] = clamp(Math.round(this.barEnergy[j] * 255), 0, 255)
      this.dataRows[MAX_BARS + j] = clamp(Math.round(this.caps[j] * 255), 0, 255)
    }
    this.dataRows.fill(0, barCount, MAX_BARS)
    this.dataRows.fill(0, MAX_BARS + barCount)

    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, MAX_BARS, 2, gl.RED, gl.UNSIGNED_BYTE, this.dataRows)
  }

  // Parse hex colors when they change; apply the time-based hue drift every frame
  private updateColors(params: SpectrumBarsParams, timeSec: number): void {
    const key = `${params.colorLow}|${params.colorHigh}|${params.colorCap}`
    if (key !== this.colorKey) {
      this.colorKey = key
      const [lr, lg, lb] = hexToRgb(params.colorLow)
      const [hr, hg, hb] = hexToRgb(params.colorHigh)
      const [cr, cg, cb] = hexToRgb(params.colorCap)
      this.baseColors.set([lr, lg, lb, hr, hg, hb, cr, cg, cb])
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
