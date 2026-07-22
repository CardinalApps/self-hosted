import { AnalysisFrame, BIN_COUNT, MAX_RINGS, TEX_WIDTH } from '../visualizerCore/dsp'
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

export interface RadialWaveParams {
  ringCount: number
  /* Hex colors, one per ring (innermost = bass) */
  colors: string[]
  /* Core stroke half-width in physical pixels */
  lineWidth: number
  glow: number
  pulseAmp: number
  dispAmp: number
  /* Number of mirrored wedges; 1 = classic left/right mirror */
  symmetry: number
  trailDecay: number
  trailZoom: number
  trailSpin: number
  hueDrift: number
  exposure: number
  sensitivity: number
}

/* Rings pass: each pixel computes its distance to every deformed ring. The core stroke is
   feathered by exactly one pixel (analytic AA, crisp at any DPR) and the glow is an exponential
   falloff of the same distance — real bloom with no blur passes. */
const RINGS_FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform sampler2D uDisp;
uniform int uRingCount;
uniform float uRadius[${MAX_RINGS}];
uniform float uPulse[${MAX_RINGS}];
uniform vec3 uColor[${MAX_RINGS}];
uniform float uLineWidthPx;
uniform float uGlowSize;
uniform float uGlowGain;
uniform float uPulseAmp;
uniform float uDispAmp;
uniform float uSymmetry;
out vec4 outColor;

const float TAU = 6.28318530718;

void main() {
  float minDim = min(uRes.x, uRes.y);
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / minDim;
  float r = length(uv);
  float theta = atan(uv.y, uv.x);
  float seg = TAU / uSymmetry;
  float a = mod(theta, seg) / seg;
  float t = 1.0 - abs(1.0 - 2.0 * a);
  float px = 2.0 / minDim;
  vec3 col = vec3(0.0);
  for (int i = 0; i < ${MAX_RINGS}; i++) {
    if (i >= uRingCount) break;
    float fi = float(i);
    float disp = texture(uDisp, vec2(t, (fi + 0.5) / ${MAX_RINGS}.0)).r;
    float amp = uDispAmp * (1.0 - 0.12 * fi) * (0.35 + 0.65 * uPulse[i]);
    float R = uRadius[i] * (1.0 + uPulseAmp * uPulse[i]) + disp * amp;
    float d = abs(r - R);
    float core = smoothstep(uLineWidthPx * px + px, uLineWidthPx * px - px, d);
    float glow = exp(-d / uGlowSize) * uGlowGain * (0.35 + 0.65 * uPulse[i]);
    col += uColor[i] * (core + glow);
  }
  float bp = uPulse[0];
  col += uColor[0] * exp(-r * r * 24.0) * bp * bp * bp * 0.5;
  outColor = vec4(col, 1.0);
}`

/* Feedback pass: this frame + last frame's accumulation, sampled slightly zoomed and rotated,
   so every bright pixel echoes outward as a fading trail */
const FEEDBACK_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform float uDecay;
uniform float uZoom;
uniform float uSpin;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 c = (uv - 0.5) * asp;
  float cs = cos(uSpin);
  float sn = sin(uSpin);
  c = mat2(cs, -sn, sn, cs) * c / uZoom;
  vec2 prevUv = c / asp + 0.5;
  vec3 prev = texture(uPrev, prevUv).rgb;
  vec3 scene = texture(uScene, uv).rgb;
  outColor = vec4(scene + prev * uDecay, 1.0);
}`

/* Present pass: soft filmic tonemap keeps additive blowouts graceful; the hash dither kills
   banding in the dark glow falloff */
const PRESENT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uAccum;
uniform vec2 uRes;
uniform float uExposure;
out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 hdr = texture(uAccum, uv).rgb;
  vec3 col = vec3(1.0) - exp(-hdr * uExposure);
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}`

// WebGL2 renderer for the radial wave. Three fullscreen passes per frame (rings, feedback,
// present); zero per-frame allocations; backing store sized to exact physical pixels by the host.
export class RadialWaveRenderer {
  private readonly gl: WebGL2RenderingContext
  private readonly halfFloat: boolean
  private readonly ringsProg: WebGLProgram
  private readonly feedbackProg: WebGLProgram
  private readonly presentProg: WebGLProgram
  private readonly locs = new Map<string, WebGLUniformLocation | null>()
  private readonly dispTex: WebGLTexture
  private readonly dispData = new Uint8Array(TEX_WIDTH * MAX_RINGS)
  private readonly radii = new Float32Array(MAX_RINGS)
  private readonly colors = new Float32Array(MAX_RINGS * 3)
  private readonly baseColors = new Float32Array(MAX_RINGS * 3)
  private colorKey = ''
  private scene: RenderTarget | null = null
  private accum: [RenderTarget | null, RenderTarget | null] = [null, null]
  private readIdx = 0
  private width = 0
  private height = 0

  constructor(canvas: HTMLCanvasElement) {
    const gl = createVisualizerContext(canvas)
    this.gl = gl
    this.halfFloat = gl.getExtension('EXT_color_buffer_float') !== null

    this.ringsProg = buildProgram(gl, FULLSCREEN_VERT, RINGS_FRAG)
    this.feedbackProg = buildProgram(gl, FULLSCREEN_VERT, FEEDBACK_FRAG)
    this.presentProg = buildProgram(gl, FULLSCREEN_VERT, PRESENT_FRAG)

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    this.dispTex = createTexture(gl)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, TEX_WIDTH, MAX_RINGS, 0, gl.RED, gl.UNSIGNED_BYTE, null)
  }

  // Resize the backing store and reallocate render targets (physical pixels)
  resize(w: number, h: number): void {
    if (w === this.width && h === this.height) return
    if (w === 0 || h === 0) return
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
  render(frame: AnalysisFrame, params: RadialWaveParams, timeSec: number, dt: number): void {
    const gl = this.gl
    const scene = this.scene
    const read = this.accum[this.readIdx]
    const write = this.accum[1 - this.readIdx]
    if (!scene || !read || !write) return

    this.uploadDisplacement(frame, params.ringCount)
    this.layoutRings(params.ringCount)
    this.updateColors(params, timeSec)

    gl.viewport(0, 0, this.width, this.height)

    // pass 1: rings -> scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo)
    gl.useProgram(this.ringsProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.dispTex)
    gl.uniform1i(this.loc(this.ringsProg, 'rings', 'uDisp'), 0)
    gl.uniform2f(this.loc(this.ringsProg, 'rings', 'uRes'), this.width, this.height)
    gl.uniform1i(this.loc(this.ringsProg, 'rings', 'uRingCount'), params.ringCount)
    gl.uniform1fv(this.loc(this.ringsProg, 'rings', 'uRadius[0]'), this.radii)
    gl.uniform1fv(this.loc(this.ringsProg, 'rings', 'uPulse[0]'), frame.pulses)
    gl.uniform3fv(this.loc(this.ringsProg, 'rings', 'uColor[0]'), this.colors)
    gl.uniform1f(this.loc(this.ringsProg, 'rings', 'uLineWidthPx'), params.lineWidth * devicePixelRatio)
    gl.uniform1f(this.loc(this.ringsProg, 'rings', 'uGlowSize'), 0.012 + 0.088 * params.glow)
    gl.uniform1f(this.loc(this.ringsProg, 'rings', 'uGlowGain'), 0.04 + 0.18 * params.glow)
    gl.uniform1f(this.loc(this.ringsProg, 'rings', 'uPulseAmp'), params.pulseAmp)
    gl.uniform1f(this.loc(this.ringsProg, 'rings', 'uDispAmp'), params.dispAmp)
    gl.uniform1f(this.loc(this.ringsProg, 'rings', 'uSymmetry'), Math.max(1, Math.round(params.symmetry)))
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
    gl.uniform1f(this.loc(this.feedbackProg, 'fb', 'uZoom'), 1 + params.trailZoom * frames)
    gl.uniform1f(this.loc(this.feedbackProg, 'fb', 'uSpin'), params.trailSpin * dt)
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
    gl.deleteTexture(this.dispTex)
    gl.deleteProgram(this.ringsProg)
    gl.deleteProgram(this.feedbackProg)
    gl.deleteProgram(this.presentProg)
  }

  // Resample each ring's slice of the spectrum into its 32-texel displacement row
  private uploadDisplacement(frame: AnalysisFrame, ringCount: number): void {
    const per = BIN_COUNT / ringCount
    for (let i = 0; i < MAX_RINGS; i++) {
      const row = i * TEX_WIDTH
      if (i >= ringCount) {
        this.dispData.fill(0, row, row + TEX_WIDTH)
        continue
      }
      const start = i * per
      for (let x = 0; x < TEX_WIDTH; x++) {
        const pos = start + ((x + 0.5) / TEX_WIDTH) * per
        const b0 = Math.min(BIN_COUNT - 1, Math.floor(pos))
        const b1 = Math.min(BIN_COUNT - 1, b0 + 1)
        const fr = pos - Math.floor(pos)
        const v = frame.spectrum[b0] * (1 - fr) + frame.spectrum[b1] * fr
        this.dispData[row + x] = Math.max(0, Math.min(255, Math.round(v * 255)))
      }
    }
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.dispTex)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TEX_WIDTH, MAX_RINGS, gl.RED, gl.UNSIGNED_BYTE, this.dispData)
  }

  // Spread base radii from 0.24 to 0.66 of the half-min-dimension
  private layoutRings(ringCount: number): void {
    if (ringCount === 1) {
      this.radii[0] = 0.42
      return
    }
    for (let i = 0; i < ringCount; i++) {
      this.radii[i] = 0.24 + (0.42 / (ringCount - 1)) * i
    }
  }

  // Parse hex colors when they change; apply the time-based hue drift every frame
  private updateColors(params: RadialWaveParams, timeSec: number): void {
    const key = params.colors.join('|')
    if (key !== this.colorKey) {
      this.colorKey = key
      for (let i = 0; i < MAX_RINGS; i++) {
        const [r, g, b] = hexToRgb(params.colors[i] ?? '#ffffff')
        this.baseColors[i * 3] = r
        this.baseColors[i * 3 + 1] = g
        this.baseColors[i * 3 + 2] = b
      }
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

