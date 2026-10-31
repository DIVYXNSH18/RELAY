/**
 * Design tokens for the Relay app.
 * All colours, gradients, radii, and typography scale live here.
 * Components import from this file — never hardcode values inline.
 */

export const Colors = {
  // ── Backgrounds ───────────────────────────────────────────────────────────
  bg: {
    base:    '#080B14', // Screen background — deep navy-black
    surface: '#0F1724', // Cards, modals
    elevated:'#151E30', // Inputs, pressed states
  },

  // ── Glass ─────────────────────────────────────────────────────────────────
  glass: {
    fill:   'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.10)',
    strong: 'rgba(255, 255, 255, 0.12)',
  },

  // ── Accent — Role colours ─────────────────────────────────────────────────
  accent: {
    coder:    '#6C63FF', // Electric purple — Coder role
    debugger: '#00D4FF', // Cyan — Debugger role
    deployer: '#FFB800', // Amber — Deployer role
    primary:  '#6C63FF',
  },

  // ── Gradients (start/end pairs for LinearGradient) ───────────────────────
  gradient: {
    coder:    ['#6C63FF', '#3B37CC'] as [string, string],
    debugger: ['#00D4FF', '#0077AA'] as [string, string],
    deployer: ['#FFB800', '#CC8800'] as [string, string],
    card:     ['rgba(108,99,255,0.15)', 'rgba(0,212,255,0.05)'] as [string, string],
  },

  // ── Significance ─────────────────────────────────────────────────────────
  sig: {
    high:    '#FF4757',
    medium:  '#FFA502',
    suppress:'#57606A',
  },

  // ── Neutrals ──────────────────────────────────────────────────────────────
  text: {
    primary:   '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.60)',
    tertiary:  'rgba(255, 255, 255, 0.35)',
  },

  // ── Semantic ──────────────────────────────────────────────────────────────
  success: '#2ED573',
  error:   '#FF4757',
  warning: '#FFA502',
} as const;

export const Radius = {
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  full: 9999,
} as const;

export const Font = {
  sizes: {
    xs:  11,
    sm:  13,
    md:  15,
    lg:  18,
    xl:  22,
    xxl: 28,
    h1:  36,
  },
  weights: {
    regular: '400' as const,
    medium:  '500' as const,
    semibold:'600' as const,
    bold:    '700' as const,
    heavy:   '800' as const,
  },
} as const;

export const Shadow = {
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  }),
} as const;
