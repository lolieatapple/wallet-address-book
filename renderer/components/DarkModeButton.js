// DarkModeButton.js
// $ yarn add darkreader
// $ yarn add @mui/icons-material @mui/material

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Tooltip,
} from "@mui/material";
const { ipcRenderer } = require('electron');

import { DarkMode, WbSunny } from "@mui/icons-material";
let DarkReader;
if (typeof window !== "undefined") {
  DarkReader = require("darkreader");
}

export default function DarkModeButton(props) {
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

  useEffect(()=>{
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
    <Tooltip title="切换夜晚模式">
      {isDarkMode ? (
        <WbSunny
          onClick={handleDarkMode}
          style={{
            cursor: "pointer",
            ...props.style,
          }}
        />
      ) : (
        <DarkMode
          onClick={handleDarkMode}
          style={{
            cursor: "pointer",
            ...props.style,
          }}
        />
      )}
    </Tooltip>
  );
}
