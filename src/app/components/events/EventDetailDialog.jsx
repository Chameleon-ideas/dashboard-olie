'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
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
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  cancelEvent,
  deleteEvent,
  errorMessage,
  fetchAnnouncements,
  fetchAttendees,
  sendAnnouncement,
} from './eventApi';
import { formatAtVenue, zoneLabel } from './eventTime';
import EventStatusChip from './EventStatusChip';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

const AUDIENCES = [
  { value: 'ALL', label: 'Everyone (Going + Interested)' },
  { value: 'GOING', label: 'Only Going' },
  { value: 'INTERESTED', label: 'Only Interested' },
];

const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unnamed';

const csvCell = (value) => {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadCsv = (event, rows) => {
  const header = ['Name', 'Email', 'Phone', 'Status', 'Hidden from app list', 'Marked at', 'City', 'Country'];
  const lines = rows.map((row) =>
    [fullName(row.user), row.user.email, row.user.phoneNumber, row.status, row.hideFromList ? 'Yes' : 'No',
      new Date(row.markedAt).toISOString(), row.user.city, row.user.country].map(csvCell).join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.eventName.replace(/[^\w-]+/g, '_')}_attendees.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const Fact = ({ label, children }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{children}</Typography>
  </Box>
);

const Overview = ({ event }) => {
  const pin = event.hasPin ? { lat: event.eventLatitude, lng: event.eventLongitude } : null;
  const zone = event.eventTimeZone;
  return (
    <Stack spacing={2}>
      {event.cancelledAt && (
        <Alert severity="error">
          Cancelled {formatAtVenue(event.cancelledAt, zone)}{event.cancelReason ? `: ${event.cancelReason}` : ''}
        </Alert>
      )}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Stack spacing={1.5} sx={{ flex: 1 }}>
          <Fact label="Starts">{formatAtVenue(event.eventDateAndTime, zone)}</Fact>
          <Fact label="Ends">
            {event.eventEndDateAndTime ? formatAtVenue(event.eventEndDateAndTime, zone) : 'Not set (treated as 3 hours)'}
          </Fact>
          <Fact label="Time zone">{zone ? zoneLabel(zone, new Date(event.eventDateAndTime)) : 'Not set (older event)'}</Fact>
          {event.isOnline ? (
            <>
              <Fact label="Where">Online{event.eventCountry ? ` (shown in ${event.eventCountry})` : ' (shown everywhere)'}</Fact>
              <Fact label="Join link">{event.onlineLink || '-'}</Fact>
            </>
          ) : (
            <Fact label="Where">
              {[event.venueName, event.eventAddress, [event.eventCity, event.eventStates, event.eventCountry].filter(Boolean).join(', ')]
                .filter(Boolean)
                .join('\n')}
            </Fact>
          )}
          <Fact label="Attendance">
            {event.counts.going} going · {event.counts.interested} interested
            {event.capacity ? ` · ${event.spotsLeft} of ${event.capacity} spots left` : ''}
          </Fact>
        </Stack>
        {!event.isOnline && (
          <Box sx={{ flex: 1, minHeight: 220, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            {pin && MAPS_KEY ? (
              <APIProvider apiKey={MAPS_KEY}>
                <Map mapId={MAP_ID} defaultCenter={pin} defaultZoom={15} gestureHandling="cooperative" disableDefaultUI style={{ height: 240 }}>
                  <AdvancedMarker position={pin} />
                </Map>
              </APIProvider>
            ) : (
              <Stack sx={{ height: 240 }} alignItems="center" justifyContent="center">
                <Typography variant="body2" color="text.secondary">
                  {pin ? 'Map needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY' : 'No map pin. Edit the event to add one.'}
                </Typography>
              </Stack>
            )}
          </Box>
        )}
      </Stack>
      <Fact label="Description">{event.eventDescription}</Fact>
    </Stack>
  );
};

const Attendees = ({ event, token }) => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  useEffect(() => {
    fetchAttendees(token, event.id)
      .then((data) => setRows(data.attendees))
      .catch((e) => setError(errorMessage(e, 'Could not load attendees')));
  }, [token, event.id]);

  const shown = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (rows || []).filter(
      (row) =>
        (status === 'ALL' || row.status === status) &&
        (!keyword || [fullName(row.user), row.user.email, row.user.phoneNumber].some((v) => v?.toLowerCase().includes(keyword)))
    );
  }, [rows, search, status]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!rows) return <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={28} /></Stack>;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          size="small"
          placeholder="Search name, email or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <TextField select size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="ALL">All ({rows.length})</MenuItem>
          <MenuItem value="GOING">Going ({rows.filter((r) => r.status === 'GOING').length})</MenuItem>
          <MenuItem value="INTERESTED">Interested ({rows.filter((r) => r.status === 'INTERESTED').length})</MenuItem>
        </TextField>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          disabled={shown.length === 0}
          onClick={() => downloadCsv(event, shown)}
          sx={{ textTransform: 'none' }}
        >
          Export CSV
        </Button>
      </Stack>

      <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: 420 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Person</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Since</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((row) => (
              <TableRow key={row.user.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar src={row.user.image || undefined} sx={{ width: 32, height: 32 }}>{row.user.firstName?.[0]}</Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{fullName(row.user)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[row.user.city, row.user.country].filter(Boolean).join(', ')}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{row.user.email}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.user.phoneNumber || ''}</Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Chip size="small" label={row.status === 'GOING' ? 'Going' : 'Interested'} color={row.status === 'GOING' ? 'success' : 'default'} />
                    {row.hideFromList && (
                      <Chip size="small" variant="outlined" icon={<VisibilityOffIcon />} label="Hidden in app" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{new Date(row.markedAt).toLocaleString()}</Typography>
                </TableCell>
              </TableRow>
            ))}
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {rows.length === 0 ? 'Nobody has signed up yet.' : 'No one matches.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

const Messages = ({ event, token, onSent }) => {
  const [history, setHistory] = useState(null);
  const [draft, setDraft] = useState({ title: '', body: '', audience: 'ALL' });
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetchAnnouncements(token, event.id).then(setHistory).catch((e) => setError(errorMessage(e, 'Could not load messages')));
  }, [token, event.id]);
  useEffect(load, [load]);

  const recipients =
    draft.audience === 'GOING' ? event.counts.going : draft.audience === 'INTERESTED' ? event.counts.interested : event.counts.going + event.counts.interested;

  const send = async () => {
    setConfirming(false);
    try {
      setSending(true);
      setError('');
      const result = await sendAnnouncement(token, event.id, { title: draft.title.trim(), body: draft.body.trim(), audience: draft.audience });
      setDraft({ title: '', body: '', audience: draft.audience });
      onSent(`Message sent to ${result?.notified?.recipients ?? 0} people.`);
      load();
    } catch (e) {
      setError(errorMessage(e, 'Could not send the message'));
    } finally {
      setSending(false);
    }
  };

  const ready = draft.title.trim() && draft.body.trim();

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Messages are sent as a push notification and shown on the event page in the app under &quot;Updates from the organiser&quot;.
      </Typography>
      <TextField size="small" label="Title" value={draft.title} inputProps={{ maxLength: 120 }} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      <TextField size="small" label="Message" multiline minRows={3} value={draft.body} inputProps={{ maxLength: 2000 }} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <TextField select size="small" label="Send to" value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })} sx={{ minWidth: 260 }}>
          {AUDIENCES.map((a) => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
        </TextField>
        <Button
          variant="contained"
          startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          disabled={!ready || sending || recipients === 0}
          onClick={() => setConfirming(true)}
          sx={{ textTransform: 'none', boxShadow: 'none' }}
        >
          Send to {recipients} {recipients === 1 ? 'person' : 'people'}
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}

      <Typography variant="subtitle2" sx={{ pt: 1 }}>Sent</Typography>
      {!history ? (
        <CircularProgress size={24} />
      ) : history.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No messages yet.</Typography>
      ) : (
        <Stack spacing={1}>
          {history.map((m) => (
            <Box key={m.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{m.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(m.createdAt).toLocaleString()} · {AUDIENCES.find((a) => a.value === m.audience)?.label}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{m.body}</Typography>
            </Box>
          ))}
        </Stack>
      )}

      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Send this message?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {recipients} {recipients === 1 ? 'person' : 'people'} will get a push notification now. This can&apos;t be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button onClick={send} variant="contained">Send</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

/** Event details for the admin: overview, attendees, messages, cancel and delete. */
const EventDetailDialog = ({ event, token, onClose, onEdit, onChanged, onFeedback }) => {
  const [tab, setTab] = useState('overview');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (event) setTab('overview');
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!event) return null;
  const attendeeCount = event.counts.going + event.counts.interested;

  const doCancel = async () => {
    try {
      setBusy(true);
      const result = await cancelEvent(token, event.id, cancelReason.trim());
      setCancelOpen(false);
      setCancelReason('');
      onFeedback(`Event cancelled. ${result?.notified?.recipients ?? 0} attendees notified.`, true);
      onChanged();
    } catch (e) {
      onFeedback(errorMessage(e, 'Could not cancel the event'), false);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    try {
      setBusy(true);
      await deleteEvent(token, event.id);
      setDeleteOpen(false);
      onFeedback('Event deleted.', true);
      onChanged();
      onClose();
    } catch (e) {
      onFeedback(errorMessage(e, 'Could not delete the event'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {event.image && <Box component="img" src={event.image} alt="" sx={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 1 }} />}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{event.eventName}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <EventStatusChip status={event.status} />
              {event.isOnline && <Chip size="small" label="Online" />}
            </Stack>
          </Box>
        </Stack>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="overview" label="Overview" sx={{ textTransform: 'none' }} />
        <Tab value="attendees" label={`Attendees (${attendeeCount})`} sx={{ textTransform: 'none' }} />
        <Tab value="messages" label="Messages" sx={{ textTransform: 'none' }} />
      </Tabs>
      <DialogContent sx={{ minHeight: 360 }}>
        {tab === 'overview' && <Overview event={event} />}
        {tab === 'attendees' && <Attendees event={event} token={token} />}
        {tab === 'messages' && <Messages event={event} token={token} onSent={(msg) => onFeedback(msg, true)} />}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1}>
          {!event.cancelledAt && event.status !== 'PAST' && (
            <Button color="warning" onClick={() => setCancelOpen(true)} sx={{ textTransform: 'none' }}>
              Cancel event
            </Button>
          )}
          <Button color="error" onClick={() => setDeleteOpen(true)} sx={{ textTransform: 'none' }}>
            Delete
          </Button>
        </Stack>
        {!event.cancelledAt && (
          <Button variant="contained" onClick={() => onEdit(event)} sx={{ textTransform: 'none', boxShadow: 'none' }}>
            Edit event
          </Button>
        )}
      </DialogActions>

      <Dialog open={cancelOpen} onClose={() => !busy && setCancelOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Cancel this event?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            It stays in the app marked &quot;Cancelled&quot;, and the {attendeeCount} people attending get a push notification.
          </DialogContentText>
          <TextField fullWidth multiline minRows={2} size="small" label="Reason (optional, shown to attendees)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={busy}>Keep event</Button>
          <Button onClick={doCancel} color="warning" variant="contained" disabled={busy}>Cancel event</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => !busy && setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Delete this event?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {attendeeCount > 0
              ? `${attendeeCount} people are attending. Deleting removes the event and their sign-ups without telling them. Cancelling is usually better.`
              : 'The event will be removed from the app. This cannot be undone.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={busy}>Keep event</Button>
          <Button onClick={doDelete} color="error" variant="contained" disabled={busy}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default EventDetailDialog;
