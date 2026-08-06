// Equilibrium Design System — Color Tokens
// Extracted from Study-Life Harmony Planner Stitch project

export const Colors = {
  // Primary (Mint/Teal) — Academic & Focus
  primary: '#006a66',
  onPrimary: '#ffffff',
  primaryContainer: '#38b2ac',
  onPrimaryContainer: '#003f3d',
  primaryFixed: '#84f5ee',
  primaryFixedDim: '#66d8d2',
  onPrimaryFixed: '#00201e',
  onPrimaryFixedVariant: '#00504d',
  inversePrimary: '#66d8d2',

  // Secondary (Soft Gold) — Work & Professional
  secondary: '#875200',
  onSecondary: '#ffffff',
  secondaryContainer: '#ffb55c',
  onSecondaryContainer: '#744600',
  secondaryFixed: '#ffddba',
  secondaryFixedDim: '#ffb866',
  onSecondaryFixed: '#2b1700',
  onSecondaryFixedVariant: '#673d00',

  // Tertiary (Soft Green) — Routines & Wellness
  tertiary: '#006d3d',
  onTertiary: '#ffffff',
  tertiaryContainer: '#49b576',
  onTertiaryContainer: '#004123',
  tertiaryFixed: '#8df8b3',
  tertiaryFixedDim: '#70db99',
  onTertiaryFixed: '#00210f',
  onTertiaryFixedVariant: '#00522d',

  // Error
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Surface / Background (Neutral)
  background: '#f8f9fa',
  onBackground: '#191c1d',
  surface: '#f8f9fa',
  surfaceDim: '#d9dadb',
  surfaceBright: '#f8f9fa',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f5',
  surfaceContainer: '#edeeef',
  surfaceContainerHigh: '#e7e8e9',
  surfaceContainerHighest: '#e1e3e4',
  onSurface: '#191c1d',
  onSurfaceVariant: '#3d4948',
  surfaceVariant: '#e1e3e4',
  inverseSurface: '#2e3132',
  inverseOnSurface: '#f0f1f2',
  surfaceTint: '#006a66',

  // Outline
  outline: '#6d7a78',
  outlineVariant: '#bcc9c7',
} as const;

export type ColorKey = keyof typeof Colors;
