import { Tooltip, IconButton } from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';
import { useThemeMode } from '../theme';

export default function DarkModeButton(props) {
  const { mode, toggleMode } = useThemeMode();
  const isDarkMode = mode === 'dark';

  return (
    <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
      <IconButton
        onClick={toggleMode}
        sx={{
          border: 1,
          borderColor: 'text.primary',
          borderRadius: 0,
          p: 1,
          color: 'text.primary',
          ...props.sx,
        }}
        size="medium"
      >
        {isDarkMode ? (
          <LightMode sx={{ fontSize: props.fontSize || 20 }} />
        ) : (
          <DarkMode sx={{ fontSize: props.fontSize || 20 }} />
        )}
      </IconButton>
    </Tooltip>
  );
}
