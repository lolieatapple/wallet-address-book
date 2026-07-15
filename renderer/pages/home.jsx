import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { Box, GlobalStyles, TextField, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import Sidebar from '../components/Sidebar';
import WalletTable from '../components/WalletTable';
import ItemList from '../components/ItemList';
import ItemDrawer from '../components/ItemDrawer';
import NewItemDialog from '../components/NewItemDialog';
import SettingsDialog from '../components/SettingsDialog';
import { MessageBox } from '../components/message';
import { useItems } from '../hooks/useItems';
import { restoreNames, onRestoreNamesRequested } from '../services/wallet';
import { TYPE_META } from '../utils/itemTypes';
import { ACCENT, MONO_FONT } from '../theme';

export default function Home() {
  const { items, counts, balances, isLoading, refresh, defaultAddress, setDefault } = useItems();
  const [successInfo, setSuccessInfo] = useState('');
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [editState, setEditState] = useState(null); // { item, secrets }
  const [settingsOpen, setSettingsOpen] = useState(false);

  // App-menu command (Secrets → Restore Names from Keychain): bulk-restores
  // migrated placeholder names. One keychain ACL dialog per un-restored
  // wallet; answering "Always Allow" permanently silences that wallet.
  useEffect(() => {
    return onRestoreNamesRequested(async () => {
      try {
        const { pending, restored } = await restoreNames();
        refresh();
        setSuccessInfo(pending === 0
          ? 'No wallet names need restoring'
          : `Restored ${restored} of ${pending} wallet names`);
      } catch (error) {
        // A denied prompt aborts the run but already-restored names are kept.
        refresh();
        setSuccessInfo('Error restoring names: ' + error.message);
      }
    });
  }, [refresh]);

  // Search covers names and plaintext fields only — secret values are never
  // in the renderer to begin with.
  const filteredItems = useMemo(() => {
    let list = category === 'all' ? items : items.filter((it) => it.type === category);
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter((it) =>
        it.name.toLowerCase().includes(q) ||
        Object.values(it.fields || {}).some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, category, filter]);

  const walletEntries = useMemo(
    () => filteredItems
      .filter((it) => it.type === 'wallet')
      .map((it) => ({ address: it.fields.address, name: it.name, id: it.id })),
    [filteredItems]
  );

  // Derive the drawer item from the live list so a rename/edit refresh is
  // reflected immediately.
  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedId) || null,
    [items, selectedId]
  );

  const openDetailByEntry = (entry) => setSelectedId(entry.id);

  const showWalletTable = category === 'wallet';

  return (
    <>
      <Head>
        <title>Secret Holder</title>
      </Head>

      <GlobalStyles styles={{ body: { overflow: 'hidden' } }} />

      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          bgcolor: 'background.default',
          // The single colored element of the chrome: a thin amber signal
          // line across the top of the window.
          borderTop: `3px solid ${ACCENT}`,
        }}
      >
        <Sidebar
          category={category}
          counts={counts}
          onSelectCategory={(c) => { setCategory(c); setSelectedId(null); }}
          onNewItem={() => setNewItemOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <Box sx={{ flexGrow: 1, p: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              label="Search by name or field"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              sx={{
                flexGrow: 1,
                maxWidth: 480,
                '& .MuiOutlinedInput-root': { borderRadius: 0, fontFamily: MONO_FONT, fontSize: '0.85rem' },
              }}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1, fontSize: 18 }} />,
              }}
            />
            <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={refresh} sx={{ ml: 'auto' }}>
              Refresh
            </Button>
          </Box>

          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            {showWalletTable ? (
              <WalletTable
                wallets={walletEntries}
                balances={balances}
                isLoading={isLoading}
                onRefresh={refresh}
                onMessage={setSuccessInfo}
                defaultAddress={defaultAddress}
                onSetDefault={setDefault}
                onOpenDetail={openDetailByEntry}
              />
            ) : (
              <ItemList
                items={filteredItems}
                title={category === 'all' ? 'All Items' : TYPE_META[category].label}
                showType={category === 'all'}
                onMessage={setSuccessInfo}
                onOpenDetail={(item) => setSelectedId(item.id)}
              />
            )}
          </Box>
        </Box>
      </Box>

      <ItemDrawer
        item={selectedItem}
        balance={selectedItem?.type === 'wallet' ? balances[selectedItem.fields.address] : null}
        isDefault={selectedItem?.type === 'wallet' && selectedItem.fields.address === defaultAddress}
        onSetDefault={setDefault}
        onClose={() => setSelectedId(null)}
        onRefresh={refresh}
        onMessage={setSuccessInfo}
        onEdit={(item, secrets) => setEditState({ item, secrets })}
      />

      <NewItemDialog
        open={newItemOpen || !!editState}
        initialType={category}
        editItem={editState?.item}
        editSecrets={editState?.secrets}
        onClose={() => { setNewItemOpen(false); setEditState(null); }}
        onRefresh={refresh}
        onMessage={setSuccessInfo}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onMessage={setSuccessInfo}
      />

      <MessageBox successInfo={successInfo} setSuccessInfo={setSuccessInfo} />
    </>
  );
}
