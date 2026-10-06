'use client';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import BASE_URL from '@/utils/api';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import MergeIcon from '@mui/icons-material/CallMerge';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { CustomizerContext } from '@/app/context/customizerContext';

const TABS = [
  { value: 'APPROVED', label: 'Approved', hint: 'Shown to everyone in the app, in this order.' },
  { value: 'PENDING', label: 'Suggestions', hint: 'Words people typed in or used as #hashtags. Only you see them until you approve.' },
  { value: 'HIDDEN', label: 'Hidden', hint: 'Never shown. Posts and people that used them keep working.' },
];

const SOURCE_LABEL = { ADMIN: 'Admin', USER: 'Typed by a user', HASHTAG: '#hashtag' };

const usageText = (u) =>
  [u.users && `${u.users} people`, u.posts && `${u.posts} posts`, u.blogs && `${u.blogs} blogs`, u.saved && `${u.saved} saves`]
    .filter(Boolean)
    .join(' · ') || 'Not used';

const isUnused = (u) => !(u.users || u.posts || u.blogs || u.saved);

const Interests = () => {
  const [token, setToken] = useState('');
  const [tab, setTab] = useState('APPROVED');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [approved, setApproved] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, message: '', success: true });

  const [nameDialog, setNameDialog] = useState(null); // { mode: 'add' | 'rename', interest? }
  const [nameValue, setNameValue] = useState('');
  const [mergeFrom, setMergeFrom] = useState(null);
  const [mergeInto, setMergeInto] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';

  const notify = (message, success = true) => setFeedback({ open: true, message, success });
  const auth = useMemo(() => ({ headers: { 'x-access-token': token } }), [token]);
  const errorText = (e, fallback) => e?.response?.data?.message || fallback;

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || 'null');
      setToken(stored?.data?.adminToken || '');
    } catch {
      setToken('');
    }
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [current, all] = await Promise.all([
        axios.get(`${BASE_URL}/admin/interest/all`, { ...auth, params: { status: tab } }),
        axios.get(`${BASE_URL}/admin/interest/all`, { ...auth, params: { status: 'APPROVED' } }),
      ]);
      setRows(current.data.data.interests);
      setCounts(current.data.data.counts || {});
      setApproved(all.data.data.interests);
    } catch (e) {
      notify(errorText(e, 'Could not load interests'), false);
    } finally {
      setLoading(false);
    }
  }, [token, tab, auth]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.includes(q)) : rows;
  }, [rows, search]);

  const run = async (id, request, success) => {
    setBusyId(id);
    try {
      await request();
      notify(success);
      await load();
    } catch (e) {
      notify(errorText(e, 'Something went wrong'), false);
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = (interest, status) =>
    run(
      interest.id,
      () => axios.patch(`${BASE_URL}/admin/interest/${interest.id}`, { status }, auth),
      status === 'APPROVED' ? `"${interest.name}" is now shown in the app` : status === 'HIDDEN' ? `"${interest.name}" hidden` : 'Moved back to suggestions'
    );

  const move = (index, delta) => {
    const ids = shown.map((r) => r.id);
    const to = index + delta;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    run(shown[index].id, () => axios.post(`${BASE_URL}/admin/interest/reorder`, { ids }, auth), 'Order saved');
  };

  const saveName = async () => {
    const name = nameValue.trim();
    if (!name) return;
    const dialog = nameDialog;
    setNameDialog(null);
    if (dialog.mode === 'add') {
      await run('new', () => axios.post(`${BASE_URL}/admin/interest/createUserInterest`, { userInterest: name }, auth), `"${name.toLowerCase()}" added`);
    } else {
      await run(dialog.interest.id, () => axios.patch(`${BASE_URL}/admin/interest/${dialog.interest.id}`, { name }, auth), 'Renamed');
    }
  };

  const doMerge = async () => {
    const from = mergeFrom;
    const into = mergeInto;
    setMergeFrom(null);
    setMergeInto(null);
    await run(from.id, () => axios.post(`${BASE_URL}/admin/interest/${from.id}/merge`, { targetId: into.id }, auth), `"${from.name}" merged into "${into.name}"`);
  };

  const doDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    await run(target.id, () => axios.delete(`${BASE_URL}/admin/interest/deleteUserInterest/${target.id}`, auth), `"${target.name}" deleted`);
  };

  const action = (title, icon, onClick, color = 'default', disabled = false) => (
    <Tooltip title={title}>
      <span>
        <IconButton size="small" color={color} onClick={onClick} disabled={disabled}>
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );

  const currentTab = TABS.find((t) => t.value === tab);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1150, mx: 'auto' }}>
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: border,
          backgroundColor: isDark ? '#1e1e2f' : '#fff',
          boxShadow: isDark ? 'none' : '0 10px 30px rgba(0,0,0,0.06)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Interests</Typography>
            <Typography variant="body2" color="text.secondary">
              What people can follow and post about. Only approved interests appear in the app.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setNameValue('');
              setNameDialog({ mode: 'add' });
            }}
            sx={{ textTransform: 'none', borderRadius: 2, boxShadow: 'none' }}
          >
            Add interest
          </Button>
        </Stack>

        {(counts.PENDING || 0) > 0 && tab !== 'PENDING' && (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
            action={<Button color="inherit" size="small" onClick={() => setTab('PENDING')}>Review</Button>}
          >
            {counts.PENDING} {counts.PENDING === 1 ? 'suggestion is' : 'suggestions are'} waiting for review.
          </Alert>
        )}

        <Tabs value={tab} onChange={(_, v) => { setTab(v); setSearch(''); }} sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={`${t.label} (${counts[t.value] || 0})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
          ))}
        </Tabs>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>{currentTab.hint}</Typography>

        <TextField
          fullWidth
          size="small"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />

        <TableContainer sx={{ border: '1px solid', borderColor: border, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: isDark ? '#25253a' : '#f8fafc' }}>
                {tab === 'APPROVED' && <TableCell sx={{ fontWeight: 700, width: 90 }}>Order</TableCell>}
                <TableCell sx={{ fontWeight: 700 }}>Interest</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Used by</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>From</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress size={26} /></TableCell></TableRow>
              ) : shown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    {tab === 'PENDING' ? 'No suggestions waiting. 🎉' : 'Nothing here.'}
                  </TableCell>
                </TableRow>
              ) : (
                shown.map((interest, index) => (
                  <TableRow key={interest.id} hover sx={{ opacity: busyId === interest.id ? 0.5 : 1 }}>
                    {tab === 'APPROVED' && (
                      <TableCell>
                        {action('Move up', <ArrowUpwardIcon fontSize="small" />, () => move(index, -1), 'default', index === 0 || !!search)}
                        {action('Move down', <ArrowDownwardIcon fontSize="small" />, () => move(index, 1), 'default', index === shown.length - 1 || !!search)}
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{interest.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={isUnused(interest.usage) ? 'text.secondary' : 'text.primary'}>
                        {usageText(interest.usage)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" label={SOURCE_LABEL[interest.source] || interest.source} />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {interest.status !== 'APPROVED' && action('Approve: show in the app', <CheckIcon fontSize="small" />, () => setStatus(interest, 'APPROVED'), 'success')}
                      {interest.status === 'HIDDEN' && action('Back to suggestions', <VisibilityIcon fontSize="small" />, () => setStatus(interest, 'PENDING'))}
                      {interest.status !== 'HIDDEN' && action('Hide', <VisibilityOffIcon fontSize="small" />, () => setStatus(interest, 'HIDDEN'), 'warning')}
                      {action('Rename', <EditIcon fontSize="small" />, () => { setNameValue(interest.name); setNameDialog({ mode: 'rename', interest }); })}
                      {action('Merge into another interest', <MergeIcon fontSize="small" />, () => { setMergeFrom(interest); setMergeInto(null); }, 'primary')}
                      {action(
                        isUnused(interest.usage) ? 'Delete' : 'In use: hide or merge instead',
                        <DeleteIcon fontSize="small" />,
                        () => setDeleteTarget(interest),
                        'error',
                        !isUnused(interest.usage)
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!nameDialog} onClose={() => setNameDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>{nameDialog?.mode === 'add' ? 'Add interest' : 'Rename interest'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            margin="dense"
            label="Name"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            helperText={nameDialog?.mode === 'add' ? 'Added as approved. If users suggested the same word, that suggestion is approved.' : 'Shown in lower case.'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNameDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveName} disabled={!nameValue.trim()}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!mergeFrom} onClose={() => setMergeFrom(null)} fullWidth maxWidth="sm">
        <DialogTitle>Merge "{mergeFrom?.name}"</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Everything using "{mergeFrom?.name}" ({mergeFrom ? usageText(mergeFrom.usage) : ''}) moves to the interest you pick, and "{mergeFrom?.name}" is removed. Use it for duplicates and misspellings.
          </DialogContentText>
          <Autocomplete
            options={approved.filter((a) => a.id !== mergeFrom?.id)}
            getOptionLabel={(o) => o.name}
            value={mergeInto}
            onChange={(_, v) => setMergeInto(v)}
            renderInput={(params) => <TextField {...params} size="small" label="Merge into (approved interest)" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeFrom(null)}>Cancel</Button>
          <Button variant="contained" onClick={doMerge} disabled={!mergeInto}>Merge</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete "{deleteTarget?.name}"?</DialogTitle>
        <DialogContent>
          <DialogContentText>Nobody uses it. It will be removed for good.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={feedback.open}
        autoHideDuration={3500}
        onClose={() => setFeedback((f) => ({ ...f, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={feedback.success ? 'success' : 'error'} variant="filled" onClose={() => setFeedback((f) => ({ ...f, open: false }))}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Interests;
