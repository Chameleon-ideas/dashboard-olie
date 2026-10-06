'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import FavoriteIcon from '@mui/icons-material/FavoriteBorder';
import BookmarkIcon from '@mui/icons-material/BookmarkBorder';
import BlogEditorDialog from '@/app/components/blogs/BlogEditorDialog';
import { deleteBlog, errorMessage, listBlogs, listTopics, readToken, setBlogStatus } from '@/app/components/blogs/blogApi';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'DRAFT', label: 'Drafts' },
];

const statusChip = (blog) => {
  if (blog.status === 'SCHEDULED') {
    return <Chip size="small" color="info" label={`Scheduled · ${new Date(blog.publishedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`} />;
  }
  if (blog.status === 'PUBLISHED') {
    return <Chip size="small" color="success" label={`Published · ${new Date(blog.publishedAt).toLocaleDateString([], { dateStyle: 'medium' })}`} />;
  }
  return <Chip size="small" variant="outlined" label="Draft" />;
};

const Stat = ({ icon, value, title }) => (
  <Tooltip title={title}>
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary', minWidth: 46 }}>
      {icon}
      <Typography variant="body2">{value}</Typography>
    </Stack>
  </Tooltip>
);

const Blogs = () => {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [topics, setTopics] = useState([]);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [topicId, setTopicId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null); // { id } or { id: null }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, message: '', success: true });

  const notify = (message, success = true) => setFeedback({ open: true, message, success });

  useEffect(() => setToken(readToken()), []);

  useEffect(() => {
    if (!token) return;
    listTopics(token).then(setTopics).catch(() => setTopics([]));
  }, [token]);

  // Search as you type, after a short pause.
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listBlogs(token, {
        page: page + 1,
        limit: rowsPerPage,
        ...(status ? { status } : {}),
        ...(topicId ? { topicId } : {}),
        ...(query ? { q: query } : {}),
      });
      setRows(data.blogs);
      setTotal(data.total);
      setCounts(data.counts || {});
    } catch (e) {
      notify(errorMessage(e, 'Could not load posts'), false);
    } finally {
      setLoading(false);
    }
  }, [token, page, rowsPerPage, status, topicId, query]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (blog, next) => {
    setBusyId(blog.id);
    try {
      await setBlogStatus(token, blog.id, next);
      notify(next === 'PUBLISHED' ? `"${blog.title}" is live` : `"${blog.title}" moved to drafts`);
      await load();
    } catch (e) {
      notify(errorMessage(e, 'Could not change the status'), false);
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => {
    const blog = confirmDelete;
    setConfirmDelete(null);
    setBusyId(blog.id);
    try {
      await deleteBlog(token, blog.id);
      notify(`"${blog.title}" deleted`);
      await load();
    } catch (e) {
      notify(errorMessage(e, 'Could not delete the post'), false);
    } finally {
      setBusyId(null);
    }
  };

  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1250, mx: 'auto' }}>
      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Blogs</Typography>
            <Typography variant="body2" color="text.secondary">
              Write, schedule and publish posts. Followers of a topic get a notification when a post goes live.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ChatIcon />} onClick={() => router.push('/blog-comments')} sx={{ textTransform: 'none' }}>
              Comments
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditor({ id: null })} sx={{ textTransform: 'none', boxShadow: 'none' }}>
              New post
            </Button>
          </Stack>
        </Stack>

        <Tabs value={status} onChange={(_, v) => { setStatus(v); setPage(0); }} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          {STATUS_TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={`${t.label} (${t.value ? counts[t.value] || 0 : allCount})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
          ))}
        </Tabs>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search titles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <TextField select size="small" value={topicId} onChange={(e) => { setTopicId(e.target.value); setPage(0); }} sx={{ minWidth: 220 }} SelectProps={{ displayEmpty: true }}>
            <MenuItem value="">All topics</MenuItem>
            {topics.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </TextField>
        </Stack>

        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Post</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Engagement</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Updated</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {query || topicId || status ? 'No posts match.' : 'No posts yet. Write the first one.'}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((blog) => (
                  <TableRow key={blog.id} hover sx={{ opacity: busyId === blog.id ? 0.5 : 1, cursor: 'pointer' }} onClick={() => setEditor({ id: blog.id })}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {blog.image ? (
                          <Box component="img" src={blog.image} alt="" sx={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 1.5, flexShrink: 0 }} />
                        ) : (
                          <Box sx={{ width: 72, height: 48, borderRadius: 1.5, bgcolor: 'action.hover', flexShrink: 0 }} />
                        )}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{blog.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {blog.category?.name || 'No topic'} · {blog.readMinutes} min read · {blog.admin?.name || 'Admin'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{statusChip(blog)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5}>
                        <Stat icon={<VisibilityIcon sx={{ fontSize: 16 }} />} value={blog.stats.readers} title={`${blog.stats.readers} readers (${blog.stats.views} views)`} />
                        <Stat icon={<FavoriteIcon sx={{ fontSize: 16 }} />} value={blog.stats.likes} title="Likes" />
                        <Stat icon={<ChatIcon sx={{ fontSize: 16 }} />} value={blog.stats.comments} title="Comments" />
                        <Stat icon={<BookmarkIcon sx={{ fontSize: 16 }} />} value={blog.stats.saves} title="Saves" />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{new Date(blog.updatedAt).toLocaleDateString([], { dateStyle: 'medium' })}</Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => setEditor({ id: blog.id })}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      {blog.status === 'PUBLISHED' ? (
                        <Tooltip title="Unpublish (back to drafts)"><IconButton size="small" color="warning" onClick={() => changeStatus(blog, 'DRAFT')}><UnpublishedIcon fontSize="small" /></IconButton></Tooltip>
                      ) : (
                        <Tooltip title="Publish now"><IconButton size="small" color="success" onClick={() => changeStatus(blog, 'PUBLISHED')}><PublishIcon fontSize="small" /></IconButton></Tooltip>
                      )}
                      <Tooltip title="Comments"><IconButton size="small" onClick={() => router.push(`/blog-comments?blogId=${blog.id}`)}><ChatIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setConfirmDelete(blog)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </TableContainer>
      </Paper>

      <BlogEditorDialog
        open={Boolean(editor)}
        blogId={editor?.id || null}
        topics={topics}
        token={token}
        onClose={() => setEditor(null)}
        onSaved={(saved, status) => {
          setEditor(null);
          notify(status === 'PUBLISHED' ? 'Published' : status === 'SCHEDULED' ? 'Scheduled' : status === 'DRAFT' ? 'Saved as draft' : 'Saved');
          load();
        }}
      />

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete this post?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            "{confirmDelete?.title}" will be removed for good
            {confirmDelete && (confirmDelete.stats.comments || confirmDelete.stats.likes)
              ? `, with its ${confirmDelete.stats.comments} comments and ${confirmDelete.stats.likes} likes`
              : ''}
            . To take it down for now, unpublish it instead.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Keep</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={feedback.open} autoHideDuration={3500} onClose={() => setFeedback((f) => ({ ...f, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={feedback.success ? 'success' : 'error'} variant="filled" onClose={() => setFeedback((f) => ({ ...f, open: false }))}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Blogs;
