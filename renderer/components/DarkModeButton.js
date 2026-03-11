import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tooltip, IconButton, useTheme, alpha } from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';
import { toggleDarkMode } from '../services/wallet';

let DarkReader;
if (typeof window !== 'undefined') {
  DarkReader = require('darkreader');
}

const DARK_READER_CONFIG = { brightness: 100, contrast: 90, sepia: 10 };

export default function DarkModeButton(props) {
  const theme = useTheme();
  const [updateKey, setUpdateKey] = useState(0);

  const isDarkMode = useMemo(() => {
    return DarkReader ? DarkReader.isEnabled() : false;
  }, [updateKey]);

  const handleToggle = useCallback(() => {
    if (!DarkReader) return;

    if (DarkReader.isEnabled()) {
      DarkReader.disable();
    } else {
      DarkReader.enable(DARK_READER_CONFIG);
    }
    setUpdateKey(Date.now());
    toggleDarkMode();
  }, []);

  useEffect(() => {
    if (!DarkReader) return;
    const hour = new Date().getHours();
    if (hour >= 18 || hour <= 6) {
      DarkReader.enable(DARK_READER_CONFIG);
      setUpdateKey(Date.now());
    }
  }, []);

  return (
    <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
      <IconButton
        onClick={handleToggle}
        sx={{
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          borderRadius: 2,
          p: 1,
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
            transform: 'scale(1.05)',
          },
          ...props.sx,
        }}
        size="medium"
      >
        {isDarkMode ? (
          <LightMode sx={{ color: theme.palette.primary.main, fontSize: props.fontSize || 24 }} />
        ) : (
          <DarkMode sx={{ color: theme.palette.primary.main, fontSize: props.fontSize || 24 }} />
        )}
      </IconButton>
    </Tooltip>
  );
}
