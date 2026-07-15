import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import copy2Clipboard from 'copy-to-clipboard';
import { groupItems, itemSummary, primarySecretField, TYPE_META } from '../utils/itemTypes';
import { getItemSecrets, copySecretText } from '../services/items';
import { MONO_FONT } from '../theme';

const headCellSx = {
  fontFamily: MONO_FONT,
  fontSize: '0.65rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'text.secondary',
  borderBottom: 2,
  borderColor: 'text.primary',
  padding: '10px 16px',
  bgcolor: 'background.paper',
};

export default function ItemList({ items, title, showType, onMessage, onOpenDetail }) {
  const [collapsed, setCollapsed] = useState(() => new Set());

  const toggleGroup = (group) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // One click → one TouchID → the item's primary secret lands in the
  // clipboard (sensitive copy: participates in the auto-clear timer).
  const handleCopySecret = async (item) => {
    const field = primarySecretField(item);
    try {
      const secrets = await getItemSecrets(item.id);
      if (!secrets || secrets[field] === undefined) {
        onMessage(`Secret "${field}" of ${item.name} not found in keychain`);
        return;
      }
      await copySecretText(String(secrets[field]));
      onMessage(`${item.name}: "${field}" copied`);
    } catch (error) {
      onMessage('Error reading secret: ' + error.message);
    }
  };

  const handleCopySummary = (item) => {
    const summary = itemSummary(item);
    if (summary && copy2Clipboard(summary)) {
      onMessage('Copied');
    }
  };

  const groups = groupItems(items);

  const renderRow = (item) => {
    const secretField = primarySecretField(item);
    const summary = itemSummary(item);
    return (
      <TableRow
        key={item.id}
        hover
        sx={{ '& td': { borderBottom: 1, borderColor: 'divider' } }}
      >
        <TableCell sx={{ padding: '6px 16px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              onClick={() => onOpenDetail(item)}
              sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              {item.name}
            </Typography>
            {showType && (
              <Chip
                size="small"
                variant="outlined"
                label={TYPE_META[item.type]?.singular || item.type}
                sx={{ borderRadius: 0, height: 18, fontSize: '0.6rem', fontFamily: MONO_FONT, letterSpacing: '0.06em' }}
              />
            )}
          </Box>
        </TableCell>
        <TableCell sx={{ padding: '6px 16px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.75rem', color: 'text.primary', whiteSpace: 'nowrap' }}>
              {summary}
            </Typography>
            {summary && (
              <Tooltip title="Copy">
                <IconButton size="small" onClick={() => handleCopySummary(item)}>
                  <ContentCopyIcon sx={{ fontSize: '0.85rem', color: 'text.secondary' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </TableCell>
        <TableCell sx={{ padding: '6px 16px' }} align="right">
          {secretField && (
            <Tooltip title={`Copy "${secretField}" (TouchID)`}>
              <IconButton size="small" onClick={() => handleCopySecret(item)} aria-label={`copy secret of ${item.name}`}>
                <LockOutlinedIcon sx={{ fontSize: '0.95rem', color: 'text.secondary' }} />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Paper variant="outlined" sx={{ borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">
          {title} {items.length > 0 && `(${items.length})`}
        </Typography>
      </Box>

      <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headCellSx, width: '35%' }}>Name</TableCell>
              <TableCell sx={{ ...headCellSx, width: '50%' }}>Info</TableCell>
              <TableCell sx={{ ...headCellSx, width: '15%' }} align="right">Secret</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.8rem', color: 'text.secondary' }}>
                    No items yet. Click New to add one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              groups.map(({ group, items: groupedItems }) => (
                <React.Fragment key={group ?? '__ungrouped__'}>
                  {group !== null && (
                    <TableRow
                      hover
                      onClick={() => toggleGroup(group)}
                      sx={{ cursor: 'pointer', '& td': { borderBottom: 1, borderColor: 'divider' } }}
                    >
                      <TableCell colSpan={3} sx={{ py: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {collapsed.has(group)
                            ? <ChevronRightIcon sx={{ fontSize: '1rem' }} />
                            : <ExpandMoreIcon sx={{ fontSize: '1rem' }} />}
                          <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                            {group}/ ({groupedItems.length})
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                  {(group === null || !collapsed.has(group)) && groupedItems.map(renderRow)}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
