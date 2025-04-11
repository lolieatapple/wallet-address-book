// DarkModeButton.js
// $ yarn add darkreader
// $ yarn add @mui/icons-material @mui/material

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Tooltip,
  IconButton,
  useTheme,
  alpha
} from "@mui/material";
const { ipcRenderer } = require('electron');

import { DarkMode, LightMode } from "@mui/icons-material";
let DarkReader;
if (typeof window !== "undefined") {
  DarkReader = require("darkreader");
}

export default function DarkModeButton(props) {
  const theme = useTheme();
  const [updateDark, setUpdateDark] = useState(0);
  const isDarkMode = useMemo(() => {
    return DarkReader ? DarkReader.isEnabled() : false;
  }, [updateDark]);

  const handleDarkMode = useCallback(() => {
    if (DarkReader) {
      const isEnabled = DarkReader.isEnabled();
      if (isEnabled) {
        DarkReader.disable();
        setUpdateDark(Date.now());
      } else {
        DarkReader.enable({
          brightness: 100,
          contrast: 90,
          sepia: 10
        });
        setUpdateDark(Date.now());
      }

      ipcRenderer.invoke('dark-mode:toggle');
    }
  }, [DarkReader, setUpdateDark]); 

  useEffect(() => {
    let t = new Date();
    console.log('getHours', t.getHours());
    if (t.getHours() >= 18 || t.getHours() <= 6) {
      DarkReader.enable({
        brightness: 100,
        contrast: 90,
        sepia: 10
      });
      setUpdateDark(Date.now());
    }
  }, [DarkReader]);

  return (
    <Tooltip title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
      <IconButton
        onClick={handleDarkMode}
        sx={{
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          borderRadius: 2,
          p: 1,
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
            transform: 'scale(1.05)'
          },
          ...props.sx
        }}
        size="medium"
      >
        {isDarkMode ? (
          <LightMode
            sx={{
              color: theme.palette.primary.main,
              fontSize: props.fontSize || 24
            }}
          />
        ) : (
          <DarkMode
            sx={{
              color: theme.palette.primary.main,
              fontSize: props.fontSize || 24
            }}
          />
        )}
      </IconButton>
    </Tooltip>
  );
}
