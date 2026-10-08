'use client';
import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import BASE_URL from '@/utils/api';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Chip,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FlagIcon from '@mui/icons-material/Flag';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PollIcon from '@mui/icons-material/Poll';
import { CustomizerContext } from '@/app/context/customizerContext';

// What kind of post it is, for the chip under the title.
const POST_KIND = {
  VIDEO: { label: 'Video', color: 'secondary' },
  POLL: { label: 'Poll', color: 'info' },
  IMAGE: { label: 'Images', color: 'primary' },
  TEXT: { label: 'Text', color: 'default' },
};
const postKind = (post) => (post.type === 'ADMIN_POST' ? null : POST_KIND[post.postType] || (post.videoUrl ? POST_KIND.VIDEO : null));

// The small preview in the table: the cover image, a frame of the video, or a poll icon.
const MediaThumb = ({ post, border }) => {
  const box = { width: 72, height: 48, borderRadius: 1.5, border: '1px solid', borderColor: border, overflow: 'hidden', position: 'relative', bgcolor: '#0f172a' };
  const play = (
    <PlayCircleIcon sx={{ position: 'absolute', inset: 0, m: 'auto', color: '#fff', fontSize: 24, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.6))' }} />
  );
  if (post.image) {
    return (
      <Box sx={{ ...box, bgcolor: 'transparent' }}>
        <Box component="img" src={post.image} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {post.videoUrl && play}
      </Box>
    );
  }
  if (post.videoUrl) {
    // No thumbnail (older posts): the browser shows the first frame.
    return (
      <Box sx={box}>
        <Box component="video" src={`${post.videoUrl}#t=0.5`} preload="metadata" muted playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {play}
      </Box>
    );
  }
  if (post.poll) return <PollIcon color="info" />;
  return '-';
};

// Poll answers with how many chose each.
const PollResults = ({ poll, isDark }) => (
  <Box sx={{ mb: 2, p: 2, borderRadius: 2, border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
      {poll.question || 'Poll'} · {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}
    </Typography>
    {(poll.results || []).map((o) => (
      <Box key={o.id} sx={{ mb: 1 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">{o.text}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{o.percentage}% · {o.votes}</Typography>
        </Stack>
        <Box sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', mt: 0.5 }}>
          <Box sx={{ width: `${o.percentage}%`, height: '100%', borderRadius: 3, bgcolor: 'info.main' }} />
        </Box>
      </Box>
    ))}
  </Box>
);

const Posts = () => {
  const [interests, setInterests] = useState([]);
  const [posts, setPosts] = useState([]);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [currentPost, setCurrentPost] = useState(null);
  const [viewPost, setViewPost] = useState(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [errors, setErrors] = useState({
    title: '',
    content: '',
    selectedInterest: '',
    image: '',
  });

  const [feedback, setFeedback] = useState({
    message: '',
    success: true,
    open: false,
  });

  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';

  useEffect(() => {
    try {
      const storedUser =
        typeof window !== 'undefined'
          ? JSON.parse(sessionStorage.getItem('user') || 'null')
          : null;

      setToken(storedUser?.data?.adminToken || '');
    } catch (error) {
      console.error('Session parse error:', error);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchInterests();
      fetchPosts();
    }
  }, [token]);

  const fetchInterests = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/interest/getUserInterest`, {
        headers: { 'x-access-token': token },
      });

      if (res.data.success) {
        setInterests(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch interests:', error);
      setFeedback({
        message: 'Failed to fetch interests',
        success: false,
        open: true,
      });
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/admin/post/getAllPosts`, {
        headers: { 'x-access-token': token },
      });

      if (res.data.success) {
        setPosts(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setFeedback({
        message: 'Failed to fetch posts',
        success: false,
        open: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const clearImagePreview = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
  };

  const resetForm = () => {
    clearImagePreview();
    setTitle('');
    setContent('');
    setSelectedInterest('');
    setImageFile(null);
    setImagePreview('');
    setCurrentPost(null);
    setErrors({
      title: '',
      content: '',
      selectedInterest: '',
      image: '',
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setFormMode('create');
    setFormDialogOpen(true);
  };

  const openEditDialog = (post) => {
    resetForm();
    setFormMode('edit');
    setCurrentPost(post);
    setTitle(post.title || '');
    setContent(post.content || '');
    setImagePreview(post.image || '');
    setFormDialogOpen(true);
  };

  const closeFormDialog = () => {
    setFormDialogOpen(false);
    setSubmitting(false);
    resetForm();
  };

  const openViewDialog = (post) => {
    setViewPost(post);
    setViewDialogOpen(true);
  };

  const closeViewDialog = () => {
    setViewDialogOpen(false);
    setViewPost(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setImageFile(null);
      if (formMode === 'create') {
        clearImagePreview();
        setImagePreview('');
      }
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Please select a valid image file' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Image must be under 5MB' }));
      return;
    }

    clearImagePreview();
    const previewUrl = URL.createObjectURL(file);

    setImageFile(file);
    setImagePreview(previewUrl);
    setErrors((prev) => ({ ...prev, image: '' }));
  };

  const validateForm = () => {
    const nextErrors = {
      title: '',
      content: '',
      selectedInterest: '',
      image: '',
    };

    if (!title.trim()) {
      nextErrors.title = 'Title is required';
    } else if (title.trim().length < 3) {
      nextErrors.title = 'Title must be at least 3 characters';
    }

    if (!content.trim()) {
      nextErrors.content = 'Content is required';
    } else if (content.trim().length < 10) {
      nextErrors.content = 'Content must be at least 10 characters';
    }

    if (formMode === 'create' && !selectedInterest) {
      nextErrors.selectedInterest = 'Interest is required';
    }

    if (formMode === 'create' && !imageFile) {
      nextErrors.image = 'Image is required';
    }

    setErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formData = new FormData();
    formData.append('postTitle', title.trim());
    formData.append('postContent', content.trim());
    formData.append('image', imageFile);

    try {
      setSubmitting(true);

      const res = await axios.post(
        `${BASE_URL}/admin/post/createPost/${selectedInterest}`,
        formData,
        {
          headers: {
            'x-access-token': token,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (res.data.success) {
        closeFormDialog();
        fetchPosts();
        setFeedback({
          message: 'Post created successfully!',
          success: true,
          open: true,
        });
      } else {
        setFeedback({
          message: 'Failed to create post',
          success: false,
          open: true,
        });
      }
    } catch (error) {
      console.error('Create post error:', error);
      setFeedback({
        message: error?.response?.data?.message || 'Failed to create post',
        success: false,
        open: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePost = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!currentPost?.id) return;

    const formData = new FormData();
    formData.append('postTitle', title.trim());
    formData.append('postContent', content.trim());

    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      setSubmitting(true);

      const res = await axios.put(
        `${BASE_URL}/admin/post/updatePost/${currentPost.id}`,
        formData,
        {
          headers: {
            'x-access-token': token,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (res.data.success) {
        closeFormDialog();
        fetchPosts();
        setFeedback({
          message: 'Post updated successfully!',
          success: true,
          open: true,
        });
      } else {
        setFeedback({
          message: 'Failed to update post',
          success: false,
          open: true,
        });
      }
    } catch (error) {
      console.error('Update post error:', error);
      setFeedback({
        message: error?.response?.data?.message || 'Failed to update post',
        success: false,
        open: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await axios.delete(`${BASE_URL}/admin/post/deletePost/${postId}`, {
        headers: { 'x-access-token': token },
      });

      if (res.data.success) {
        fetchPosts();
        setFeedback({
          message: 'Post deleted successfully!',
          success: true,
          open: true,
        });
      } else {
        setFeedback({
          message: 'Failed to delete post',
          success: false,
          open: true,
        });
      }
    } catch (error) {
      console.error('Delete post error:', error);
      setFeedback({
        message: error?.response?.data?.message || 'Failed to delete post',
        success: false,
        open: true,
      });
    }
  };

  const filteredPosts = posts.filter((post) => {
    const keyword = searchTerm.toLowerCase();
    return (
      post.title?.toLowerCase().includes(keyword) ||
      post.category?.name?.toLowerCase().includes(keyword)
    );
  });

  const paginatedPosts = filteredPosts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
          backgroundColor: isDark ? '#1e1e2f' : '#fff',
          color: isDark ? '#fff' : '#111827',
          boxShadow: isDark ? 'none' : '0 10px 30px rgba(0,0,0,0.06)',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              User Posts
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#6b7280' }}>
              Manage posts, images, and linked interests.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              px: 2,
              py: 1,
              boxShadow: 'none',
            }}
          >
            Create Post
          </Button>
        </Stack>

        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by title or interest..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: isDark ? '#25253a' : '#fafafa',
              },
            }}
          />
        </Box>

        <TableContainer
          sx={{
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: isDark ? '#25253a' : '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700, width: 80 }}>S.No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110 }}>Media</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Interest</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedPosts.length > 0 ? (
                paginatedPosts.map((post, index) => (
                  <TableRow key={post.id} hover>
                    <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell>
                      {post.title}
                      {postKind(post) && (
                        <Box sx={{ mt: 0.5 }}>
                          <Chip size="small" variant="outlined" color={postKind(post).color} label={postKind(post).label} />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <MediaThumb post={post} border={isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'} />
                    </TableCell>
                    <TableCell>{post.category?.name || '-'}</TableCell>
                    <TableCell>
                      {post.isReport ? (
                        <Chip
                          size="small"
                          icon={<FlagIcon />}
                          label="Reported"
                          color="error"
                          variant="outlined"
                        />
                      ) : (
                        <Chip size="small" label="Active" color="success" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={() => openViewDialog(post)}
                        color="primary"
                        size="small"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => openEditDialog(post)}
                        color="secondary"
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeletePost(post.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: isDark ? '#cbd5e1' : '#6b7280' }}
                    >
                      {loading ? 'Loading posts...' : 'No posts found.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <TablePagination
            component="div"
            count={filteredPosts.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 20, 50]}
            sx={{
              borderTop: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
              '& .MuiTablePagination-toolbar': {
                px: 2,
              },
            }}
          />
        </TableContainer>
      </Paper>

      <Dialog open={formDialogOpen} onClose={closeFormDialog} fullWidth maxWidth="sm">
        <form onSubmit={formMode === 'create' ? handleCreatePost : handleUpdatePost}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {formMode === 'create' ? 'Create Post' : 'Edit Post'}
          </DialogTitle>

          <DialogContent>
            <TextField
              fullWidth
              autoFocus
              size="small"
              label="Title"
              margin="dense"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
              error={!!errors.title}
              helperText={errors.title || ' '}
            />

            <TextField
              fullWidth
              size="small"
              multiline
              minRows={4}
              label="Content"
              margin="dense"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errors.content) setErrors((prev) => ({ ...prev, content: '' }));
              }}
              error={!!errors.content}
              helperText={errors.content || ' '}
            />

            {formMode === 'create' ? (
              <TextField
                select
                fullWidth
                size="small"
                label="Interest"
                margin="dense"
                value={selectedInterest}
                onChange={(e) => {
                  setSelectedInterest(e.target.value);
                  if (errors.selectedInterest) {
                    setErrors((prev) => ({ ...prev, selectedInterest: '' }));
                  }
                }}
                error={!!errors.selectedInterest}
                helperText={errors.selectedInterest || ' '}
              >
                <MenuItem value="">Select Interest</MenuItem>
                {interests.map((interest) => (
                  <MenuItem key={interest.id} value={interest.id}>
                    {interest.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                fullWidth
                size="small"
                label="Interest"
                margin="dense"
                value={currentPost?.category?.name || ''}
                disabled
                helperText="Interest is read-only in edit mode"
              />
            )}

            <Box sx={{ mt: 1 }}>
              <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
                {formMode === 'create' ? 'Upload Image' : 'Change Image'}
                <input hidden type="file" accept="image/*" onChange={handleImageChange} />
              </Button>

              {errors.image && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                  {errors.image}
                </Typography>
              )}

              {imagePreview && (
                <Box
                  component="img"
                  src={imagePreview}
                  alt="Preview"
                  sx={{
                    mt: 2,
                    width: '100%',
                    maxHeight: 220,
                    objectFit: 'cover',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
                  }}
                />
              )}
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={closeFormDialog}
              color="inherit"
              disabled={submitting}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ textTransform: 'none', boxShadow: 'none', minWidth: 130 }}
            >
              {submitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : formMode === 'create' ? (
                'Create Post'
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={viewDialogOpen} onClose={closeViewDialog} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 700 }}>{viewPost?.title}</DialogTitle>

        <DialogContent>
          {viewPost?.videoUrl && (
            <Box
              component="video"
              src={viewPost.videoUrl}
              poster={viewPost.image || undefined}
              controls
              playsInline
              preload="metadata"
              sx={{ width: '100%', maxHeight: 420, borderRadius: 2, mb: 2, bgcolor: '#000' }}
            />
          )}
          {viewPost?.poll && <PollResults poll={viewPost.poll} isDark={isDark} />}
          {viewPost?.images?.length > 1 && (
            <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto' }}>
              {viewPost.images.map((src) => (
                <Box key={src} component="a" href={src} target="_blank" rel="noreferrer" sx={{ flexShrink: 0 }}>
                  <Box component="img" src={src} alt="" sx={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 1.5, display: 'block' }} />
                </Box>
              ))}
            </Stack>
          )}
          {viewPost?.image && !viewPost?.videoUrl && !(viewPost?.images?.length > 1) && (
            <Box
              component="img"
              src={viewPost.image}
              alt={viewPost.title}
              sx={{
                width: '100%',
                maxHeight: 320,
                objectFit: 'cover',
                borderRadius: 2,
                mb: 2,
              }}
            />
          )}

          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={`Interest: ${viewPost?.category?.name || '-'}`}
              variant="outlined"
            />
            {viewPost && postKind(viewPost) && (
              <Chip size="small" variant="outlined" color={postKind(viewPost).color} label={postKind(viewPost).label} />
            )}
            {viewPost?.author?.name && <Chip size="small" variant="outlined" label={`By ${viewPost.author.name}`} />}
            {viewPost?.hidden && <Chip size="small" label="Hidden" />}
            {viewPost?.isReport ? (
              <Chip
                size="small"
                icon={<FlagIcon />}
                label="Reported"
                color="error"
                variant="outlined"
              />
            ) : (
              <Chip size="small" label="Active" color="success" variant="outlined" />
            )}
          </Stack>

          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
            {viewPost?.content}
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeViewDialog} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={feedback.open}
        autoHideDuration={3000}
        onClose={() => setFeedback({ ...feedback, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setFeedback({ ...feedback, open: false })}
          severity={feedback.success ? 'success' : 'error'}
          variant="filled"
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Posts;