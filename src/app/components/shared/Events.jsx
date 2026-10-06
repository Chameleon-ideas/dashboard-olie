'use client';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import { CustomizerContext } from '@/app/context/customizerContext';
import { errorMessage, fetchEvents, saveEvent } from '@/app/components/events/eventApi';
import { formatAtVenue } from '@/app/components/events/eventTime';
import EventFormDialog from '@/app/components/events/EventFormDialog';
import EventDetailDialog from '@/app/components/events/EventDetailDialog';
import EventStatusChip from '@/app/components/events/EventStatusChip';

const STATUS_FILTERS = [
  { value: 'ACTIVE', label: 'Upcoming & live' },
  { value: 'ALL', label: 'All events' },
  { value: 'PAST', label: 'Past' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_PIN', label: 'Missing map pin' },
];

const matchesStatus = (event, filter) => {
  switch (filter) {
    case 'ACTIVE':
      return event.status === 'UPCOMING' || event.status === 'LIVE';
    case 'PAST':
    case 'CANCELLED':
      return event.status === filter;
    case 'NO_PIN':
      return !event.isOnline && !event.hasPin && event.status !== 'PAST';
    default:
      return true;
  }
};

const whereLabel = (event) =>
  event.isOnline ? 'Online' : [event.venueName, event.eventCity, event.eventCountry].filter(Boolean).join(', ') || event.eventAddress;

const Events = () => {
  const [events, setEvents] = useState([]);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [feedback, setFeedback] = useState({ message: '', success: true, open: false });

  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === 'dark';

  const notify = (message, success = true) => setFeedback({ message, success, open: true });

  useEffect(() => {
    try {
      const storedUser = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('user') || 'null') : null;
      setToken(storedUser?.data?.adminToken || '');
    } catch (error) {
      console.error('Session parse error:', error);
    }
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setEvents(await fetchEvents(token));
    } catch (error) {
      notify(errorMessage(error, 'Failed to fetch events'), false);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return events
      .filter((event) => matchesStatus(event, statusFilter))
      .filter(
        (event) =>
          !keyword ||
          [event.eventName, event.venueName, event.eventCity, event.eventCountry, event.eventStates, event.eventAddress].some((v) =>
            v?.toLowerCase().includes(keyword)
          )
      )
      .sort((a, b) =>
        statusFilter === 'ACTIVE' || statusFilter === 'NO_PIN'
          ? new Date(a.eventDateAndTime) - new Date(b.eventDateAndTime)
          : new Date(b.eventDateAndTime) - new Date(a.eventDateAndTime)
      );
  }, [events, searchTerm, statusFilter]);

  const missingPins = events.filter((e) => matchesStatus(e, 'NO_PIN')).length;
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const detailEvent = events.find((e) => e.id === detailId) || null;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (event) => {
    setEditing(event);
    setFormOpen(true);
  };

  const handleSave = async (formData) => {
    const saved = await saveEvent(token, editing?.id, formData);
    setFormOpen(false);
    const notified = saved?.notified?.recipients;
    notify(
      editing
        ? `Event updated${notified ? `; ${notified} attendees notified` : ''}.`
        : 'Event created.'
    );
    load();
  };

  const border = isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1250, mx: 'auto' }}>
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
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Events & Activities</Typography>
            <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#6b7280' }}>
              Venues on the map, who&apos;s coming, and messages to attendees.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ textTransform: 'none', borderRadius: 2, px: 2, py: 1, boxShadow: 'none' }}>
            Add event
          </Button>
        </Stack>

        {missingPins > 0 && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={statusFilter !== 'NO_PIN' && (
              <Button color="inherit" size="small" onClick={() => { setStatusFilter('NO_PIN'); setPage(0); }}>Show them</Button>
            )}
          >
            {missingPins} upcoming {missingPins === 1 ? 'event has' : 'events have'} no map pin, so {missingPins === 1 ? 'it only shows' : 'they only show'} to people searching the same city.
          </Alert>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, venue, city or country"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20 }} /></InputAdornment> }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: isDark ? '#25253a' : '#fafafa' } }}
          />
          <TextField select size="small" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} sx={{ minWidth: 200 }}>
            {STATUS_FILTERS.map((f) => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
          </TextField>
        </Stack>

        <TableContainer sx={{ border: '1px solid', borderColor: border, borderRadius: 2, overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: isDark ? '#25253a' : '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>When (at the event)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Where</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Attendance</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress size={28} /></TableCell>
                </TableRow>
              ) : paginated.length > 0 ? (
                paginated.map((event) => (
                  <TableRow key={event.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetailId(event.id)}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {event.image ? (
                          <Box component="img" src={event.image} alt="" sx={{ width: 64, height: 44, objectFit: 'cover', borderRadius: 1.5, border: '1px solid', borderColor: border, flexShrink: 0 }} />
                        ) : (
                          <Box sx={{ width: 64, height: 44, borderRadius: 1.5, bgcolor: 'action.hover', flexShrink: 0 }} />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{event.eventName}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatAtVenue(event.eventDateAndTime, event.eventTimeZone)}</Typography>
                      {!event.eventTimeZone && (
                        <Typography variant="caption" color="text.secondary">In your time zone (no venue zone set)</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {event.isOnline && <VideocamIcon fontSize="small" color="action" />}
                        <Typography variant="body2">{whereLabel(event)}</Typography>
                        {!event.isOnline && !event.hasPin && (
                          <Tooltip title="No map pin: only shown to people searching this city">
                            <Chip size="small" color="warning" variant="outlined" icon={<LocationOffIcon />} label="No pin" />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        <strong>{event.counts.going}</strong> going · {event.counts.interested} interested
                      </Typography>
                      {event.capacity != null && (
                        <Typography variant="caption" color={event.spotsLeft === 0 ? 'error' : 'text.secondary'}>
                          {event.spotsLeft === 0 ? 'Full' : `${event.spotsLeft} of ${event.capacity} spots left`}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell><EventStatusChip status={event.status} /></TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" color="primary" onClick={() => setDetailId(event.id)}><VisibilityIcon fontSize="small" /></IconButton>
                      {!event.cancelledAt && (
                        <IconButton size="small" color="secondary" onClick={() => openEdit(event)}><EditIcon fontSize="small" /></IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <Typography variant="body2" sx={{ color: isDark ? '#cbd5e1' : '#6b7280' }}>No events found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 20, 50]}
            sx={{ borderTop: '1px solid', borderColor: border }}
          />
        </TableContainer>
      </Paper>

      <EventFormDialog open={formOpen} event={editing} onClose={() => setFormOpen(false)} onSave={handleSave} />

      <EventDetailDialog
        event={detailEvent}
        token={token}
        onClose={() => setDetailId(null)}
        onEdit={(event) => { setDetailId(null); openEdit(event); }}
        onChanged={load}
        onFeedback={notify}
      />

      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={() => setFeedback((f) => ({ ...f, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setFeedback((f) => ({ ...f, open: false }))} severity={feedback.success ? 'success' : 'error'} variant="filled">
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Events;
