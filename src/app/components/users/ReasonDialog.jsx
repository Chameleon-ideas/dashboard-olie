'use client';
import React, { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';

// Confirms an admin change and asks why. The reason goes in the audit log
// (and, for a suspension, is shown to the user when they try to log in).
const ReasonDialog = ({ open, title, message, children, confirmLabel = 'Confirm', confirmColor = 'primary', reasonLabel = 'Reason', busy, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const valid = reason.trim().length >= 3;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {message && <DialogContentText sx={{ mb: 2 }}>{message}</DialogContentText>}
        {children && <Box sx={{ mb: 2 }}>{children}</Box>}
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          size="small"
          label={reasonLabel}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          inputProps={{ maxLength: 500 }}
          helperText="Required (at least 3 characters). Saved in the change history."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" color={confirmColor} disabled={!valid || busy} onClick={() => onConfirm(reason.trim())}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReasonDialog;
