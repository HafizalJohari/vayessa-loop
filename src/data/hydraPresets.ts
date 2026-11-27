import type { HydraPreset } from '@/types/studio';

export const HYDRA_PRESETS: HydraPreset[] = [
  {
    id: 'obsidian-chrome',
    name: 'Obsidian Liquid Chrome',
    description: 'Luxury dark mercury ripples with specular silver sheen & subtle cyan rim light.',
    code: `// Obsidian Liquid Chrome — Modern TouchDesigner-inspired metallic fluid
noise(() => 2.2 + studio.m1 * 3.5, 0.08)
  .modulate(
    noise(() => 3.5 + studio.m2 * 4, 0.12).rotate(() => time * 0.08),
    () => 0.45 + studio.bass * 0.55
  )
  .contrast(() => 2.4 + studio.bass * 0.9)
  .brightness(-0.18)
  .color(0.78, 0.9, 1.0)
  .blend(
    src(o0)
      .scale(() => 1.008 + studio.bass * 0.025)
      .brightness(-0.04),
    0.72
  )
  .luma(0.18, 0.12)
  .out(o0)`,
  },
  {
    id: 'prism-glass',
    name: 'Anamorphic Prism Glass',
    description: 'Refractive frosted glass waves with true RGB chromatic aberration split.',
    code: `// Anamorphic Prism Glass — Frosted refraction + RGB chromatic split
osc(() => 6 + studio.m1 * 10, 0.04, 0.0)
  .modulate(noise(() => 2 + studio.m2 * 3, 0.08), () => 0.35 + studio.bass * 0.45)
  .rotate(() => 0.35 + Math.sin(time * 0.2) * 0.2)
  .contrast(1.8)
  .color(0.95, 0.2, 0.35)
  .add(
    osc(() => 6 + studio.m1 * 10, 0.04, 0.0)
      .modulate(noise(() => 2 + studio.m2 * 3, 0.08), () => 0.35 + studio.bass * 0.45)
      .rotate(() => 0.35 + Math.sin(time * 0.2) * 0.2)
      .scrollX(() => 0.008 + studio.high * 0.02)
      .contrast(1.8)
      .color(0.15, 0.92, 0.75)
  )
  .add(
    osc(() => 6 + studio.m1 * 10, 0.04, 0.0)
      .modulate(noise(() => 2 + studio.m2 * 3, 0.08), () => 0.35 + studio.bass * 0.45)
      .rotate(() => 0.35 + Math.sin(time * 0.2) * 0.2)
      .scrollX(() => -0.008 - studio.high * 0.02)
      .contrast(1.8)
      .color(0.2, 0.45, 1.0)
  )
  .blend(src(o0).scale(1.01), 0.55)
  .out(o0)`,
  },
  {
    id: 'brutalist-grid',
    name: 'Brutalist Kinetic Grid',
    description: 'High-contrast monochrome architectural laser grid (club / Boiler Room aesthetic).',
    code: `// Brutalist Kinetic Grid — Crisp monochrome architectural lines
osc(() => 28 + Math.floor(studio.m1 * 32), 0.0, 0.0)
  .thresh(() => 0.88 - studio.bass * 0.14, 0.015)
  .add(
    osc(() => 28 + Math.floor(studio.m1 * 32), 0.0, 0.0)
      .rotate(Math.PI / 2)
      .thresh(() => 0.88 - studio.mid * 0.12, 0.015)
  )
  .modulateScale(
    shape(4, () => 0.35 + studio.bass * 0.35, 0.08),
    () => 0.12 + studio.m2 * 0.45
  )
  .scrollY(() => time * 0.06)
  .contrast(1.6)
  .color(0.92, 0.96, 1.0)
  .blend(src(o0).scale(1.015).brightness(-0.08), 0.6)
  .out(o0)`,
  },
  {
    id: 'infrared-aura',
    name: 'Infrared Thermal Aura',
    description: 'Editorial thermal-camera gradient (deep indigo to ultraviolet & molten coral).',
    code: `// Infrared Thermal Aura — Smooth fluid advection with editorial thermal palette
voronoi(() => 3 + studio.m1 * 5, 0.12, 0.65)
  .modulate(noise(() => 2.5 + studio.m2 * 3, 0.1), () => 0.4 + studio.bass * 0.5)
  .brightness(-0.15)
  .contrast(2.1)
  .color(1.0, 0.22, 0.48)
  .add(
    noise(1.8, 0.06)
      .thresh(0.45, 0.35)
      .color(0.18, 0.12, 0.85)
  )
  .hue(() => studio.m3 * 0.35 + studio.mid * 0.12)
  .blend(src(o0).scale(() => 1.006 + studio.bass * 0.02), 0.68)
  .saturate(1.25)
  .out(o0)`,
  },
  {
    id: 'optical-moire',
    name: 'Optical Moire Field',
    description: 'Hypnotic ultra-sharp moire interference waves with electric cobalt highlights.',
    code: `// Optical Moire Field — High-precision interference geometry
osc(() => 45 + studio.m1 * 50, 0.01, 0)
  .rotate(() => 0.08 + Math.sin(time * 0.18) * 0.12)
  .diff(
    osc(() => 44 + studio.m1 * 50, 0.01, 0)
      .rotate(() => -0.08 - Math.sin(time * 0.18) * 0.12 + studio.bass * 0.15)
      .scale(() => 1.0 + studio.m2 * 0.15)
  )
  .contrast(2.2)
  .color(0.35, 0.62, 1.0)
  .mult(shape(99, () => 0.72 + studio.bass * 0.18, 0.28))
  .blend(src(o0).scale(1.004), 0.45)
  .out(o0)`,
  },
  {
    id: 'hyper-tunnel',
    name: 'Hyperbolic Dark Portal',
    description: 'Minimalist expanding obsidian light rings reacting tightly to every kick drum.',
    code: `// Hyperbolic Dark Portal — Expanding beat-locked light halo
shape(99, () => 0.26 + studio.bass * 0.32, 0.015)
  .diff(shape(99, () => 0.23 + studio.bass * 0.3, 0.015))
  .color(0.22, 0.95, 0.78)
  .add(
    shape(99, () => 0.45 + studio.high * 0.22, 0.008)
      .diff(shape(99, () => 0.435 + studio.high * 0.22, 0.008))
      .color(0.55, 0.35, 1.0)
  )
  .modulate(noise(() => 2 + studio.m1 * 5, 0.15), () => 0.04 + studio.m2 * 0.18)
  .blend(
    src(o0)
      .scale(() => 1.04 + studio.bass * 0.05)
      .rotate(() => 0.015 * (studio.m3 - 0.5))
      .brightness(-0.04),
    0.84
  )
  .out(o0)`,
  },
  {
    id: 'cyber-halftone',
    name: 'Editorial Halftone Matrix',
    description: 'Brutalist pixelated dot matrix with electric acid-lime pulse on deep charcoal.',
    code: `// Editorial Halftone Matrix — Crisp pixel-quantized audio surface
noise(() => 2.5 + studio.m1 * 4, 0.15)
  .pixelate(() => 28 + Math.floor(studio.m2 * 40), () => 18 + Math.floor(studio.m2 * 26))
  .thresh(() => 0.48 - studio.bass * 0.2, 0.06)
  .color(0.75, 1.0, 0.28)
  .mult(
    osc(90, 0, 0).thresh(0.35, 0.05)
  )
  .blend(src(o0).brightness(-0.1), 0.55)
  .out(o0)`,
  },
  {
    id: 'webcam-drop',
    name: 'Webcam Chrome & RGB Split',
    description: 'Modern editorial webcam (s0.initCam) with liquid feedback & anamorphic RGB split.',
    code: `// Webcam Chrome & RGB Split — Modern club camera visual
s0.initCam()
src(s0)
  .scale(-1, 1, 1)
  .saturate(0.15)
  .contrast(1.65)
  .brightness(-0.08)
  .color(0.9, 0.95, 1.0)
  .add(
    src(s0)
      .scale(-1, 1, 1)
      .scrollX(() => 0.01 + studio.bass * 0.03)
      .saturate(0)
      .contrast(1.8)
      .color(0.15, 0.95, 0.85),
    0.35
  )
  .blend(
    src(o0)
      .scale(() => 1.015 + studio.bass * 0.05)
      .brightness(-0.03),
    0.74
  )
  .out(o0)`,
  },
  {
    id: 'mapping-monolith',
    name: '3D Mapping: Architectural Monolith',
    description: 'Facade projection mapping with illuminated 3D blocks, sweeping light beams & crisp edges.',
    code: `// 3D Mapping: Architectural Monolith — Stage facade light sweep
shape(4, () => 0.55 + studio.bass * 0.12, 0.008)
  .diff(shape(4, () => 0.52 + studio.bass * 0.12, 0.008))
  .repeat(() => 3 + Math.floor(studio.m1 * 3), () => 2 + Math.floor(studio.m2 * 3))
  .color(0.92, 0.97, 1.0)
  .add(
    osc(8, 0.06, 0)
      .rotate(0.785)
      .thresh(() => 0.72 - studio.bass * 0.25, 0.02)
      .mult(shape(4, 0.54, 0.01).repeat(() => 3 + Math.floor(studio.m1 * 3), () => 2 + Math.floor(studio.m2 * 3)))
      .color(0.2, 0.85, 1.0),
    0.85
  )
  .modulateScale(
    shape(4, 0.6, 0.2).repeat(3, 2),
    () => 0.06 + studio.bass * 0.22
  )
  .blend(src(o0).scale(1.012).brightness(-0.06), 0.62)
  .out(o0)`,
  },
  {
    id: 'mapping-isometric',
    name: '3D Mapping: Isometric Cube Wall',
    description: 'Extruding 3D isometric hexagonal cube wall with directional light shading & beat depth.',
    code: `// 3D Mapping: Isometric Cube Wall — Extruding 3D geometric relief
shape(6, () => 0.42 + studio.bass * 0.14, 0.01)
  .repeat(() => 4 + Math.floor(studio.m1 * 4), () => 3 + Math.floor(studio.m1 * 3), 0.5, 0.5)
  .modulate(
    noise(() => 2 + studio.m2 * 3, 0.08),
    () => 0.05 + studio.bass * 0.14
  )
  .diff(
    shape(6, () => 0.36 + studio.bass * 0.12, 0.008)
      .repeat(() => 4 + Math.floor(studio.m1 * 4), () => 3 + Math.floor(studio.m1 * 3), 0.5, 0.5)
      .scrollX(0.012)
      .scrollY(0.012)
  )
  .contrast(1.9)
  .color(0.85, 0.94, 1.0)
  .add(
    gradient(0.4)
      .hue(() => studio.m3 + time * 0.04)
      .mult(shape(6, 0.35, 0.02).repeat(() => 4 + Math.floor(studio.m1 * 4), () => 3 + Math.floor(studio.m1 * 3), 0.5, 0.5)),
    0.35
  )
  .out(o0)`,
  },
  {
    id: 'mapping-wireframe',
    name: '3D Mapping: Perspective Corridor',
    description: 'Deep 3D vanishing-point architectural tunnel with beat-locked structural laser ribs.',
    code: `// 3D Mapping: Perspective Corridor — Vanishing-point 3D stage depth
shape(4, () => 0.22 + studio.bass * 0.28, 0.006)
  .diff(shape(4, () => 0.205 + studio.bass * 0.27, 0.006))
  .color(0.95, 0.98, 1.0)
  .add(
    shape(4, () => 0.5 + studio.mid * 0.18, 0.005)
      .diff(shape(4, () => 0.49 + studio.mid * 0.18, 0.005))
      .color(0.18, 0.92, 0.85)
  )
  .rotate(() => (studio.m1 - 0.5) * 0.6)
  .blend(
    src(o0)
      .scale(() => 1.06 + studio.bass * 0.07)
      .scrollX(() => (studio.m2 - 0.5) * 0.015)
      .scrollY(() => (studio.m3 - 0.5) * 0.015)
      .brightness(-0.035),
    0.88
  )
  .out(o0)`,
  },
  {
    id: 'mapping-topography',
    name: '3D Mapping: Elevation Contours',
    description: '3D topographic terrain contours & luminous relief lines sculpted by bass frequencies.',
    code: `// 3D Mapping: Elevation Contours — Sculpted 3D topographic lines
noise(() => 2.2 + studio.m1 * 3, 0.07)
  .modulate(noise(3, 0.05), () => 0.35 + studio.bass * 0.4)
  .mult(osc(() => 18 + studio.m2 * 24, 0.02, 0))
  .thresh(0.45, 0.03)
  .diff(
    noise(() => 2.2 + studio.m1 * 3, 0.07)
      .modulate(noise(3, 0.05), () => 0.35 + studio.bass * 0.4)
      .mult(osc(() => 18 + studio.m2 * 24, 0.02, 0))
      .thresh(0.52, 0.03)
  )
  .color(0.28, 0.92, 0.98)
  .contrast(1.8)
  .blend(src(o0).scale(1.006).brightness(-0.05), 0.6)
  .out(o0)`,
  },
];
