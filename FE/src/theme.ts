import { dark } from '@clerk/themes';

export const colors = {
  bg: {
    base: '#080B14',
    surface: '#0E1220',
    elevated: '#141828',
    overlay: '#1A2030',
  },
  border: {
    subtle:  'rgba(255,255,255,0.06)',
    default: 'rgba(255,255,255,0.10)',
    strong:  'rgba(255,255,255,0.18)',
    accent:  'rgba(139,92,246,0.40)',
  },
  primary: {
    50:  '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  accent: {
    400: '#22D3EE',
    500: '#06B6D4',
    600: '#0891B2',
  },
  text: {
    primary:   '#F8FAFC',
    secondary: '#94A3B8',
    tertiary:  '#64748B',
    inverse:   '#080B14',
    accent:    '#A78BFA',
  },
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    error:   '#EF4444',
    info:    '#3B82F6',
  },
  gradient: {
    brand:       'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
    brandSoft:   'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(6,182,212,0.08) 100%)',
    heroGlow:    'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139,92,246,0.35) 0%, transparent 60%)',
    cardGlow:    'radial-gradient(ellipse at top, rgba(139,92,246,0.12) 0%, transparent 70%)',
    text:        'linear-gradient(90deg, #C4B5FD 0%, #67E8F9 100%)',
    surface:     'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
    cta:         'linear-gradient(135deg, #7C3AED 0%, #0891B2 100%)',
    overlay:     'linear-gradient(180deg, rgba(8,11,20,0) 0%, rgba(8,11,20,0.9) 100%)',
  },
} as const;

export const spacing = {
  px:  '1px',
  0:   '0',
  0.5: '2px',
  1:   '4px',
  1.5: '6px',
  2:   '8px',
  2.5: '10px',
  3:   '12px',
  3.5: '14px',
  4:   '16px',
  5:   '20px',
  6:   '24px',
  7:   '28px',
  8:   '32px',
  9:   '36px',
  10:  '40px',
  12:  '48px',
  14:  '56px',
  16:  '64px',
  20:  '80px',
  24:  '96px',
  28:  '112px',
  32:  '128px',
} as const;

export const typography = {
  fontFamily: {
    sans:    "'Inter', system-ui, -apple-system, sans-serif",
    heading: "'Inter', system-ui, -apple-system, sans-serif",
    mono:    "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
  },
  fontSize: {
    xs:   '0.75rem',
    sm:   '0.875rem',
    base: '1rem',
    lg:   '1.125rem',
    xl:   '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
  },
  fontWeight: {
    normal:    '400',
    medium:    '500',
    semibold:  '600',
    bold:      '700',
    extrabold: '800',
  },
  lineHeight: {
    tight:   '1.2',
    snug:    '1.35',
    normal:  '1.5',
    relaxed: '1.625',
  },
  letterSpacing: {
    tight:  '-0.04em',
    snug:   '-0.02em',
    normal: '0',
    wide:   '0.02em',
    wider:  '0.05em',
  },
} as const;

export const radius = {
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '18px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
} as const;

export const shadows = {
  sm:      '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
  md:      '0 4px 12px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3)',
  lg:      '0 10px 30px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
  xl:      '0 20px 50px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.35)',
  glow:    '0 0 40px rgba(139,92,246,0.25), 0 0 80px rgba(139,92,246,0.10)',
  glowSm:  '0 0 16px rgba(139,92,246,0.30)',
  inner:   'inset 0 1px 0 rgba(255,255,255,0.06)',
  card:    '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
} as const;

export const animation = {
  duration: {
    instant: '75ms',
    fast:    '150ms',
    normal:  '250ms',
    slow:    '400ms',
    slower:  '600ms',
  },
  easing: {
    default:   'cubic-bezier(0.4, 0, 0.2, 1)',
    in:        'cubic-bezier(0.4, 0, 1, 1)',
    out:       'cubic-bezier(0, 0, 0.2, 1)',
    spring:    'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

export const glass = {
  subtle: {
    background:     'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(8px)',
    border:         '1px solid rgba(255,255,255,0.07)',
  },
  medium: {
    background:     'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(16px)',
    border:         '1px solid rgba(255,255,255,0.10)',
  },
  strong: {
    background:     'rgba(255,255,255,0.10)',
    backdropFilter: 'blur(24px)',
    border:         '1px solid rgba(255,255,255,0.14)',
  },
  brand: {
    background:     'rgba(139,92,246,0.08)',
    backdropFilter: 'blur(16px)',
    border:         '1px solid rgba(139,92,246,0.25)',
  },
} as const;

export const breakpoints = {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl': '1536px',
} as const;

export const zIndex = {
  hide:    -1,
  base:     0,
  raised:   10,
  dropdown: 100,
  sticky:   200,
  overlay:  300,
  modal:    400,
  toast:    500,
} as const;

export const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorBackground:      '#0E1220',
    colorInputBackground: 'rgba(255, 255, 255, 0.05)',
    colorInputText:       '#FFFFFF',
    colorText:            '#FFFFFF',
    colorTextSecondary:   '#E2E8F0',
    colorPrimary:         '#8B5CF6',
    colorDanger:          '#EF4444',
    borderRadius:         '10px',
    fontFamily:           "'Inter', system-ui, sans-serif",
    fontSize:             '15px',
  },
  elements: {
    card:                     'wx-clerk-card',
    rootBox:                  'wx-clerk-root',
    headerTitle:              'wx-clerk-title',
    socialButtonsBlockButton: 'wx-clerk-social-btn',
    socialButtonsBlockButtonText: { color: '#FFFFFF' },
    formButtonPrimary:        'wx-clerk-primary-btn',
    footerActionLink:         'wx-clerk-footer-link',
    formFieldInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: '#FFFFFF',
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    formFieldLabel:       { color: '#E2E8F0' },
    formFieldHintText:    { color: '#94A3B8' },
    formFieldInfoText:    { color: '#94A3B8' },
    formFieldSuccessText: { color: '#10B981' },
    headerSubtitle:       { color: '#94A3B8' },
    dividerLine:          { background: 'rgba(255, 255, 255, 0.15)' },
    dividerText:          { color: '#94A3B8' },
    formFieldAction:      { color: '#A78BFA' },
    footer:               { display: 'none' },
    footerActionText:     { color: '#94A3B8' },
    badge:                { color: '#94A3B8' },
    providerIcon__github: { filter: 'invert(1)' },
  },
} as const;
