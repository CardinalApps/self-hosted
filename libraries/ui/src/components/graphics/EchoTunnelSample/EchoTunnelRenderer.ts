import { AnalysisFrame, WAVE_POINTS } from '../visualizerCore/dsp'
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

export interface EchoTunnelParams {
  /* Injected ring radius as a fraction of the half-min-dimension */
  ringRadius: number
  /* Ring stroke half-width in CSS pixels */
  ringWidth: number
  /* Waveform deformation amplitude around the ring */
  waveAmp: number
  glow: number
  /* Base color of the injected ring */
  color: string
  /* Ring hue rotation in degrees/sec — gives the tunnel its rainbow layers */
  hueCycle: number
  /* Outward echo growth per frame at 60fps */
  zoom: number
  /* Extra growth per unit of bass energy — the tunnel pumps on the kick */
  bassZoom: number
  /* Base tunnel rotation in radians/sec */
  spin: number
  /* Extra rotation per unit of mid energy */
  midSpin: number
  /* Liquid ripple displacement of the echo field */
  rippleAmp: number
  rippleFreq: number
  rippleSpeed: number
  trailDecay: number
  exposure: number
  sensitivity: number
}

/* Scene pass: inject a single thin waveform ring (mirrored angle, phase-locked wave) plus a
   bass core flash. Everything else on screen is history, built by the feedback warp. */
const SCENE_FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform sampler2D uWave;
uniform float uRadius;
uniform float uWaveAmp;
uniform float uLineWidthPx;
uniform float uGlowSize;
uniform float uGlowGain;
uniform float uFlash;
uniform float uBass;
uniform vec3 uColor;
out vec4 outColor;

const float PI = 3.14159265359;

void main() {
  float minDim = min(uRes.x, uRes.y);
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / minDim;
  float r = length(uv);
  float t = abs(atan(uv.y, uv.x)) / PI;
  float w = texture(uWave, vec2(t, 0.5)).r * 2.0 - 1.0;
  float R = uRadius + w * uWaveAmp;
  float d = abs(r - R);
  float px = 2.0 / minDim;
  float core = smoothstep(uLineWidthPx * px + px, uLineWidthPx * px - px, d);
  float glow = exp(-d / uGlowSize) * uGlowGain;
  vec3 col = uColor * (core * (1.1 + 1.6 * uFlash) + glow);
  /* kick shockwave: a thin ring injected at small radius rides the zoom outward — a filled
     center pop would linger forever because outward transport is exponentially slow near r=0 */
  float ds = abs(r - 0.12);
  col += uColor * exp(-ds / 0.03) * uFlash * (0.5 + 0.5 * uBass);
  outColor = vec4(col, 1.0);
}`

/* Feedback pass: the tunnel itself. Each frame the accumulated history is re-sampled through a
   polar warp — zoomed outward (bass pumps it), rotated (mids steer it), and radially rippled
   (treble accelerates it) — so every injected ring echoes forever down a liquid tunnel. */
const FEEDBACK_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform float uDecay;
uniform float uZoom;
uniform float uSpin;
uniform float uRippleAmp;
uniform float uRippleFreq;
uniform float uRipplePhase;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float minDim = min(uRes.x, uRes.y);
  vec2 c = (gl_FragCoord.xy - 0.5 * uRes) / minDim;
  float r = length(c);
  float a = atan(c.y, c.x);
  float rs = r / uZoom + uRippleAmp * sin(r * uRippleFreq - uRipplePhase);
  float as = a - uSpin;
  vec2 sampleUv = (vec2(cos(as), sin(as)) * rs * minDim + 0.5 * uRes) / uRes;
  vec3 prev = min(texture(uPrev, sampleUv).rgb, vec3(32.0));
  vec3 scene = texture(uScene, uv).rgb;
  outColor = vec4(scene + prev * uDecay, 1.0);
}`

// WebGL2 renderer for the echo tunnel. The scene pass is nearly nothing — the visualizer lives
// in the music-driven warp of the feedback pass.
export class EchoTunnelRenderer {
  private readonly gl: WebGL2RenderingContext
  private readonly halfFloat: boolean
  private readonly sceneProg: WebGLProgram
  private readonly feedbackProg: WebGLProgram
  private readonly presentProg: WebGLProgram
  private readonly locs = new Map<string, WebGLUniformLocation | null>()
  private readonly waveTex: WebGLTexture
  private readonly waveData = new Uint8Array(WAVE_POINTS)
  private readonly baseColor = new Float32Array(3)
  private readonly color = new Float32Array(3)
  private colorKey = ''
  private scene: RenderTarget | null = null
  private accum: [RenderTarget | null, RenderTarget | null] = [null, null]
  private readIdx = 0
  private width = 0
  private height = 0
  private flash = 0
  private prevBass = 0
  private ripplePhase = 0

  constructor(canvas: HTMLCanvasElement) {
    const gl = createVisualizerContext(canvas)
    this.gl = gl
    this.halfFloat = gl.getExtension('EXT_color_buffer_float') !== null

    this.sceneProg = buildProgram(gl, FULLSCREEN_VERT, SCENE_FRAG)
    this.feedbackProg = buildProgram(gl, FULLSCREEN_VERT, FEEDBACK_FRAG)
    this.presentProg = buildProgram(gl, FULLSCREEN_VERT, TONEMAP_PRESENT_FRAG)

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
  render(frame: AnalysisFrame, params: EchoTunnelParams, timeSec: number, dt: number): void {
    const gl = this.gl
    const scene = this.scene
    const read = this.accum[this.readIdx]
    const write = this.accum[1 - this.readIdx]
    if (!scene || !read || !write) return

    const bass = frame.pulses[0] ?? 0
    const mid = frame.pulses[1] ?? 0
    const treble = frame.pulses[2] ?? 0

    // flash envelope: the attack of the bass band — each kick fires a bright ring down the tunnel
    this.flash = Math.max(this.flash * Math.exp(-dt / 0.12), clamp((bass - this.prevBass) * 5, 0, 1))
    this.prevBass = bass
    this.ripplePhase += params.rippleSpeed * (0.5 + treble) * dt

    this.uploadWave(frame)
    this.updateColor(params, timeSec)

    gl.viewport(0, 0, this.width, this.height)

    // pass 1: waveform ring -> scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.fbo)
    gl.useProgram(this.sceneProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.waveTex)
    gl.uniform1i(this.loc(this.sceneProg, 'scene', 'uWave'), 0)
    gl.uniform2f(this.loc(this.sceneProg, 'scene', 'uRes'), this.width, this.height)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uRadius'), params.ringRadius)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uWaveAmp'), params.waveAmp)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uLineWidthPx'), params.ringWidth * devicePixelRatio)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uGlowSize'), 0.01 + 0.06 * params.glow)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uGlowGain'), 0.04 + 0.16 * params.glow)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uFlash'), this.flash)
    gl.uniform1f(this.loc(this.sceneProg, 'scene', 'uBass'), bass)
    gl.uniform3f(this.loc(this.sceneProg, 'scene', 'uColor'), this.color[0], this.color[1], this.color[2])
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // pass 2: warp the accumulated history and add this frame's ring
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
    gl.uniform1f(this.loc(this.feedbackProg, 'fb', 'uDecay'), Math.pow(clamp(params.trailDecay, 0, 0.96), frames))
    gl.uniform1f(this.loc(this.feedbackProg, 'fb', 'uZoom'), 1 + (params.zoom + params.bassZoom * bass) * frames)
    gl.uniform1f(this.loc(this.feedbackProg, 'fb', 'uSpin'), (params.spin + params.midSpin * (mid - 0.3)) * dt)
    gl.uniform1f(this.loc(this.feedbackProg, 'fb', 'uRippleAmp'), params.rippleAmp)
    gl.uniform1f(this.loc(this.feedbackProg, 'fb', 'uRippleFreq'), params.rippleFreq)
    gl.uniform1f(this.loc(this.feedbackProg, 'fb', 'uRipplePhase'), this.ripplePhase)
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

  // Parse the base color when it changes; cycle its hue continuously for rainbow tunnel layers
  private updateColor(params: EchoTunnelParams, timeSec: number): void {
    if (params.color !== this.colorKey) {
      this.colorKey = params.color
      const [r, g, b] = hexToRgb(params.color)
      this.baseColor.set([r, g, b])
    }
    hueRotate(this.baseColor, params.hueCycle * timeSec, this.color)
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
