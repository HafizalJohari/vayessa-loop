// VAYESSA LOOP — Obsidian Liquid Chrome & Hairline Spectral Field (vgpu WGSL)
struct Params {
  time: f32,
  aspect: f32,
  mouse: vec2f,
}

@group(0) @binding(0) var<uniform> params: Params;

fn hash21(p: vec2f) -> f32 {
  var q = fract(p * vec2f(123.34, 456.21));
  q += dot(q, q + 45.32);
  return fract(q.x * q.y);
}

fn noise2d(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);

  let a = hash21(i);
  let b = hash21(i + vec2f(1.0, 0.0));
  let c = hash21(i + vec2f(0.0, 1.0));
  let d = hash21(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn fbm(p_in: vec2f) -> f32 {
  var p = p_in;
  var value = 0.0;
  var amp = 0.5;
  let rot = mat2x2f(0.8, 0.6, -0.6, 0.8);
  for (var i = 0; i < 4; i++) {
    value += amp * noise2d(p);
    p = rot * p * 2.05;
    amp *= 0.5;
  }
  return value;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time * 0.22;
  let centered = (uv - vec2f(0.5, 0.5)) * vec2f(params.aspect, 1.0);
  let mouseCentered = (params.mouse - vec2f(0.5, 0.5)) * vec2f(params.aspect, 1.0);

  // Subtle magnetic cursor parallax
  let p = centered * 2.35 - mouseCentered * 0.18;

  // Domain-warped obsidian liquid chrome field
  let q = vec2f(
    fbm(p + vec2f(t * 0.6, -t * 0.35)),
    fbm(p + vec2f(5.2 - t * 0.4, 1.3 + t * 0.5))
  );
  let f = fbm(p + 2.4 * q + vec2f(1.7, 9.2) + t * 0.25);

  // Ultra-crisp topographic hairline contours
  let contourWave = abs(fract(f * 11.0 - t * 0.35) - 0.5) * 2.0;
  let hairline = smoothstep(0.93, 0.995, contourWave);

  // Specular metallic sheen
  let sheen = smoothstep(0.38, 0.85, f);
  let distCenter = length(centered);
  let centerHalo = exp(-distCenter * 2.4);
  let cursorGlow = exp(-length(centered - mouseCentered) * 3.8);

  // Obsidian palette + emerald (#34d399) & electric cyan (#38bdf8) hairlines
  let obsidian = vec3f(0.032, 0.038, 0.052);
  let chrome = vec3f(0.085, 0.105, 0.145);
  let emerald = vec3f(0.204, 0.827, 0.600);
  let cyan = vec3f(0.220, 0.741, 0.973);

  var col = mix(obsidian, chrome, sheen * 0.75);
  let accent = mix(emerald, cyan, clamp(q.x * 1.15, 0.0, 1.0));

  col += accent * hairline * (0.28 + 0.35 * centerHalo + 0.35 * cursorGlow);
  col += emerald * centerHalo * 0.09;
  col += cyan * cursorGlow * 0.11;

  // Subtle architectural vignette
  let vignette = smoothstep(1.35, 0.25, distCenter);
  col *= (0.45 + 0.55 * vignette);

  return vec4f(col, 1.0);
}
