'use client';
// Comment moderation: every comment on the blog, newest first. Hide (kept but
// not shown in the app), show again, or delete with its replies.
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Avatar,
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
  Tabs,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { deleteComment, errorMessage, listComments, readToken, setCommentHidden } from './blogApi';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'false', label: 'Shown' },
  { value: 'true', label: 'Hidden' },
];

const BlogComments = () => {
  const router = useRouter();
  const params = useSearchParams();
  const blogId = params.get('blogId') || '';
  const [token, setToken] = useState('');
  const [hidden, setHidden] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, message: '', success: true });
  const notify = (message, success = true) => setFeedback({ open: true, message, success });

  useEffect(() => setToken(readToken()), []);
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!token) return setLoading(false);
    setLoading(true);
    try {
      const data = await listComments(token, {
        page: page + 1,
        limit: 20,
        ...(blogId ? { blogId } : {}),
        ...(hidden ? { hidden } : {}),
        ...(query ? { q: query } : {}),
      });
      setRows(data.comments);
      setTotal(data.total);
    } catch (e) {
      notify(errorMessage(e, 'Could not load comments'), false);
    } finally {
      setLoading(false);
    }
  }, [token, page, blogId, hidden, query]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (c) => {
    setBusyId(c.id);
    try {
      await setCommentHidden(token, c.id, !c.hiddenAt);
      notify(c.hiddenAt ? 'Shown in the app again' : 'Hidden from the app');
      await load();
    } catch (e) {
      notify(errorMessage(e, 'Could not update the comment'), false);
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => {
    const c = confirm;
    setConfirm(null);
    setBusyId(c.id);
    try {
      await deleteComment(token, c.id);
      notify('Comment deleted');
      await load();
    } catch (e) {
      notify(errorMessage(e, 'Could not delete the comment'), false);
    } finally {
      setBusyId(null);
    }
  };

  const blogTitle = blogId && rows[0]?.blog?.title;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <IconButton onClick={() => router.push('/blogs')}><ArrowBackIcon /></IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Blog comments</Typography>
            <Typography variant="body2" color="text.secondary">
              {blogId ? `On "${blogTitle || 'this post'}"` : 'All posts'} · Hidden comments stay saved but aren't shown in the app.
            </Typography>
          </Box>
          {blogId && <Chip label="Show all posts" onClick={() => router.push('/blog-comments')} sx={{ ml: 'auto' }} />}
        </Stack>

        <Tabs value={hidden} onChange={(_, v) => { setHidden(v); setPage(0); }} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          {FILTERS.map((f) => <Tab key={f.value} value={f.value} label={f.label} sx={{ textTransform: 'none', fontWeight: 600 }} />)}
        </Tabs>
        <TextField
          fullWidth
          size="small"
          placeholder="Search comments"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />

        {loading && rows.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 6 }}>No comments here.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {rows.map((c) => (
              <Box
                key={c.id}
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  opacity: busyId === c.id ? 0.5 : c.hiddenAt ? 0.65 : 1,
                  bgcolor: c.hiddenAt ? 'action.hover' : 'transparent',
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Avatar src={c.user?.image || undefined} sx={{ width: 36, height: 36 }}>{c.user?.firstName?.[0]}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {[c.user?.firstName, c.user?.lastName].filter(Boolean).join(' ') || 'User'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(c.createdAt).toLocaleString()}</Typography>
                      {c.isReply && <Chip size="small" variant="outlined" label="Reply" />}
                      {c.hiddenAt && <Chip size="small" color="warning" label="Hidden" />}
                    </Stack>
                    <Typography variant="body2" sx={{ my: 0.5, whiteSpace: 'pre-wrap' }}>{c.comment}</Typography>
                    {!blogId && (
                      <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer' }} onClick={() => router.push(`/blog-comments?blogId=${c.blog?.id}`)}>
                        On "{c.blog?.title}" · {c.likes} likes · {c.replies} replies
                      </Typography>
                    )}
                  </Box>
                  <Tooltip title={c.hiddenAt ? 'Show in the app again' : 'Hide from the app'}>
                    <IconButton size="small" color={c.hiddenAt ? 'success' : 'warning'} onClick={() => toggle(c)}>
                      {c.hiddenAt ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setConfirm(c)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
        <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={20} rowsPerPageOptions={[20]} />
      </Paper>

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete this comment?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            It will be removed for good{confirm?.replies ? `, with its ${confirm.replies} replies` : ''}. Hiding keeps it saved instead.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Keep</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={feedback.open} autoHideDuration={3000} onClose={() => setFeedback((f) => ({ ...f, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={feedback.success ? 'success' : 'error'} variant="filled">{feedback.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default BlogComments;
