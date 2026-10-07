'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BlockIcon from '@mui/icons-material/Block';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LogoutIcon from '@mui/icons-material/Logout';
import ReasonDialog from './ReasonDialog';
import { errorMessage, fetchUser, fetchUserAudit, formatDate, fullName, updateUser, userAction } from './userApi';

const TEXT_FIELDS = [
  { key: 'firstName', label: 'First name', max: 50 },
  { key: 'lastName', label: 'Last name', max: 50 },
  { key: 'phoneNumber', label: 'Phone', max: 30 },
  { key: 'emergencyContactNumber', label: 'Emergency contact', max: 30 },
  { key: 'city', label: 'City', max: 100 },
  { key: 'states', label: 'State / region', max: 100 },
  { key: 'country', label: 'Country', max: 100 },
];

const TOGGLES = [
  { key: 'notificationOnAndOff', label: 'Notifications on' },
  { key: 'wantDailySupplement', label: 'Daily supplement reminders' },
  { key: 'wantDailyActivities', label: 'Daily activity suggestions' },
  { key: 'showAds', label: 'Show ads' },
];

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const FIELD_LABEL = {
  ...Object.fromEntries([...TEXT_FIELDS, ...TOGGLES].map((f) => [f.key, f.label])),
  dateOfBirth: 'Date of birth',
  gender: 'Gender',
};

const ACTION_LABEL = {
  UPDATE_PROFILE: 'Edited details',
  SUSPEND: 'Suspended',
  REACTIVATE: 'Reactivated',
  FORCE_LOGOUT: 'Signed out everywhere',
};

const ACTION_COLOR = { SUSPEND: 'error', REACTIVATE: 'success', FORCE_LOGOUT: 'warning', UPDATE_PROFILE: 'primary' };

const toForm = (user) => ({
  ...Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, user?.[f.key] || ''])),
  ...Object.fromEntries(TOGGLES.map((f) => [f.key, !!user?.[f.key]])),
  gender: user?.gender || '',
  dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
});

const showValue = (key, value) => {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (key === 'dateOfBirth') return formatDate(value);
  return String(value);
};

const Info = ({ label, value }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{value || '-'}</Typography>
  </Box>
);

const Section = ({ title, children }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{title}</Typography>
    {children}
  </Box>
);

const UserDetailDrawer = ({ token, userId, open, onClose, onChanged, notify }) => {
  const [tab, setTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(toForm(null));
  const [pending, setPending] = useState(null); // 'save' | 'suspend' | 'reactivate' | 'logout'

  const load = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const [detail, history] = await Promise.all([fetchUser(token, userId), fetchUserAudit(token, userId)]);
      setUser(detail);
      setAudit(history);
      setForm(toForm(detail));
    } catch (e) {
      notify(errorMessage(e, 'Could not load this user'), false);
    } finally {
      setLoading(false);
    }
  }, [token, userId, notify]);

  useEffect(() => {
    if (open) {
      setTab('overview');
      setUser(null);
      load();
    }
  }, [open, load]);

  const initial = useMemo(() => toForm(user), [user]);
  const changes = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(form)
          .filter(([key, value]) => (typeof value === 'string' ? value.trim() : value) !== initial[key])
          .map(([key, value]) => [key, key === 'dateOfBirth' && !value ? null : typeof value === 'string' ? value.trim() : value])
      ),
    [form, initial]
  );
  const changedKeys = Object.keys(changes);

  const confirm = async (reason) => {
    setBusy(true);
    try {
      if (pending === 'save') {
        await updateUser(token, userId, changes, reason);
        notify('Details saved');
      } else {
        await userAction(token, userId, pending, reason);
        notify(
          pending === 'suspend' ? 'User suspended and signed out' : pending === 'reactivate' ? 'User reactivated' : 'User signed out on every device'
        );
      }
      setPending(null);
      await load();
      onChanged?.();
    } catch (e) {
      notify(errorMessage(e, 'Something went wrong'), false);
    } finally {
      setBusy(false);
    }
  };

  const suspended = user?.status === 'SUSPENDED';

  const dialogs = {
    save: {
      title: 'Save changes?',
      message: `You're changing ${changedKeys.length} ${changedKeys.length === 1 ? 'field' : 'fields'} on ${fullName(user)}'s profile.`,
      confirmLabel: 'Save changes',
      reasonLabel: 'Why are you changing this?',
      children: (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
          {changedKeys.map((key) => (
            <Typography key={key} variant="body2" sx={{ mb: 0.5 }}>
              <strong>{FIELD_LABEL[key] || key}:</strong> {showValue(key, initial[key])} → {showValue(key, changes[key])}
            </Typography>
          ))}
        </Box>
      ),
    },
    suspend: {
      title: `Suspend ${fullName(user)}?`,
      message:
        'They are signed out on every device straight away, stop getting notifications, and cannot log in until you reactivate them. Their posts and data stay as they are. The reason below is shown to them when they try to log in.',
      confirmLabel: 'Suspend',
      confirmColor: 'error',
      reasonLabel: 'Reason (shown to the user)',
    },
    reactivate: {
      title: `Reactivate ${fullName(user)}?`,
      message: 'They can log in again straight away.',
      confirmLabel: 'Reactivate',
      confirmColor: 'success',
    },
    logout: {
      title: `Sign ${fullName(user)} out everywhere?`,
      message: 'Every device they are logged in on is signed out. They can log in again with their password. Use this for a lost phone or a suspected account takeover.',
      confirmLabel: 'Sign out everywhere',
      confirmColor: 'warning',
    },
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}>
      <Box sx={{ p: 3, pb: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar src={user?.image || undefined} sx={{ width: 52, height: 52 }}>
              {(user?.firstName || user?.email || '?')[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>{user ? fullName(user) : 'Loading…'}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{user?.email}</Typography>
              {user && (
                <Chip
                  size="small"
                  sx={{ mt: 0.5 }}
                  color={suspended ? 'error' : 'success'}
                  variant="outlined"
                  label={suspended ? 'Suspended' : 'Active'}
                />
              )}
            </Box>
          </Stack>
          <IconButton onClick={onClose} aria-label="Close"><CloseIcon /></IconButton>
        </Stack>

        {user && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            {suspended ? (
              <Button size="small" variant="contained" color="success" startIcon={<LockOpenIcon />} onClick={() => setPending('reactivate')} sx={{ textTransform: 'none', boxShadow: 'none' }}>
                Reactivate
              </Button>
            ) : (
              <Button size="small" variant="outlined" color="error" startIcon={<BlockIcon />} onClick={() => setPending('suspend')} sx={{ textTransform: 'none' }}>
                Suspend
              </Button>
            )}
            <Button size="small" variant="outlined" color="warning" startIcon={<LogoutIcon />} onClick={() => setPending('logout')} sx={{ textTransform: 'none' }}>
              Sign out everywhere
            </Button>
          </Stack>
        )}

        {suspended && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Suspended {formatDate(user.suspendedAt, true)}
            {user.suspendedReason ? `: ${user.suspendedReason}` : ''}
          </Alert>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="overview" label="Overview" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab value="edit" label="Edit details" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab value="history" label={`History (${audit.length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Box>

      <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
        {loading && !user ? (
          <Box display="flex" justifyContent="center" py={6}><CircularProgress size={28} /></Box>
        ) : !user ? null : tab === 'overview' ? (
          <>
            <Section title="Profile">
              <Grid container spacing={2}>
                <Grid size={6}><Info label="Phone" value={user.phoneNumber} /></Grid>
                <Grid size={6}><Info label="Emergency contact" value={user.emergencyContactNumber} /></Grid>
                <Grid size={6}><Info label="Date of birth" value={user.dateOfBirth && formatDate(user.dateOfBirth)} /></Grid>
                <Grid size={6}><Info label="Gender" value={user.gender} /></Grid>
                <Grid size={6}><Info label="Location" value={[user.city, user.states, user.country].filter(Boolean).join(', ')} /></Grid>
                <Grid size={6}><Info label="Time zone" value={user.timeZone} /></Grid>
                <Grid size={6}><Info label="Device" value={user.deviceType} /></Grid>
                <Grid size={6}><Info label="Profile set up" value={user.isCreatedProfile ? 'Yes' : 'Not finished'} /></Grid>
                <Grid size={6}><Info label="Joined" value={formatDate(user.createdAt, true)} /></Grid>
                <Grid size={6}><Info label="Last updated" value={formatDate(user.updatedAt, true)} /></Grid>
              </Grid>
            </Section>
            <Divider sx={{ mb: 3 }} />
            <Section title="Activity">
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {[
                  ['Posts', user.activity.posts],
                  ['Post comments', user.activity.postComments],
                  ['Blog comments', user.activity.blogComments],
                  ['Help requests', user.activity.helpRequests],
                  ['Help offers', user.activity.helpOffers],
                  ['Events', user.activity.events],
                ].map(([label, count]) => (
                  <Chip key={label} label={`${label}: ${count}`} variant="outlined" size="small" />
                ))}
              </Stack>
            </Section>
            <Section title="Interests">
              {user.interests.length ? (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {user.interests.map((i) => (
                    <Chip key={i.id} label={i.name} size="small" variant={i.status === 'APPROVED' ? 'filled' : 'outlined'} />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">None</Typography>
              )}
            </Section>
            <Section title="Preferences">
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {TOGGLES.map((t) => (
                  <Chip key={t.key} size="small" variant="outlined" label={`${t.label}: ${user[t.key] ? 'yes' : 'no'}`} />
                ))}
              </Stack>
            </Section>
            <Divider sx={{ mb: 3 }} />
            <Section title="Wallet & subscription">
              <Info label="Wallet balance" value={String(user.walletBalance)} />
              {user.subscriptions.length ? (
                user.subscriptions.map((s) => (
                  <Typography key={s.id} variant="body2" sx={{ mb: 0.5 }}>
                    {s.subscriptionPlan?.name || 'Plan'} · {formatDate(s.startDate)} – {formatDate(s.endDate)}
                    {s.isActive && !s.isCancelled ? ' · active' : s.isCancelled ? ' · cancelled' : ' · ended'}
                    {s.provider ? ` · ${s.provider}` : ''}
                  </Typography>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">No subscriptions</Typography>
              )}
            </Section>
            {user.deletionRequests.length > 0 && (
              <Section title="Account deletion requests">
                {user.deletionRequests.map((r) => (
                  <Typography key={r.id} variant="body2" sx={{ mb: 0.5 }}>
                    {r.status} · asked {formatDate(r.requestedAt)}
                    {r.reason ? ` · "${r.reason}"` : ''}
                  </Typography>
                ))}
              </Section>
            )}
          </>
        ) : tab === 'edit' ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Email is their login and can't be changed here. You'll be asked for a reason before anything is saved.
            </Alert>
            <Grid container spacing={2}>
              {TEXT_FIELDS.map((f) => (
                <Grid key={f.key} size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label={f.label}
                    value={form[f.key]}
                    inputProps={{ maxLength: f.max }}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                </Grid>
              ))}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Date of birth"
                  value={form.dateOfBirth}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ max: new Date().toISOString().slice(0, 10) }}
                  onChange={(e) => setForm((s) => ({ ...s, dateOfBirth: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Gender"
                  value={form.gender}
                  onChange={(e) => setForm((s) => ({ ...s, gender: e.target.value }))}
                >
                  <MenuItem value="">(not set)</MenuItem>
                  {[...new Set([...GENDERS, ...(initial.gender ? [initial.gender] : [])])].map((g) => (
                    <MenuItem key={g} value={g}>{g}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={12}>
                {TOGGLES.map((t) => (
                  <FormControlLabel
                    key={t.key}
                    sx={{ display: 'flex' }}
                    control={<Switch checked={form[t.key]} onChange={(e) => setForm((s) => ({ ...s, [t.key]: e.target.checked }))} />}
                    label={t.label}
                  />
                ))}
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button disabled={!changedKeys.length} onClick={() => setForm(initial)} sx={{ textTransform: 'none' }}>Undo changes</Button>
              <Button variant="contained" disabled={!changedKeys.length} onClick={() => setPending('save')} sx={{ textTransform: 'none', boxShadow: 'none' }}>
                Review & save{changedKeys.length ? ` (${changedKeys.length})` : ''}
              </Button>
            </Stack>
          </>
        ) : audit.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No admin changes yet.</Typography>
        ) : (
          audit.map((entry) => (
            <Box key={entry.id} sx={{ mb: 2, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Chip size="small" color={ACTION_COLOR[entry.action] || 'default'} variant="outlined" label={ACTION_LABEL[entry.action] || entry.action} />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(entry.createdAt, true)} · {entry.admin?.name || entry.admin?.email || entry.adminEmail || 'Removed admin'}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ mb: entry.changes ? 0.5 : 0 }}>"{entry.reason}"</Typography>
              {entry.changes &&
                Object.entries(entry.changes).map(([key, change]) => (
                  <Typography key={key} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {FIELD_LABEL[key] || key}: {showValue(key, change.from)} → {showValue(key, change.to)}
                  </Typography>
                ))}
            </Box>
          ))
        )}
      </Box>

      <ReasonDialog
        open={!!pending}
        busy={busy}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        {...(pending ? dialogs[pending] : {})}
      />
    </Drawer>
  );
};

export default UserDetailDrawer;
