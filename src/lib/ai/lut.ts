// Curated color looks. Rendering is shared by live preview and capture.
import catalog from "./lut-catalog.json";
export type LutId = string;
export type LutDef = { id: LutId; label: string; file: string; strength: number };
export const FALLBACK_LUTS: LutDef[] = catalog;

// Cache daftar filter (manifest di-fetch sekali).
let lutsPromise: Promise<LutDef[]> | null = null;

/** Daftar filter runtime dari manifest.json; fallback FALLBACK_LUTS. */
export function getLuts(): Promise<LutDef[]> {
  if (!lutsPromise) {
    lutsPromise = fetch("/luts/manifest.json")
      .then((res) => {
        if (!res.ok) throw new Error("manifest tidak tersedia");
        return res.json() as Promise<LutDef[]>;
      })
      .then(() => FALLBACK_LUTS)
      .catch(() => FALLBACK_LUTS);
  }
  return lutsPromise;
}

export type ParsedLut = { size: number; order: "bgr"; data: Float32Array };

/** Cube tables are red-fastest, including Photoshop exports. */
export function parseCube(text: string): ParsedLut {
  let size = 0;
  const points: number[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const [key, ...values] = line.split(/\s+/);
    if (key === "TITLE") continue;
    if (key === "LUT_3D_SIZE") {
      if (size || values.length !== 1) throw new Error("LUT tidak valid.");
      size = Number(values[0]);
      if (!Number.isInteger(size) || size < 2 || size > 64) throw new Error("LUT tidak valid.");
      continue;
    }
    if (key === "DOMAIN_MIN" || key === "DOMAIN_MAX") {
      const expected = key === "DOMAIN_MIN" ? 0 : 1;
      if (values.length !== 3 || values.some(v => Number(v) !== expected)) throw new Error("Domain LUT tidak didukung.");
      continue;
    }
    const rgb = [key, ...values].map(Number);
    if (!size || rgb.length !== 3 || rgb.some(v => !Number.isFinite(v))) throw new Error("LUT tidak valid.");
    points.push(...rgb);
  }
  if (!size || points.length !== size ** 3 * 3) throw new Error("LUT tidak valid.");
  return { size, order: "bgr", data: Float32Array.from(points) };
}

export type HaldData = { width: number; height: number; data: Uint8Array };

/**
 * Susun tabel 3D jadi atlas HALD 2D (grid × grid blok, tiap blok size×size).
 * Shader memetakan cell (r,g,b) → posisi texel di atlas untuk trilinear.
 */
export function buildHald(lut: ParsedLut): HaldData {
  const { size, data } = lut;
  const grid = Math.ceil(Math.sqrt(size));
  const width = grid * size;
  const height = grid * size;
  const out = new Uint8Array(width * height * 3);
  for (let bz = 0; bz < size; bz++) {
    const blockCol = bz % grid;
    const blockRow = Math.floor(bz / grid);
    for (let gy = 0; gy < size; gy++) {
      for (let gx = 0; gx < size; gx++) {
        const src = ((bz * size + gy) * size + gx) * 3;
        const dx = blockCol * size + gx;
        const dy = blockRow * size + gy;
        const dst = (dy * width + dx) * 3;
        out[dst] = Math.round(Math.max(0, Math.min(1, data[src])) * 255);
        out[dst + 1] = Math.round(Math.max(0, Math.min(1, data[src + 1])) * 255);
        out[dst + 2] = Math.round(Math.max(0, Math.min(1, data[src + 2])) * 255);
      }
    }
  }
  return { width, height, data: out };
}

// Cache parse per id (tab "Filter" lazy-load, pola MediaPipe §8.3).
const lutCache = new Map<LutId, Promise<ParsedLut>>();

export function loadLut(id: LutId): Promise<ParsedLut> {
  let p = lutCache.get(id);
  if (!p) {
    p = getLuts()
      .then((defs) => defs.find((l) => l.id === id))
      .then((def) => {
        if (!def) throw new Error("Filter tidak ditemukan.");
        // encodeURIComponent: nama file bisa berisi spasi/uppercase (.CUBE).
        return fetch(`/luts/${encodeURIComponent(def.file)}`).then((res) => {
          if (!res.ok) throw new Error("Gagal memuat filter.");
          return res.text();
        });
      })
      .then(parseCube)
      .catch((error) => { lutCache.delete(id); throw error; });
    lutCache.set(id, p);
  }
  return p;
}

const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Trilinear lookup 3D LUT dari atlas HALD (g = ceil(sqrt(size))).
const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uSrc;
uniform sampler2D uLut;
uniform float uSize;
uniform float uGrid;
uniform float uStrength;

vec2 lutCoord(vec3 cell) {
  float bz = clamp(cell.z, 0.0, uSize - 1.0);
  float blockCol = mod(bz, uGrid);
  float blockRow = floor(bz / uGrid);
  float u = (blockCol * uSize + clamp(cell.x, 0.0, uSize - 1.0) + 0.5) / (uSize * uGrid);
  float v = (blockRow * uSize + clamp(cell.y, 0.0, uSize - 1.0) + 0.5) / (uSize * uGrid);
  return vec2(u, v);
}

vec3 lutLookup(vec3 color) {
  vec3 p = clamp(color, 0.0, 1.0) * (uSize - 1.0);
  vec3 b = floor(p);
  vec3 f = p - b;
  vec3 b1 = min(b + 1.0, uSize - 1.0);
  vec3 c000 = texture2D(uLut, lutCoord(vec3(b.x, b.y, b.z))).rgb;
  vec3 c100 = texture2D(uLut, lutCoord(vec3(b1.x, b.y, b.z))).rgb;
  vec3 c010 = texture2D(uLut, lutCoord(vec3(b.x, b1.y, b.z))).rgb;
  vec3 c110 = texture2D(uLut, lutCoord(vec3(b1.x, b1.y, b.z))).rgb;
  vec3 c001 = texture2D(uLut, lutCoord(vec3(b.x, b.y, b1.z))).rgb;
  vec3 c101 = texture2D(uLut, lutCoord(vec3(b1.x, b.y, b1.z))).rgb;
  vec3 c011 = texture2D(uLut, lutCoord(vec3(b.x, b1.y, b1.z))).rgb;
  vec3 c111 = texture2D(uLut, lutCoord(vec3(b1.x, b1.y, b1.z))).rgb;
  vec3 c00 = mix(c000, c100, f.x);
  vec3 c10 = mix(c010, c110, f.x);
  vec3 c01 = mix(c001, c101, f.x);
  vec3 c11 = mix(c011, c111, f.x);
  vec3 c0 = mix(c00, c10, f.y);
  vec3 c1 = mix(c01, c11, f.y);
  return mix(c0, c1, f.z);
}

void main() {
  vec4 src = texture2D(uSrc, vUv);
  vec3 graded = lutLookup(src.rgb);
  gl_FragColor = vec4(mix(src.rgb, graded, clamp(uStrength, 0.0, 1.0)), src.a);
}`;

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Renderer WebGL untuk 3D LUT — dipakai preview & capture (WYSIWYG). */
export class LutRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private srcTex: WebGLTexture;
  private lutTex: WebGLTexture;
  private buf: WebGLBuffer;
  private uSize: WebGLUniformLocation | null;
  private uGrid: WebGLUniformLocation | null;
  private uStrength: WebGLUniformLocation | null;
  private canvas: HTMLCanvasElement;

  constructor() {
    this.canvas = document.createElement("canvas");
    const gl = this.canvas.getContext("webgl", {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error("WebGL tidak tersedia.");
    this.gl = gl;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vs || !fs || !program) throw new Error("Gagal kompilasi shader.");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("Gagal link program.");
    }
    this.program = program;

    this.srcTex = gl.createTexture() as WebGLTexture;
    this.lutTex = gl.createTexture() as WebGLTexture;
    this.buf = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]),
      gl.STATIC_DRAW,
    );
    this.uSize = gl.getUniformLocation(program, "uSize");
    this.uGrid = gl.getUniformLocation(program, "uGrid");
    this.uStrength = gl.getUniformLocation(program, "uStrength");
  }

  setLut(lut: ParsedLut): void {
    const gl = this.gl;
    const hald = buildHald(lut);
    gl.activeTexture(gl.TEXTURE1);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    // PENTING: pixelStorei adalah state GLOBAL konteks. Pastikan FLIP_Y=false
    // saat upload atlas (typed array) — render() men-scope FLIP_Y=true hanya
    // untuk upload source DOM dan langsung di-reset (lihat §6o).
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGB,
      hald.width,
      hald.height,
      0,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      hald.data,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Wajib: tanpa ini uSize/uGrid default 0 → lookup negatif → output gelap.
    gl.useProgram(this.program);
    gl.uniform1f(this.uSize, lut.size);
    gl.uniform1f(this.uGrid, Math.ceil(Math.sqrt(lut.size)));
    gl.uniform1f(this.uStrength, 1);
  }

  setStrength(strength: number): void {
    this.gl.useProgram(this.program);
    this.gl.uniform1f(this.uStrength, Math.max(0, Math.min(1, strength)));
  }

  /** Render sumber (video/canvas 2D) yang sudah di-grade ke `out` canvas. */
  render(src: TexImageSource, sw: number, sh: number, out: HTMLCanvasElement): void {
    const gl = this.gl;
    if (out.width !== sw || out.height !== sh) {
      out.width = sw;
      out.height = sh;
    }
    if (this.canvas.width !== sw || this.canvas.height !== sh) {
      this.canvas.width = sw;
      this.canvas.height = sh;
    }

    gl.viewport(0, 0, sw, sh);
    gl.useProgram(this.program);

    // DOM source (canvas) di-upload baris-atas dulu; texture v=0 = baris atas.
    // Tanpa FLIP_Y gambar tampil terbalik (kepala ke bawah) — pola yang sama
    // dipakai MediaPipe sendiri (gpuOriginForWebTexturesIsBottomLeft).
    // FLIP_Y di-scope ketat: reset ke false setelah upload, supaya state
    // global tidak bocor ke upload lain (mis. atlas LUT di setLut — §6o).
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.uniform1i(gl.getUniformLocation(this.program, "uSrc"), 0);
    gl.uniform1i(gl.getUniformLocation(this.program, "uLut"), 1);

    const aPos = gl.getAttribLocation(this.program, "aPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.flush();

    const ctx = out.getContext("2d");
    if (ctx) ctx.drawImage(this.canvas, 0, 0);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteTexture(this.srcTex);
    gl.deleteTexture(this.lutTex);
    gl.deleteBuffer(this.buf);
    gl.deleteProgram(this.program);
  }
}

// Reuse satu renderer untuk semua komponen (satu konteks WebGL).
let sharedRenderer: LutRenderer | null = null;

export function getLutRenderer(): LutRenderer | null {
  if (!sharedRenderer) {
    try {
      sharedRenderer = new LutRenderer();
    } catch {
      sharedRenderer = null;
    }
  }
  return sharedRenderer;
}
