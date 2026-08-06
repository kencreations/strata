// Equilibrium Design System — Typography Scale

export const Typography = {
  displayLg: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700' as const,
    letterSpacing: -0.68,
    fontFamily: 'Inter_700Bold',
  },
  headlineMd: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.22,
    fontFamily: 'Inter_600SemiBold',
  },
  headlineSm: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.17,
    fontFamily: 'Inter_600SemiBold',
  },
  bodyLg: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: -0.17,
    fontFamily: 'Inter_400Regular',
  },
  bodyMd: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: 0,
    fontFamily: 'Inter_400Regular',
  },
  labelMd: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
    letterSpacing: 0.13,
    fontFamily: 'Inter_500Medium',
  },
  labelSm: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.22,
    fontFamily: 'Inter_600SemiBold',
  },
} as const;
