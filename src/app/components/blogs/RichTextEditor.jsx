'use client';
// The post editor: headings, bold/italic/underline, lists, quotes, links and
// pictures. Outputs HTML (the server cleans it again before saving).
import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extensions';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ImageIcon from '@mui/icons-material/Image';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

/** Shared look for the editor and the app preview. */
export const articleStyles = {
  fontSize: 17,
  lineHeight: 1.65,
  '& h2': { fontSize: 24, fontWeight: 800, margin: '20px 0 8px' },
  '& h3': { fontSize: 20, fontWeight: 700, margin: '16px 0 6px' },
  '& p': { margin: '0 0 12px' },
  '& ul, & ol': { paddingLeft: 3, margin: '0 0 12px' },
  '& blockquote': { borderLeft: '4px solid #F3BF6D', margin: '12px 0', padding: '4px 14px', color: 'text.secondary', fontStyle: 'italic' },
  '& a': { color: '#2F6FB0', textDecoration: 'underline' },
  '& img': { maxWidth: '100%', height: 'auto', borderRadius: 2, display: 'block', margin: '12px 0' },
};

const ToolButton = ({ title, active, disabled, onClick, children }) => (
  <Tooltip title={title}>
    <span>
      <IconButton
        size="small"
        onClick={onClick}
        disabled={disabled}
        sx={{ borderRadius: 1.5, bgcolor: active ? 'action.selected' : 'transparent' }}
      >
        {children}
      </IconButton>
    </span>
  </Tooltip>
);

/**
 * value: HTML. onChange(html, plainText). onUploadImage(file) → URL (for pictures
 * inside the post).
 */
const RichTextEditor = ({ value, onChange, onUploadImage, placeholder = 'Write your post…' }) => {
  const fileInput = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [, forceRender] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        link: { openOnClick: false, autolink: true, protocols: ['https', 'mailto'] },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor: e }) => onChange(e.getHTML(), e.getText()),
    onSelectionUpdate: () => forceRender((n) => n + 1),
  });

  // Loading a different post into an open editor.
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return <Box sx={{ minHeight: 320 }} />;

  const chain = () => editor.chain().focus();

  const openLink = () => {
    setLinkUrl(editor.getAttributes('link').href || 'https://');
    setLinkOpen(true);
  };

  const saveLink = () => {
    const url = linkUrl.trim();
    if (!url || url === 'https://') chain().unsetLink().run();
    else chain().extendMarkRange('link').setLink({ href: url }).run();
    setLinkOpen(false);
  };

  const addImage = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const url = await onUploadImage(file);
      if (url) chain().setImage({ src: url, alt: '' }).run();
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ px: 1, py: 0.5, flexWrap: 'wrap', bgcolor: 'action.hover' }}>
        <Button size="small" variant={editor.isActive('heading', { level: 2 }) ? 'contained' : 'text'} onClick={() => chain().toggleHeading({ level: 2 }).run()} sx={{ minWidth: 36, boxShadow: 'none' }}>H2</Button>
        <Button size="small" variant={editor.isActive('heading', { level: 3 }) ? 'contained' : 'text'} onClick={() => chain().toggleHeading({ level: 3 }).run()} sx={{ minWidth: 36, boxShadow: 'none' }}>H3</Button>
        <Divider orientation="vertical" flexItem />
        <ToolButton title="Bold" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}><FormatBoldIcon fontSize="small" /></ToolButton>
        <ToolButton title="Italic" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}><FormatItalicIcon fontSize="small" /></ToolButton>
        <ToolButton title="Underline" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()}><FormatUnderlinedIcon fontSize="small" /></ToolButton>
        <Divider orientation="vertical" flexItem />
        <ToolButton title="Bulleted list" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()}><FormatListBulletedIcon fontSize="small" /></ToolButton>
        <ToolButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()}><FormatListNumberedIcon fontSize="small" /></ToolButton>
        <ToolButton title="Quote" active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()}><FormatQuoteIcon fontSize="small" /></ToolButton>
        <Divider orientation="vertical" flexItem />
        <ToolButton title="Add link" active={editor.isActive('link')} onClick={openLink}><LinkIcon fontSize="small" /></ToolButton>
        <ToolButton title="Remove link" disabled={!editor.isActive('link')} onClick={() => chain().unsetLink().run()}><LinkOffIcon fontSize="small" /></ToolButton>
        <ToolButton title="Add picture" disabled={uploading} onClick={() => fileInput.current?.click()}>
          {uploading ? <CircularProgress size={18} /> : <ImageIcon fontSize="small" />}
        </ToolButton>
        <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ''; }} />
        <Box sx={{ flex: 1 }} />
        <ToolButton title="Undo" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}><UndoIcon fontSize="small" /></ToolButton>
        <ToolButton title="Redo" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}><RedoIcon fontSize="small" /></ToolButton>
      </Stack>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          minHeight: 320,
          maxHeight: '55vh',
          overflowY: 'auto',
          ...articleStyles,
          '& .ProseMirror': { outline: 'none', minHeight: 300 },
          '& .ProseMirror p.is-editor-empty:first-of-type::before': {
            content: 'attr(data-placeholder)',
            color: 'text.disabled',
            float: 'left',
            height: 0,
            pointerEvents: 'none',
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>

      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Link</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            margin="dense"
            label="Web address"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveLink()}
            helperText="Select some text first. Leave empty to remove the link."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveLink}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RichTextEditor;
