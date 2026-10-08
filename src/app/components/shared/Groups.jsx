'use client';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import PageContainer from '@/app/components/container/PageContainer';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { CustomizerContext } from '@/app/context/customizerContext';
import ReasonDialog from '@/app/components/users/ReasonDialog';
import { deleteGroups, fetchGroups } from '@/app/components/groups/groupApi';
import { errorMessage, formatDate, timeAgo } from '@/app/components/reports/reportApi';

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'deleted', label: 'Deleted' },
];

const INACTIVE = [
  { value: 0, label: 'Any activity' },
  { value: 30, label: 'Quiet for 30+ days' },
  { value: 90, label: 'Quiet for 90+ days' },
  { value: 180, label: 'Quiet for 180+ days' },
];

const MEMBERS = [
  { value: 'any', label: 'Any size' },
  { value: 1, label: 'Only 1 member' },
  { value: 2, label: '2 members or fewer' },
  { value: 5, label: '5 members or fewer' },
];

const SORTS = [
  { value: 'recent', label: 'Newest first' },
  { value: 'inactive', label: 'Least active first' },
  { value: 'members', label: 'Fewest members first' },
];

const GroupCell = ({ group }) => (
  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
    <Avatar src={group.image || undefined} variant="rounded" sx={{ width: 40, height: 40, fontSize: 16 }}>
      {(group.name || '?')[0]?.toUpperCase()}
    </Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{group.name || 'Untitled group'}</Typography>
        {group.openReports > 0 && (
          <Tooltip title={`${group.openReports} open ${group.openReports === 1 ? 'report' : 'reports'} — see Reports`}>
            <Chip size="small" color="warning" variant="outlined" icon={<FlagOutlinedIcon />} label={group.openReports} sx={{ flexShrink: 0 }} />
          </Tooltip>
        )}
        {!group.deleted && group.hidden && <Chip size="small" label="Hidden" sx={{ flexShrink: 0 }} />}
      </Stack>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
        {[group.privacy === 'PRIVATE' ? 'Private' : 'Public', group.place].filter(Boolean).join(' · ')}
      </Typography>
    </Box>
  </Stack>
);

const Creator = ({ group }) =>
  group.creator ? (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap>{group.creator.name || group.creator.email}</Typography>
      {group.creator.name && (
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{group.creator.email}</Typography>
      )}
    </Box>
  ) : (
    <Typography variant="body2" color="text.secondary">{group.createdByAdmin ? 'Ollie team' : 'Unknown'}</Typography>
  );

const Groups = () => {
  const [token, setToken] = useState('');
  const [tokenChecked, setTokenChecked] = useState(false);
  const [tab, setTab] = useState('active');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [inactiveDays, setInactiveDays] = useState(0);
  const [maxMembers, setMaxMembers] = useState('any');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [data, setData] = useState({ groups: [], total: 0, counts: {} });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState({}); // id -> group, kept across pages
  const [pendingDelete, setPendingDelete] = useState(null); // [group, ...]
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, message: '', success: true });

  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const narrow = useMediaQuery('(max-width:760px)');
  const notify = useCallback((message, success = true) => setFeedback({ open: true, message, success }), []);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || 'null');
      setToken(stored?.data?.adminToken || '');
    } catch {
      setToken('');
    }
    setTokenChecked(true);
  }, []);

  // Search as you type, without a request per key.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    if (!token) {
      if (tokenChecked) {
        setLoading(false);
        setLoadError('You are not signed in. Please log in again.');
      }
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const result = await fetchGroups(token, {
        status: tab,
        search: search || undefined,
        inactiveDays: inactiveDays || undefined,
        maxMembers: maxMembers === 'any' ? undefined : maxMembers,
        sort,
        page: page + 1,
        limit: rowsPerPage,
      });
      setData({ groups: [], total: 0, counts: {}, ...result });
    } catch (e) {
      setLoadError(errorMessage(e, 'Could not load groups'));
    } finally {
      setLoading(false);
    }
  }, [token, tokenChecked, tab, search, inactiveDays, maxMembers, sort, page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  const groups = data.groups || [];
  const isActive = tab === 'active';
  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const pageIds = groups.map((g) => g.id);
  const allOnPage = isActive && pageIds.length > 0 && pageIds.every((id) => selected[id]);
  const someOnPage = pageIds.some((id) => selected[id]);
  const filtered = Boolean(search) || inactiveDays > 0 || maxMembers !== 'any';

  const toggle = (group) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[group.id]) delete next[group.id];
      else next[group.id] = group;
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = { ...prev };
      if (allOnPage) pageIds.forEach((id) => delete next[id]);
      else groups.forEach((g) => { next[g.id] = g; });
      return next;
    });

  const changeFilter = (setter) => (e) => { setter(e.target.value); setPage(0); };

  const confirmDelete = async (reason) => {
    setBusy(true);
    try {
      const ids = pendingDelete.map((g) => g.id);
      const result = await deleteGroups(token, ids, reason);
      const skipped = result.skipped?.length ? ` ${result.skipped.length} skipped (already deleted or not found).` : '';
      notify(`${result.message || 'Deleted'}. Their members were told.${skipped}`);
      setSelected((prev) => {
        const next = { ...prev };
        ids.forEach((id) => delete next[id]);
        return next;
      });
      setPendingDelete(null);
      await load();
    } catch (e) {
      notify(errorMessage(e, 'Could not delete'), false);
    } finally {
      setBusy(false);
    }
  };

  const emptyText = isActive
    ? filtered ? 'No groups match these filters.' : 'No groups yet.'
    : filtered ? 'No deleted groups match these filters.' : 'No deleted groups.';

  const status =
    loadError && groups.length === 0 ? (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" action={token ? <Button color="inherit" size="small" onClick={load}>Try again</Button> : undefined}>{loadError}</Alert>
      </Box>
    ) : loading && groups.length === 0 ? (
      <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress size={28} /></Box>
    ) : groups.length === 0 ? (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>{emptyText}</Typography>
      </Box>
    ) : null;

  const fieldSx = { minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: isDark ? '#25253a' : '#fafafa' } };
  const activity = (g) => (
    <Tooltip title={g.lastMessageAt ? `Last message ${formatDate(g.lastMessageAt, true)}` : `No messages · created ${formatDate(g.createdAt)}`}>
      <Typography variant="body2">{g.lastMessageAt ? timeAgo(g.lastMessageAt) : 'No messages'}</Typography>
    </Tooltip>
  );
  const deleteOne = (g) => (
    <Tooltip title="Delete group">
      <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setPendingDelete([g]); }} aria-label={`Delete ${g.name || 'group'}`}>
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );

  const many = pendingDelete?.length > 1;
  const names = (pendingDelete || []).slice(0, 5).map((g) => `"${g.name || 'Untitled group'}"`).join(', ');
  const more = pendingDelete?.length > 5 ? ` and ${pendingDelete.length - 5} more` : '';

  return (
    <PageContainer title="Groups" description="Every group in the app, for clean-up and moderation">
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: border,
            backgroundColor: isDark ? '#1e1e2f' : '#fff',
            color: isDark ? '#fff' : '#111827',
            boxShadow: isDark ? 'none' : '0 10px 30px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Groups</Typography>
            <Typography variant="body2" color="text.secondary">
              Every group in the app. Use the filters to find quiet or empty groups, then delete one or several. Deleted groups disappear for everyone and their members get a notification. Nothing is erased.
            </Typography>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); setSelected({}); }}>
              {TABS.map((t) => (
                <Tab key={t.value} value={t.value} label={`${t.label} (${data.counts?.[t.value] ?? 0})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
              ))}
            </Tabs>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search by name"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ ...fieldSx, flex: 1 }}
            />
            <TextField select size="small" label="Activity" value={inactiveDays} onChange={changeFilter(setInactiveDays)} sx={fieldSx}>
              {INACTIVE.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Members" value={maxMembers} onChange={changeFilter(setMaxMembers)} sx={fieldSx}>
              {MEMBERS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Sort" value={sort} onChange={changeFilter(setSort)} sx={fieldSx}>
              {SORTS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Stack>

          {isActive && selectedList.length > 0 && (
            <Alert
              severity="warning"
              icon={false}
              sx={{ mb: 2, alignItems: 'center' }}
              action={
                <Stack direction="row" spacing={1}>
                  <Button color="inherit" size="small" onClick={() => setSelected({})}>Clear</Button>
                  <Button
                    color="error"
                    variant="contained"
                    size="small"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setPendingDelete(selectedList)}
                    sx={{ textTransform: 'none', boxShadow: 'none' }}
                  >
                    Delete {selectedList.length}
                  </Button>
                </Stack>
              }
            >
              {selectedList.length} {selectedList.length === 1 ? 'group' : 'groups'} selected
            </Alert>
          )}

          {loadError && groups.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={load}>Try again</Button>}>{loadError}</Alert>
          )}

          <TableContainer sx={{ border: '1px solid', borderColor: border, borderRadius: 2 }}>
            {narrow ? (
              status || (
                <Box>
                  {groups.map((g) => (
                    <Box key={g.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: border, opacity: loading ? 0.6 : 1 }}>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        {isActive && <Checkbox size="small" checked={Boolean(selected[g.id])} onChange={() => toggle(g)} sx={{ p: 0.5, mt: 0.5 }} />}
                        <Box sx={{ flex: 1, minWidth: 0 }}><GroupCell group={g} /></Box>
                        {isActive && deleteOne(g)}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'} · {g.messageCount} messages ·{' '}
                        {g.deleted ? `deleted ${timeAgo(g.deletedAt)}` : g.lastMessageAt ? `last message ${timeAgo(g.lastMessageAt)}` : 'no messages'}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}><Creator group={g} /></Box>
                    </Box>
                  ))}
                </Box>
              )
            ) : (
              <Table sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: isDark ? '#25253a' : '#f8fafc' }}>
                    {isActive && (
                      <TableCell padding="checkbox" sx={{ width: 48 }}>
                        <Checkbox size="small" checked={allOnPage} indeterminate={someOnPage && !allOnPage} onChange={togglePage} inputProps={{ 'aria-label': 'Select all on this page' }} />
                      </TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 700 }}>Group</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 200 }}>Created by</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }} align="center">Members</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }} align="center">Messages</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 130 }}>{isActive ? 'Last message' : 'Deleted'}</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 110 }}>Created</TableCell>
                    {isActive && <TableCell sx={{ width: 56 }} />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {status ? (
                    <TableRow><TableCell colSpan={isActive ? 8 : 6} sx={{ p: 0 }}>{status}</TableCell></TableRow>
                  ) : (
                    groups.map((g) => (
                      <TableRow
                        key={g.id}
                        hover
                        selected={Boolean(selected[g.id])}
                        onClick={isActive ? () => toggle(g) : undefined}
                        sx={{ cursor: isActive ? 'pointer' : 'default', opacity: loading ? 0.6 : 1 }}
                      >
                        {isActive && (
                          <TableCell padding="checkbox">
                            <Checkbox size="small" checked={Boolean(selected[g.id])} onClick={(e) => e.stopPropagation()} onChange={() => toggle(g)} />
                          </TableCell>
                        )}
                        <TableCell><GroupCell group={g} /></TableCell>
                        <TableCell><Creator group={g} /></TableCell>
                        <TableCell align="center"><Typography variant="body2" sx={{ fontWeight: 700 }}>{g.memberCount}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2">{g.messageCount}</Typography></TableCell>
                        <TableCell>
                          {isActive ? activity(g) : (
                            <Tooltip title={formatDate(g.deletedAt, true)}><Typography variant="body2">{timeAgo(g.deletedAt)}</Typography></Tooltip>
                          )}
                        </TableCell>
                        <TableCell><Typography variant="body2">{formatDate(g.createdAt)}</Typography></TableCell>
                        {isActive && <TableCell align="right">{deleteOne(g)}</TableCell>}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
            <TablePagination
              component="div"
              count={data.total || 0}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage={narrow ? 'Rows' : 'Rows per page:'}
              sx={{ borderTop: '1px solid', borderColor: border }}
            />
          </TableContainer>
        </Paper>
      </Box>

      <ReasonDialog
        open={Boolean(pendingDelete)}
        title={many ? `Delete ${pendingDelete.length} groups?` : `Delete ${names || 'this group'}?`}
        message={`${many ? `${names}${more} disappear` : 'It disappears'} for everyone in the app straight away, and ${many ? 'their' : 'its'} members get a notification that the group was removed by the Ollie team. Open reports on ${many ? 'them' : 'it'} are resolved. This can't be undone from here.`}
        confirmLabel={many ? `Delete ${pendingDelete.length} groups` : 'Delete group'}
        confirmColor="error"
        reasonLabel="Why? (admins only, saved in the history)"
        busy={busy}
        onClose={() => !busy && setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={() => setFeedback((f) => ({ ...f, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={feedback.success ? 'success' : 'error'} variant="filled" onClose={() => setFeedback((f) => ({ ...f, open: false }))}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default Groups;
