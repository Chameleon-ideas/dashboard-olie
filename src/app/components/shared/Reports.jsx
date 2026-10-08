'use client';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import PageContainer from '@/app/components/container/PageContainer';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { CustomizerContext } from '@/app/context/customizerContext';
import ReportCaseDrawer from '@/app/components/reports/ReportCaseDrawer';
import {
  REASON_LABEL,
  REASON_SHORT,
  TARGET_LABEL,
  TARGET_TYPES,
  errorMessage,
  fetchCases,
  formatDate,
  sortedReasons,
  timeAgo,
} from '@/app/components/reports/reportApi';

const TABS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const TYPE_COLOR = {
  USER: 'secondary',
  POST: 'primary',
  POST_COMMENT: 'primary',
  BLOG_COMMENT: 'info',
  GROUP: 'success',
  GROUP_MESSAGE: 'success',
  HELP_REQUEST: 'warning',
  EVENT: 'info',
};

const caseKey = (c) => `${c.targetType}:${c.targetId}`;

const TypeChip = ({ type }) => <Chip size="small" color={TYPE_COLOR[type] || 'default'} variant="outlined" label={TARGET_LABEL[type] || type} />;

const Preview = ({ item }) => {
  const p = item.preview || {};
  const main = p.title || p.text || 'No preview available';
  // Some types (help requests) only have a generic title, so show the text under it.
  const sub = p.title && p.text ? p.text : null;
  const context = p.context && p.context !== p.title ? p.context : null;
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
      {p.image ? (
        <Box component="img" src={p.image} alt="" sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }} />
      ) : null}
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          color={p.title || p.text ? 'text.primary' : 'text.secondary'}
          sx={{
            fontWeight: p.title ? 600 : 400,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}
        >
          {main}
        </Typography>
        {sub && (
          <Typography variant="body2" color="text.secondary" noWrap sx={{ display: 'block' }}>{sub}</Typography>
        )}
        {context && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{context}</Typography>
        )}
      </Box>
      {item.deleted ? (
        <Chip size="small" color="error" variant="outlined" label="Deleted" sx={{ flexShrink: 0 }} />
      ) : (
        item.hidden && <Chip size="small" icon={<VisibilityOffIcon />} label="Hidden" sx={{ flexShrink: 0 }} />
      )}
    </Stack>
  );
};

const Owner = ({ owner }) =>
  owner ? (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <Avatar src={owner.image || undefined} sx={{ width: 28, height: 28, fontSize: 13 }}>
        {(owner.name || owner.email || '?')[0]?.toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap>{owner.name || owner.email || 'No name yet'}</Typography>
        {owner.status === 'SUSPENDED' && <Chip size="small" color="error" variant="outlined" label="Suspended" sx={{ mt: 0.25 }} />}
      </Box>
    </Stack>
  ) : (
    <Typography variant="body2" color="text.secondary">Admin / unknown</Typography>
  );

const Reasons = ({ reasons, max = 3 }) => {
  const list = sortedReasons(reasons);
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5}>
      {list.slice(0, max).map(([reason, n]) => (
        <Tooltip key={reason} title={REASON_LABEL[reason] || reason}>
          <Chip size="small" label={`${REASON_SHORT[reason] || reason} ×${n}`} />
        </Tooltip>
      ))}
      {list.length > max && <Chip size="small" variant="outlined" label={`+${list.length - max}`} />}
    </Stack>
  );
};

const Reports = () => {
  const [token, setToken] = useState('');
  const [tokenChecked, setTokenChecked] = useState(false);
  const [tab, setTab] = useState('OPEN');
  const [type, setType] = useState('ALL');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [data, setData] = useState({ cases: [], total: 0, counts: {} });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null); // { targetType, targetId }, kept while the drawer closes
  const [drawerOpen, setDrawerOpen] = useState(false);
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
      const result = await fetchCases(token, {
        status: tab,
        type: type === 'ALL' ? undefined : type,
        page: page + 1,
        limit: rowsPerPage,
      });
      setData({ cases: [], total: 0, counts: {}, ...result });
    } catch (e) {
      setLoadError(errorMessage(e, 'Could not load reports'));
    } finally {
      setLoading(false);
    }
  }, [token, tokenChecked, tab, type, page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const openCase = (item) => {
    setSelected({ targetType: item.targetType, targetId: item.targetId });
    setDrawerOpen(true);
  };

  const cases = data.cases || [];
  const filtered = type !== 'ALL';
  const emptyText =
    tab === 'OPEN'
      ? filtered
        ? `No open ${TARGET_LABEL[type].toLowerCase()} reports.`
        : 'No open reports — all caught up 🎉'
      : filtered
      ? `No resolved ${TARGET_LABEL[type].toLowerCase()} reports yet.`
      : 'Nothing resolved yet.';

  const statusRow = () =>
    loadError && cases.length === 0 ? (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" action={token ? <Button color="inherit" size="small" onClick={load}>Try again</Button> : undefined}>
          {loadError}
        </Alert>
      </Box>
    ) : loading && cases.length === 0 ? (
      <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress size={28} /></Box>
    ) : cases.length === 0 ? (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>{emptyText}</Typography>
        {tab === 'OPEN' && !filtered && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>New reports from the app will show up here.</Typography>
        )}
      </Box>
    ) : null;

  const status = statusRow();

  return (
    <PageContainer title="Reports" description="Review content and people reported in the app">
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
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Reports</Typography>
            <Typography variant="body2" color="text.secondary">
              Everything people reported in the app, grouped by what was reported. Open a case to hide the content, warn or suspend the owner, or close it when no action is needed. Every action asks for a reason.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'flex-end' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, pb: { xs: 1.5, sm: 0 } }}
          >
            <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); }}>
              {TABS.map((t) => (
                <Tab key={t.value} value={t.value} label={`${t.label} (${data.counts?.[t.value] ?? 0})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
              ))}
            </Tabs>
            <TextField
              select
              size="small"
              label="Type"
              value={type}
              onChange={(e) => { setType(e.target.value); setPage(0); }}
              sx={{ minWidth: 200, mb: { sm: 1 }, '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: isDark ? '#25253a' : '#fafafa' } }}
            >
              <MenuItem value="ALL">All types</MenuItem>
              {TARGET_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{TARGET_LABEL[t]}</MenuItem>
              ))}
            </TextField>
          </Stack>

          {loadError && cases.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={load}>Try again</Button>}>
              {loadError}
            </Alert>
          )}

          <TableContainer sx={{ border: '1px solid', borderColor: border, borderRadius: 2 }}>
            {narrow ? (
              status || (
                <Box>
                  {cases.map((item) => (
                    <Box
                      key={caseKey(item)}
                      onClick={() => openCase(item)}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        borderBottom: '1px solid',
                        borderColor: border,
                        opacity: loading ? 0.6 : 1,
                        '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <TypeChip type={item.targetType} />
                        <Typography variant="caption" color="text.secondary">
                          {item.reportCount} {item.reportCount === 1 ? 'report' : 'reports'} · {timeAgo(item.lastReportedAt)}
                        </Typography>
                      </Stack>
                      <Preview item={item} />
                      <Box sx={{ mt: 1 }}><Owner owner={item.owner} /></Box>
                      <Box sx={{ mt: 1 }}><Reasons reasons={item.reasons} /></Box>
                    </Box>
                  ))}
                </Box>
              )
            ) : (
              <Table sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: isDark ? '#25253a' : '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, width: 150 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reported content</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 190 }}>Owner</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 76 }} align="center">Reports</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 190 }}>Top reasons</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 116 }}>Last reported</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {status ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ p: 0 }}>{status}</TableCell>
                    </TableRow>
                  ) : (
                    cases.map((item) => (
                      <TableRow
                        key={caseKey(item)}
                        hover
                        onClick={() => openCase(item)}
                        sx={{ cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
                      >
                        <TableCell><TypeChip type={item.targetType} /></TableCell>
                        <TableCell><Preview item={item} /></TableCell>
                        <TableCell><Owner owner={item.owner} /></TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.reportCount}</Typography>
                        </TableCell>
                        <TableCell><Reasons reasons={item.reasons} /></TableCell>
                        <TableCell>
                          <Tooltip title={formatDate(item.lastReportedAt, true)}>
                            <Typography variant="body2">{timeAgo(item.lastReportedAt)}</Typography>
                          </Tooltip>
                        </TableCell>
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

      <ReportCaseDrawer
        token={token}
        target={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
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

export default Reports;
