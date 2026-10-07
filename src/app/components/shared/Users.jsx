'use client';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import PageContainer from '@/app/components/container/PageContainer';
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
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
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { CustomizerContext } from '@/app/context/customizerContext';
import UserDetailDrawer from '@/app/components/users/UserDetailDrawer';
import { errorMessage, fetchUsers, formatDate, fullName } from '@/app/components/users/userApi';

const TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const Users = () => {
  const [token, setToken] = useState('');
  const [tab, setTab] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [data, setData] = useState({ users: [], total: 0, counts: {} });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, message: '', success: true });

  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';

  const notify = useCallback((message, success = true) => setFeedback({ open: true, message, success }), []);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || 'null');
      setToken(stored?.data?.adminToken || '');
    } catch {
      setToken('');
    }
  }, []);

  // Search on the server, a moment after typing stops.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await fetchUsers(token, {
        q: search || undefined,
        status: tab === 'ALL' ? undefined : tab,
        page: page + 1,
        limit: rowsPerPage,
      });
      setData(result);
    } catch (e) {
      notify(errorMessage(e, 'Could not load users'), false);
    } finally {
      setLoading(false);
    }
  }, [token, search, tab, page, rowsPerPage, notify]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageContainer title="Users" description="Manage app users">
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
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Users</Typography>
            <Typography variant="body2" color="text.secondary">
              Open a user to see their details, edit their profile, suspend them or sign them out. Every change asks for a reason and is kept in their history.
            </Typography>
          </Box>

          <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); }} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            {TABS.map((t) => (
              <Tab key={t.value} value={t.value} label={`${t.label} (${data.counts?.[t.value] ?? 0})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
            ))}
          </Tabs>

          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, email, phone, city or country"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: isDark ? '#25253a' : '#fafafa' } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />

          <TableContainer sx={{ border: '1px solid', borderColor: border, borderRadius: 2 }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: isDark ? '#25253a' : '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Device</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Joined</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && data.users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress size={28} /></TableCell>
                  </TableRow>
                ) : data.users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>No users found.</TableCell>
                  </TableRow>
                ) : (
                  data.users.map((user) => (
                    <TableRow
                      key={user.id}
                      hover
                      onClick={() => setSelectedId(user.id)}
                      sx={{ cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar src={user.image || undefined} sx={{ width: 34, height: 34 }}>
                            {(user.firstName || user.email || '?')[0]?.toUpperCase()}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{fullName(user)}</Typography>
                            <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{user.phoneNumber || '-'}</TableCell>
                      <TableCell>{[user.city, user.country].filter(Boolean).join(', ') || '-'}</TableCell>
                      <TableCell>{user.deviceType || '-'}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Chip
                            size="small"
                            variant="outlined"
                            color={user.status === 'SUSPENDED' ? 'error' : 'success'}
                            label={user.status === 'SUSPENDED' ? 'Suspended' : 'Active'}
                          />
                          {!user.isCreatedProfile && <Chip size="small" variant="outlined" label="No profile" />}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={data.total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              sx={{ borderTop: '1px solid', borderColor: border }}
            />
          </TableContainer>
        </Paper>
      </Box>

      <UserDetailDrawer
        token={token}
        userId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={load}
        notify={notify}
      />

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
    </PageContainer>
  );
};

export default Users;
