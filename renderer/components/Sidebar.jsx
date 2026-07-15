import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined';
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import DarkModeButton from './DarkModeButton';
import { TYPE_META, CATEGORY_ORDER } from '../utils/itemTypes';
import { MONO_FONT } from '../theme';

const CATEGORY_ICONS = {
  all: <AllInboxIcon sx={{ fontSize: '1rem' }} />,
  wallet: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: '1rem' }} />,
  apikey: <KeyOutlinedIcon sx={{ fontSize: '1rem' }} />,
  ssh: <TerminalOutlinedIcon sx={{ fontSize: '1rem' }} />,
  custom: <DashboardCustomizeOutlinedIcon sx={{ fontSize: '1rem' }} />,
};

export default function Sidebar({ category, counts, onSelectCategory, onNewItem, onOpenSettings }) {
  const entries = [
    { key: 'all', label: 'All Items' },
    ...CATEGORY_ORDER.map((key) => ({ key, label: TYPE_META[key].label })),
  ];

  return (
    <Box
      sx={{
        width: 200,
        flexShrink: 0,
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ p: 2, pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontWeight: 700,
            fontSize: '0.8rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Secret Holder
        </Typography>
      </Box>

      <List dense sx={{ flexGrow: 1, pt: 1 }}>
        {entries.map(({ key, label }) => (
          <ListItemButton
            key={key}
            selected={category === key}
            onClick={() => onSelectCategory(key)}
            sx={{
              mx: 1,
              mb: 0.25,
              '&.Mui-selected': {
                bgcolor: 'text.primary',
                color: 'background.paper',
                '&:hover': { bgcolor: 'text.primary' },
                '& .MuiListItemIcon-root': { color: 'background.paper' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 28, color: 'inherit' }}>
              {CATEGORY_ICONS[key]}
            </ListItemIcon>
            <ListItemText
              primary={label}
              primaryTypographyProps={{
                fontSize: '0.78rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            />
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.7rem', opacity: 0.7 }}>
              {counts[key] ?? 0}
            </Typography>
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          fullWidth
          variant="contained"
          size="small"
          startIcon={<AddCircleOutlineIcon />}
          onClick={onNewItem}
        >
          New
        </Button>
        <Tooltip title="Settings">
          <IconButton size="small" onClick={onOpenSettings} aria-label="settings">
            <SettingsOutlinedIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </Tooltip>
        <DarkModeButton />
      </Box>
    </Box>
  );
}
