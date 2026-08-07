/**
 * Waiting Room Theme Tokens — Light & Dark variants
 * Use these tokens in all waiting room components for consistent theming.
 */

export const waitingRoomTheme = {
  light: {
    background: '#FAFBFF',
    backgroundSecondary: '#F0F4FF',
    textPrimary: '#1a1a2e',
    textSecondary: '#5a5a7a',
    textMuted: '#9ca3af',
    card: 'rgba(255, 255, 255, 0.7)',
    cardBorder: 'rgba(0, 0, 0, 0.08)',
    cardShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    accent: '#EC4899',
    accentSecondary: '#8B5CF6',
    accentTertiary: '#3B82F6',
    glow: 'rgba(236, 72, 153, 0.15)',
    glowPurple: 'rgba(139, 92, 246, 0.15)',
    glowBlue: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(0, 0, 0, 0.1)',
    borderHover: 'rgba(139, 92, 246, 0.4)',
    buttonBg: 'rgba(255, 255, 255, 0.5)',
    buttonBgHover: 'rgba(255, 255, 255, 0.8)',
    badgeBg: 'rgba(236, 72, 153, 0.1)',
    badgeText: '#EC4899',
    overlay: 'rgba(255, 255, 255, 0.85)',
    navBlur: 'rgba(255, 255, 255, 0.05)',
    navBorder: 'rgba(0, 0, 0, 0.12)',
    statCardBg: 'rgba(255, 255, 255, 0.6)',
    inputBg: 'rgba(255, 255, 255, 0.8)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowColor: 'rgba(139, 92, 246, 0.15)',
  },
  dark: {
    background: '#050510',
    backgroundSecondary: '#0a0a1e',
    textPrimary: '#ffffff',
    textSecondary: '#9CA3AF',
    textMuted: '#6b7280',
    card: 'rgba(20, 20, 28, 0.75)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    cardShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    accent: '#EC4899',
    accentSecondary: '#8B5CF6',
    accentTertiary: '#3B82F6',
    glow: 'rgba(236, 72, 153, 0.3)',
    glowPurple: 'rgba(139, 92, 246, 0.25)',
    glowBlue: 'rgba(59, 130, 246, 0.2)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderHover: 'rgba(168, 85, 247, 0.4)',
    buttonBg: 'rgba(255, 255, 255, 0.05)',
    buttonBgHover: 'rgba(255, 255, 255, 0.08)',
    badgeBg: 'rgba(236, 72, 153, 0.15)',
    badgeText: '#F472B6',
    overlay: 'rgba(17, 24, 39, 0.85)',
    navBlur: 'rgba(255, 255, 255, 0.05)',
    navBorder: 'rgba(255, 255, 255, 0.12)',
    statCardBg: 'rgba(17, 18, 23, 0.6)',
    inputBg: 'rgba(17, 18, 23, 0.8)',
    shadow: 'rgba(0, 0, 0, 0.5)',
    shadowColor: 'rgba(168, 85, 247, 0.15)',
  },
} as const

export type ThemeMode = 'light' | 'dark'

export function getWaitingRoomTheme(mode: ThemeMode) {
  return waitingRoomTheme[mode]
}