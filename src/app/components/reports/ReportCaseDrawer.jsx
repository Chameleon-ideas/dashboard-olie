'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckIcon from '@mui/icons-material/Check';
import ReasonDialog from '@/app/components/users/ReasonDialog';
import UserDetailDrawer from '@/app/components/users/UserDetailDrawer';
import {
  ACTION_COLOR,
  ACTION_LABEL,
  REASON_LABEL,
  TARGET_LABEL,
  caseAction,
  errorMessage,
  fetchCase,
  formatDate,
  sortedReasons,
  timeAgo,
} from './reportApi';

const Section = ({ title, children }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{title}</Typography>
    {children}
  </Box>
);

const SUCCESS = {
  HIDE: 'Content hidden. The reports are resolved.',
  UNHIDE: 'Content is visible again',
  WARN: 'Warning sent. The reports are resolved.',
  SUSPEND: 'User suspended. The reports are resolved.',
  CLOSE: 'Case closed with no action',
};

const ReportCaseDrawer = ({ token, target, open, onClose, onChanged, notify }) => {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // 'HIDE' | 'UNHIDE' | 'WARN' | 'SUSPEND' | 'CLOSE'
  const [userOpen, setUserOpen] = useState(false);

  const targetType = target?.targetType;
  const targetId = target?.targetId;

  const load = useCallback(async () => {
    if (!token || !targetType || !targetId) return;
    setLoading(true);
    setLoadError('');
    try {
      setItem(await fetchCase(token, targetType, targetId));
    } catch (e) {
      setLoadError(errorMessage(e, 'Could not load this case'));
    } finally {
      setLoading(false);
    }
  }, [token, targetType, targetId]);

  useEffect(() => {
    if (open) {
      setItem(null);
      setUserOpen(false);
      load();
    }
  }, [open, load]);

  const confirm = async (reason, message) => {
    setBusy(true);
    try {
      const updated = await caseAction(token, targetType, targetId, { action: pending, reason, message });
      notify(SUCCESS[pending] || 'Done');
      setPending(null);
      // The action returns the updated case, but not its reports/history, so fetch the full case again.
      if (updated) setItem((prev) => ({ ...prev, ...updated }));
      await load();
      onChanged?.();
    } catch (e) {
      notify(errorMessage(e, 'Something went wrong'), false);
    } finally {
      setBusy(false);
    }
  };

  const owner = item?.owner || null;
  const ownerName = owner?.name || owner?.email || 'the owner';
  const suspended = owner?.status === 'SUSPENDED';
  const isUser = targetType === 'USER';
  const isOpen = item?.status === 'OPEN';
  const typeLabel = TARGET_LABEL[targetType] || targetType;
  const thing = isUser ? 'this profile' : `this ${typeLabel?.toLowerCase()}`;
  const preview = item?.preview || {};
  const reports = item?.reports || [];
  const history = item?.history || [];

  const ownerBlocked = !owner
    ? 'Warn and suspend need a known app user. This belongs to an admin or its owner could not be found.'
    : suspended
    ? `${ownerName} is already suspended. Open the user to reactivate them.`
    : '';

  const dialogs = {
    HIDE: {
      title: `Hide ${thing}?`,
      message: `It disappears for everyone in the app straight away. You can show it again later. All open reports on it are marked resolved.`,
      confirmLabel: 'Hide content',
      confirmColor: 'warning',
      reasonLabel: 'Why are you hiding it? (admins only)',
    },
    UNHIDE: {
      title: `Show ${thing} again?`,
      message: 'It becomes visible in the app again. Report status does not change.',
      confirmLabel: 'Show again',
      reasonLabel: 'Why are you showing it again? (admins only)',
    },
    WARN: {
      title: `Warn ${ownerName}?`,
      message: 'They get a notification with the message below. Nothing is hidden or blocked. All open reports on this case are marked resolved.',
      confirmLabel: 'Send warning',
      confirmColor: 'warning',
      noteLabel: 'Message the user will see',
      noteHelper: 'Required. Be clear and kind, e.g. "Your post in Fitness was reported as spam. Please keep posts on topic."',
      reasonLabel: 'Internal reason (admins only)',
    },
    SUSPEND: {
      title: `Suspend ${ownerName}?`,
      message:
        'Same as suspending from Users: they are signed out on every device straight away and cannot log in until you reactivate them. The reason below is shown to them when they try to log in. All open reports on this case are marked resolved.',
      confirmLabel: 'Suspend',
      confirmColor: 'error',
      reasonLabel: 'Reason (shown to the user)',
    },
    CLOSE: {
      title: 'Close with no action?',
      message: 'All open reports on this case are marked resolved. Nothing changes for the owner or the content.',
      confirmLabel: 'Close case',
      confirmColor: 'success',
      reasonLabel: 'Why is no action needed?',
    },
  };

  const btn = { textTransform: 'none' };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 600 } } }}>
      <Box sx={{ p: 3, pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Reported {typeLabel?.toLowerCase()}</Typography>
              {item && (
                <Chip size="small" variant="outlined" color={isOpen ? 'warning' : 'success'} label={isOpen ? 'Open' : 'Resolved'} />
              )}
              {item?.hidden && <Chip size="small" color="default" icon={<VisibilityOffIcon />} label="Hidden" />}
            </Stack>
            {item && (
              <Typography variant="body2" color="text.secondary">
                {item.reportCount} {item.reportCount === 1 ? 'report' : 'reports'} · last {timeAgo(item.lastReportedAt)}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} aria-label="Close"><CloseIcon /></IconButton>
        </Stack>

        {item && (
          <>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              {!isUser &&
                (item.hidden ? (
                  <Button size="small" variant="outlined" startIcon={<VisibilityIcon />} onClick={() => setPending('UNHIDE')} sx={btn}>
                    Show again
                  </Button>
                ) : (
                  <Button size="small" variant="outlined" color="warning" startIcon={<VisibilityOffIcon />} onClick={() => setPending('HIDE')} sx={btn}>
                    Hide content
                  </Button>
                ))}
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<WarningAmberIcon />}
                disabled={!!ownerBlocked}
                onClick={() => setPending('WARN')}
                sx={btn}
              >
                Warn user
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<BlockIcon />}
                disabled={!!ownerBlocked}
                onClick={() => setPending('SUSPEND')}
                sx={btn}
              >
                Suspend user
              </Button>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                disabled={!isOpen}
                onClick={() => setPending('CLOSE')}
                sx={{ ...btn, boxShadow: 'none' }}
              >
                Close – no action needed
              </Button>
            </Stack>
            {ownerBlocked && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{ownerBlocked}</Typography>
            )}
            {!isOpen && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: ownerBlocked ? 0.25 : 1 }}>
                All reports on this case are resolved. New reports will reopen it.
              </Typography>
            )}
          </>
        )}
      </Box>
      <Divider />

      <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
        {loading && !item ? (
          <Box display="flex" justifyContent="center" py={6}><CircularProgress size={28} /></Box>
        ) : loadError && !item ? (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Try again</Button>}>{loadError}</Alert>
        ) : !item ? null : (
          <>
            <Section title={`What was reported · ${typeLabel}`}>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, opacity: item.hidden ? 0.75 : 1 }}>
                {preview.context && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{preview.context}</Typography>
                )}
                {preview.title && (
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, wordBreak: 'break-word' }}>{preview.title}</Typography>
                )}
                {preview.text && (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{preview.text}</Typography>
                )}
                {preview.image && (
                  <Box
                    component="a"
                    href={preview.image}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'block', mt: 1.5 }}
                  >
                    <Box
                      component="img"
                      src={preview.image}
                      alt=""
                      sx={{ maxWidth: '100%', maxHeight: 320, borderRadius: 1.5, objectFit: 'contain', display: 'block' }}
                    />
                  </Box>
                )}
                {!preview.title && !preview.text && !preview.image && (
                  <Typography variant="body2" color="text.secondary">No preview available. It may have been deleted.</Typography>
                )}
                {preview.createdAt && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Created {formatDate(preview.createdAt, true)}
                  </Typography>
                )}
              </Box>
            </Section>

            <Section title={isUser ? 'Reported user' : 'Owner'}>
              {owner ? (
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                  <Avatar src={owner.image || undefined} sx={{ width: 40, height: 40 }}>
                    {(owner.name || owner.email || '?')[0]?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{owner.name || 'No name yet'}</Typography>
                      {suspended && <Chip size="small" color="error" variant="outlined" label="Suspended" />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{owner.email}</Typography>
                  </Box>
                  <Link component="button" variant="body2" onClick={() => setUserOpen(true)} sx={{ fontWeight: 600, flexShrink: 0 }}>
                    Open user
                  </Link>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">Posted by an admin, or the owner could not be found.</Typography>
              )}
            </Section>

            <Section title={`Reports (${reports.length})`}>
              {sortedReasons(item.reasons).length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
                  {sortedReasons(item.reasons).map(([reason, n]) => (
                    <Chip key={reason} size="small" variant="outlined" label={`${REASON_LABEL[reason] || reason} ×${n}`} />
                  ))}
                </Stack>
              )}
              {reports.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No individual reports.</Typography>
              ) : (
                reports.map((r) => (
                  <Box key={r.id} sx={{ mb: 1.5, pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Avatar src={r.reporter?.image || undefined} sx={{ width: 30, height: 30, fontSize: 14 }}>
                        {(r.reporter?.name || '?')[0]?.toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.reporter?.name || 'Deleted user'}</Typography>
                          <Chip size="small" label={REASON_LABEL[r.reason] || r.reason} />
                          {r.status === 'RESOLVED' && <Chip size="small" variant="outlined" color="success" label="Resolved" />}
                        </Stack>
                        {r.details && (
                          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>"{r.details}"</Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">{formatDate(r.createdAt, true)}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                ))
              )}
            </Section>

            <Section title={`Action history (${history.length})`}>
              {history.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No action taken yet.</Typography>
              ) : (
                history.map((h, i) => (
                  <Box key={`${h.createdAt}-${i}`} sx={{ mb: 1.5, pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
                      <Chip size="small" variant="outlined" color={ACTION_COLOR[h.action] || 'default'} label={ACTION_LABEL[h.action] || h.action} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(h.createdAt, true)} · {h.adminEmail || 'Removed admin'}
                      </Typography>
                    </Stack>
                    {h.reason && <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>"{h.reason}"</Typography>}
                  </Box>
                ))
              )}
            </Section>
          </>
        )}
      </Box>

      <ReasonDialog open={!!pending} busy={busy} onClose={() => setPending(null)} onConfirm={confirm} {...(pending ? dialogs[pending] : {})} />

      {owner?.id && (
        <UserDetailDrawer
          token={token}
          userId={owner.id}
          open={userOpen}
          onClose={() => setUserOpen(false)}
          onChanged={() => {
            load();
            onChanged?.();
          }}
          notify={notify}
        />
      )}
    </Drawer>
  );
};

export default ReportCaseDrawer;
