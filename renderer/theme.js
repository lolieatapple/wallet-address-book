import { createContext, useContext } from 'react';
import { createTheme } from '@mui/material/styles';

// Monochrome ledger aesthetic: ink on paper, 1px hairlines, zero elevation.
// The ONLY color in the UI is the amber accent (default-wallet star, focus
// states); muted red is reserved for destructive/error semantics.
export const ACCENT = '#E8A200';
export const MONO_FONT =
  "'SF Mono', ui-monospace, 'JetBrains Mono', 'Menlo', 'Consolas', monospace";
const DISPLAY_FONT =
  "'Avenir Next', 'Futura', 'Helvetica Neue', 'Segoe UI', sans-serif";

export function buildTheme(mode) {
  const isDark = mode === 'dark';
  // Pure black & white — no tinted off-whites.
  const ink = isDark ? '#FFFFFF' : '#000000';
  const paper = isDark ? '#000000' : '#FFFFFF';
  const canvas = isDark ? '#000000' : '#FFFFFF';
  const muted = isDark ? '#8C8C8C' : '#6E6E6E';

  return createTheme({
    palette: {
      mode,
      primary: { main: ink, contrastText: paper },
      secondary: { main: muted },
      warning: { main: ACCENT },
      error: { main: isDark ? '#E06055' : '#B3362B' },
      success: { main: ink, contrastText: paper },
      background: { default: canvas, paper },
      text: { primary: ink, secondary: muted },
      divider: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)',
    },
    shape: { borderRadius: 0 },
    typography: {
      fontFamily: DISPLAY_FONT,
      h6: { fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '0.85rem' },
      button: {
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: 600,
        fontSize: '0.72rem',
      },
    },
    components: {
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          outlined: { borderColor: ink, '&:hover': { borderColor: ink } },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 0,
            fontFamily: MONO_FONT,
            fontSize: '0.68rem',
            letterSpacing: '0.04em',
            backgroundColor: ink,
            color: paper,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: { root: { borderBottomColor: 'inherit' } },
      },
    },
  });
}

// Default no-op context so components render fine outside the provider
// (unit tests mount components directly).
export const ThemeModeContext = createContext({ mode: 'light', toggleMode: () => {} });
export const useThemeMode = () => useContext(ThemeModeContext);
