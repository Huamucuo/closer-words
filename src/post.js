// post.js — WebGL2 finishing pass: bloom, chromatic aberration, CRT, vignette, film grain.
(() => {
  const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

  const BRIGHT = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D t; uniform vec2 px; uniform float th;
void main(){
  vec3 c = texture(t, uv + px * vec2(-1.0, -1.0)).rgb + texture(t, uv + px * vec2(1.0, -1.0)).rgb
         + texture(t, uv + px * vec2(-1.0, 1.0)).rgb + texture(t, uv + px * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  o = vec4(c * smoothstep(th, th + 0.35, l), 1.0);
}`;

  const BLUR = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D t; uniform vec2 dir;
void main(){
  vec3 c = texture(t, uv).rgb * 0.227027;
  c += (texture(t, uv + dir * 1.3846).rgb + texture(t, uv - dir * 1.3846).rgb) * 0.316216;
  c += (texture(t, uv + dir * 3.2308).rgb + texture(t, uv - dir * 3.2308).rgb) * 0.070270;
  o = vec4(c, 1.0);
}`;

  const COMP = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D s, b1, b2;
uniform float crt, bloom, ca, vig, grain, seed;
uniform vec2 res;
float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec2 c = uv - 0.5;
  float k = crt * 0.11;
  vec2 d = c * (1.0 + k * dot(c, c) * 4.0) / (1.0 + k * 0.55);
  vec2 u = d + 0.5;
  vec2 e = smoothstep(vec2(0.0), vec2(0.006), u) * smoothstep(vec2(0.0), vec2(0.006), 1.0 - u);
  float edge = mix(1.0, e.x * e.y, step(0.001, crt));
  vec2 off = d * ca * 0.0045 * (0.35 + dot(d, d) * 2.2);
  vec3 col = vec3(texture(s, u + off).r, texture(s, u).g, texture(s, u - off).b);
  col += (texture(b1, u).rgb * 0.75 + texture(b2, u).rgb * 1.1) * bloom;
  if (crt > 0.001) {
    float sl = 0.5 + 0.5 * cos(u.y * res.y * 3.14159265 * 0.5);
    col *= 1.0 - crt * 0.24 * sl;
    float m = mod(gl_FragCoord.x, 3.0);
    vec3 mask = vec3(m < 1.0 ? 1.0 : 0.84, (m >= 1.0 && m < 2.0) ? 1.0 : 0.84, m >= 2.0 ? 1.0 : 0.84);
    col *= mix(vec3(1.0), mask, crt * 0.4) * (1.0 + crt * 0.12);
  }
  float v = smoothstep(0.92, 0.18, length(c * vec2(1.0, 1.12)) * 1.08);
  col *= mix(1.0, v, vig);
  vec3 bg = vec3(10.0, 11.0, 16.0) / 255.0;
  col = mix(bg * 0.4, col, edge);
  vec2 fc = gl_FragCoord.xy;
  float n = h(fc + seed * vec2(37.17, 91.73)) + h(fc * 1.31 + seed * vec2(13.7, 7.3)) - 1.0;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col += n * grain * (0.55 + 0.6 * sqrt(clamp(lum, 0.0, 1.0)));
  col += (h(fc + seed * 3.1 + 0.5) - 0.5) / 255.0;
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  class Post {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = (this.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false }));
      if (!gl) { this.g2 = canvas.getContext('2d'); console.warn('WebGL2 unavailable — post disabled'); return; }
      const W = canvas.width, H = canvas.height;
      this.W = W; this.H = H;
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      this.pBright = this.prog(BRIGHT); this.pBlur = this.prog(BLUR); this.pComp = this.prog(COMP);
      this.srcTex = this.tex(W, H);
      this.l1 = [this.target(W / 4, H / 4), this.target(W / 4, H / 4)];
      this.l2 = [this.target(W / 8, H / 8), this.target(W / 8, H / 8)];
    }
    prog(fs) {
      const gl = this.gl;
      const sh = (type, src) => {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      p.u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; p.u[name] = gl.getUniformLocation(p, name); }
      return p;
    }
    tex(w, h) {
      const gl = this.gl, t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      t.w = w; t.h = h; return t;
    }
    target(w, h) {
      const gl = this.gl, t = this.tex(w, h), fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return { t, fb, w, h };
    }
    pass(p, out, binds, uni) {
      const gl = this.gl;
      gl.useProgram(p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
      gl.viewport(0, 0, out ? out.w : this.W, out ? out.h : this.H);
      binds.forEach(([name, tex], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(p.u[name], i); });
      for (const k in uni) { const v = uni[k]; if (p.u[k] == null) continue; Array.isArray(v) ? gl.uniform2f(p.u[k], v[0], v[1]) : gl.uniform1f(p.u[k], v); }
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    render(src, o, frame) {
      if (!this.gl) { this.g2.drawImage(src, 0, 0); return; }
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);
      const [a1, b1] = this.l1, [a2, b2] = this.l2;
      this.pass(this.pBright, a1, [['t', this.srcTex]], { px: [1 / this.W, 1 / this.H], th: o.thresh });
      this.pass(this.pBlur, b1, [['t', a1.t]], { dir: [1 / a1.w, 0] });
      this.pass(this.pBlur, a1, [['t', b1.t]], { dir: [0, 1 / a1.h] });
      this.pass(this.pBlur, a2, [['t', a1.t]], { dir: [1.5 / a2.w, 0] });
      this.pass(this.pBlur, b2, [['t', a2.t]], { dir: [0, 1.5 / a2.h] });
      this.pass(this.pBlur, a2, [['t', b2.t]], { dir: [2.5 / a2.w, 0] });
      this.pass(this.pBlur, b2, [['t', a2.t]], { dir: [0, 2.5 / a2.h] });
      this.pass(this.pComp, null, [['s', this.srcTex], ['b1', a1.t], ['b2', b2.t]], {
        crt: o.crt, bloom: o.bloom, ca: o.ca, vig: o.vig, grain: o.grain, seed: frame % 997, res: [this.W, this.H],
      });
    }
  }
  F.Post = Post;
})();
