'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Popover,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ImageIcon from '@mui/icons-material/Image';
import RichTextEditor, { articleStyles } from './RichTextEditor';
import { errorMessage, getBlog, saveBlog, uploadInlineImage } from './blogApi';

const WORDS_PER_MINUTE = 200;
const MAX_COVER_BYTES = 5 * 1024 * 1024;

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Older plain-text posts open in the editor as paragraphs. */
const toEditorHtml = (blog) => {
  if (!blog?.content) return '';
  if (blog.contentFormat === 'HTML') return blog.content;
  return blog.content
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
};

const readMinutes = (text) => Math.max(1, Math.ceil(text.trim().split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE));

/** "YYYY-MM-DDTHH:mm" in this computer's time, for a datetime-local input. */
const toLocalInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyDraft = () => ({ title: '', topicId: '', html: '', text: '', excerpt: '', status: 'DRAFT', publishedAt: null, image: null });

/** Write or edit a post. blogId: the post being edited, or null for a new one. */
const BlogEditorDialog = ({ open, blogId, topics, token, onClose, onSaved }) => {
  const [draft, setDraft] = useState(emptyDraft);
  const [cover, setCover] = useState(null); // a new File
  const [coverPreview, setCoverPreview] = useState('');
  const [removeCover, setRemoveCover] = useState(false);
  const [tab, setTab] = useState('write');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [scheduleAnchor, setScheduleAnchor] = useState(null);
  const [scheduleAt, setScheduleAt] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setTab('write');
    setCover(null);
    setRemoveCover(false);
    if (!blogId) {
      setDraft(emptyDraft());
      setCoverPreview('');
      return;
    }
    setLoading(true);
    getBlog(token, blogId)
      .then((blog) => {
        const html = toEditorHtml(blog);
        setDraft({
          title: blog.title || '',
          topicId: blog.categoryId || '',
          html,
          text: html.replace(/<[^>]+>/g, ' '),
          excerpt: blog.excerpt || '',
          status: blog.status,
          publishedAt: blog.publishedAt,
          image: blog.image,
        });
        setCoverPreview(blog.image || '');
      })
      .catch((e) => setError(errorMessage(e, 'Could not open this post')))
      .finally(() => setLoading(false));
  }, [open, blogId, token]);

  const minutes = useMemo(() => readMinutes(draft.text || ''), [draft.text]);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const topicName = topics.find((t) => t.id === draft.topicId)?.name;

  const pickCover = (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return setError('The cover must be a JPG, PNG, WebP or GIF image.');
    if (file.size > MAX_COVER_BYTES) return setError('The cover must be 5 MB or smaller.');
    setError('');
    setCover(file);
    setRemoveCover(false);
    setCoverPreview(URL.createObjectURL(file));
  };

  const problems = () => {
    if (draft.title.trim().length < 3) return 'Give the post a title (at least 3 characters).';
    if (!draft.topicId) return 'Choose a topic.';
    if ((draft.text || '').trim().length < 10) return 'Write at least a sentence.';
    return '';
  };

  /** status: DRAFT | PUBLISHED | SCHEDULED, or null to keep the current one. */
  const save = async (status, publishedAt) => {
    const problem = problems();
    if (problem) return setError(problem);
    try {
      setSaving(status || 'save');
      setError('');
      const saved = await saveBlog(
        token,
        blogId,
        {
          title: draft.title.trim(),
          topicId: draft.topicId,
          content: draft.html,
          contentFormat: 'HTML',
          excerpt: draft.excerpt.trim(),
          ...(status ? { status } : {}),
          ...(publishedAt ? { publishedAt } : {}),
          ...(removeCover && !cover ? { removeImage: 'true' } : {}),
        },
        cover
      );
      onSaved(saved, status);
    } catch (e) {
      setError(errorMessage(e, 'Could not save the post'));
    } finally {
      setSaving('');
    }
  };

  const schedule = () => {
    const at = new Date(scheduleAt);
    if (Number.isNaN(at.getTime()) || at <= new Date()) return setError('Pick a time in the future.');
    setScheduleAnchor(null);
    save('SCHEDULED', at.toISOString());
  };

  const isPublished = draft.status === 'PUBLISHED';
  const busy = Boolean(saving) || loading;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pr: 7 }}>
        {blogId ? 'Edit post' : 'New post'}
        {blogId && (
          <Chip
            size="small"
            sx={{ ml: 1.5 }}
            label={draft.status === 'SCHEDULED' ? `Scheduled · ${new Date(draft.publishedAt).toLocaleString()}` : draft.status === 'PUBLISHED' ? 'Published' : 'Draft'}
            color={draft.status === 'PUBLISHED' ? 'success' : draft.status === 'SCHEDULED' ? 'info' : 'default'}
          />
        )}
        <IconButton onClick={onClose} disabled={busy} sx={{ position: 'absolute', right: 12, top: 12 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="write" label="Write" sx={{ textTransform: 'none' }} />
        <Tab value="preview" label="Preview in the app" sx={{ textTransform: 'none' }} />
      </Tabs>
      <DialogContent sx={{ minHeight: 480 }}>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>
        ) : tab === 'write' ? (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Title"
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              inputProps={{ maxLength: 191 }}
              InputProps={{ sx: { fontSize: 20, fontWeight: 700 } }}
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField select label="Topic" value={draft.topicId} onChange={(e) => set({ topicId: e.target.value })} sx={{ minWidth: 240 }}>
                {topics.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </TextField>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1 }}>
                {coverPreview && !removeCover ? (
                  <Box component="img" src={coverPreview} alt="" sx={{ width: 96, height: 56, objectFit: 'cover', borderRadius: 1.5 }} />
                ) : (
                  <Box sx={{ width: 96, height: 56, borderRadius: 1.5, bgcolor: 'action.hover', display: 'grid', placeItems: 'center' }}>
                    <ImageIcon color="disabled" />
                  </Box>
                )}
                <Button component="label" variant="outlined" sx={{ textTransform: 'none' }}>
                  {coverPreview && !removeCover ? 'Change cover' : 'Add cover'}
                  <input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { pickCover(e.target.files?.[0]); e.target.value = ''; }} />
                </Button>
                {coverPreview && !removeCover && (
                  <Button color="inherit" sx={{ textTransform: 'none' }} onClick={() => { setRemoveCover(true); setCover(null); }}>Remove</Button>
                )}
              </Stack>
            </Stack>
            <RichTextEditor
              value={draft.html}
              onChange={(html, text) => set({ html, text })}
              onUploadImage={async (file) => {
                try {
                  return await uploadInlineImage(token, file);
                } catch (e) {
                  setError(errorMessage(e, 'Could not upload the picture'));
                  return null;
                }
              }}
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <TextField
                label="Preview text (optional)"
                value={draft.excerpt}
                onChange={(e) => set({ excerpt: e.target.value })}
                inputProps={{ maxLength: 300 }}
                helperText="Shown in lists. Leave empty to use the opening lines."
                sx={{ flex: 1 }}
                size="small"
              />
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                About {minutes} min read
              </Typography>
            </Stack>
          </Stack>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Box sx={{ width: 390, maxWidth: '100%', bgcolor: '#FFF7E9', borderRadius: 4, overflow: 'hidden', boxShadow: 3 }}>
              {coverPreview && !removeCover && <Box component="img" src={coverPreview} alt="" sx={{ width: '100%', height: 200, objectFit: 'cover' }} />}
              <Box sx={{ p: 2.5 }}>
                {topicName && <Chip size="small" label={topicName} sx={{ mb: 1, bgcolor: '#FFE1A4' }} />}
                <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1.15, mb: 1 }}>{draft.title || 'Untitled'}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Ollie team · {new Date(draft.publishedAt || Date.now()).toLocaleDateString()} · {minutes} min read
                </Typography>
                <Box sx={articleStyles} dangerouslySetInnerHTML={{ __html: draft.html || '<p><em>Nothing written yet.</em></p>' }} />
              </Box>
            </Box>
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
        {isPublished ? (
          <>
            <Button color="inherit" disabled={busy} onClick={() => save('DRAFT')} sx={{ textTransform: 'none' }}>
              {saving === 'DRAFT' ? <CircularProgress size={18} /> : 'Unpublish'}
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button variant="contained" disabled={busy} onClick={() => save(null)} sx={{ textTransform: 'none', boxShadow: 'none', minWidth: 140 }}>
              {saving === 'save' ? <CircularProgress size={18} color="inherit" /> : 'Save changes'}
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" disabled={busy} onClick={() => save('DRAFT')} sx={{ textTransform: 'none' }}>
              {saving === 'DRAFT' ? <CircularProgress size={18} /> : 'Save draft'}
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="outlined"
              disabled={busy}
              startIcon={<ScheduleIcon />}
              onClick={(e) => {
                setScheduleAt(toLocalInput(draft.status === 'SCHEDULED' && draft.publishedAt ? draft.publishedAt : Date.now() + 60 * 60 * 1000));
                setScheduleAnchor(e.currentTarget);
              }}
              sx={{ textTransform: 'none' }}
            >
              {saving === 'SCHEDULED' ? <CircularProgress size={18} /> : draft.status === 'SCHEDULED' ? 'Reschedule' : 'Schedule'}
            </Button>
            <Button variant="contained" disabled={busy} onClick={() => save('PUBLISHED')} sx={{ textTransform: 'none', boxShadow: 'none', minWidth: 140 }}>
              {saving === 'PUBLISHED' ? <CircularProgress size={18} color="inherit" /> : 'Publish now'}
            </Button>
          </>
        )}
      </DialogActions>

      <Popover
        open={Boolean(scheduleAnchor)}
        anchorEl={scheduleAnchor}
        onClose={() => setScheduleAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Stack spacing={1.5} sx={{ p: 2, width: 280 }}>
          <Typography variant="subtitle2">Publish on</Typography>
          <TextField type="datetime-local" size="small" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          <Typography variant="caption" color="text.secondary">Your computer's time. Followers of the topic get a notification when it goes live.</Typography>
          <Button variant="contained" onClick={schedule} sx={{ textTransform: 'none', boxShadow: 'none' }}>Schedule</Button>
        </Stack>
      </Popover>
    </Dialog>
  );
};

export default BlogEditorDialog;
