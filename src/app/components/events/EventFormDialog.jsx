'use client';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import LocationPicker, { timeZoneAt } from './LocationPicker';
import { allTimeZones, browserTimeZone, toVenueInputs, zoneLabel } from './eventTime';

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const emptyForm = () => ({
  eventName: '',
  eventDescription: '',
  isOnline: false,
  onlineLink: '',
  venueName: '',
  eventAddress: '',
  eventStates: '',
  eventCity: '',
  eventCountry: '',
  placeId: '',
  pin: null,
  timeZone: browserTimeZone(),
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  capacity: '',
  notifyAttendees: true,
});

// The form's values for an existing event, with times shown at the venue.
const formFromEvent = (event) => {
  const pin = event.eventLatitude != null && event.eventLongitude != null
    ? { lat: event.eventLatitude, lng: event.eventLongitude }
    : null;
  const timeZone = event.eventTimeZone || (pin && timeZoneAt(pin.lat, pin.lng)) || browserTimeZone();
  const start = toVenueInputs(event.eventDateAndTime, timeZone);
  const end = toVenueInputs(event.eventEndDateAndTime, timeZone);
  return {
    ...emptyForm(),
    eventName: event.eventName || '',
    eventDescription: event.eventDescription || '',
    isOnline: Boolean(event.isOnline),
    onlineLink: event.onlineLink || '',
    venueName: event.venueName || '',
    eventAddress: event.isOnline ? '' : event.eventAddress || '',
    eventStates: event.eventStates || '',
    eventCity: event.eventCity || '',
    eventCountry: event.eventCountry || '',
    placeId: event.placeId || '',
    pin,
    timeZone,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    capacity: event.capacity ? String(event.capacity) : '',
  };
};

const validate = (form, images) => {
  const errors = {};
  if (form.eventName.trim().length < 3) errors.eventName = 'At least 3 characters';
  if (form.eventDescription.trim().length < 10) errors.eventDescription = 'At least 10 characters';
  if (!form.startDate) errors.startDate = 'Required';
  if (!form.startTime) errors.startTime = 'Required';
  if (Boolean(form.endDate) !== Boolean(form.endTime)) errors.endTime = 'Set both end date and time, or neither';
  if (form.endDate && form.endTime && `${form.endDate}T${form.endTime}` <= `${form.startDate}T${form.startTime}`) {
    errors.endTime = 'Must be after the start';
  }
  if (form.isOnline) {
    if (!/^https?:\/\/\S+$/i.test(form.onlineLink.trim())) errors.onlineLink = 'A full link, starting with https://';
  } else {
    if (!form.eventAddress.trim()) errors.eventAddress = 'Required';
    if (!form.eventCity.trim()) errors.eventCity = 'Required';
    if (!form.eventCountry.trim()) errors.eventCountry = 'Required';
  }
  if (form.capacity && !(Number.isInteger(Number(form.capacity)) && Number(form.capacity) >= 1)) {
    errors.capacity = 'A whole number, 1 or more';
  }
  if (images.length === 0) errors.images = 'Add at least one photo';
  return errors;
};

const buildPayload = (form, images, isEdit) => {
  const data = new FormData();
  data.append('eventName', form.eventName.trim());
  data.append('eventDescription', form.eventDescription.trim());
  data.append('eventTimeZone', form.timeZone);
  data.append('eventStartLocal', `${form.startDate}T${form.startTime}`);
  data.append('eventEndLocal', form.endDate && form.endTime ? `${form.endDate}T${form.endTime}` : 'null');
  data.append('isOnline', String(form.isOnline));
  data.append('capacity', form.capacity ? String(Number(form.capacity)) : 'null');

  if (form.isOnline) {
    data.append('onlineLink', form.onlineLink.trim());
    data.append('eventCountry', form.eventCountry.trim());
  } else {
    data.append('venueName', form.venueName.trim() || 'null');
    data.append('placeId', form.placeId || 'null');
    data.append('eventAddress', form.eventAddress.trim());
    data.append('eventStates', form.eventStates.trim());
    data.append('eventCity', form.eventCity.trim());
    data.append('eventCountry', form.eventCountry.trim());
    data.append('eventLatitude', form.pin ? String(form.pin.lat) : 'null');
    data.append('eventLongitude', form.pin ? String(form.pin.lng) : 'null');
  }

  if (isEdit) {
    data.append('keepImages', JSON.stringify(images.filter((img) => !img.file).map((img) => img.url)));
    data.append('notifyAttendees', String(form.notifyAttendees));
  }
  images.filter((img) => img.file).forEach((img) => data.append('image', img.file));
  return data;
};

const Section = ({ title, hint, children }) => (
  <Box>
    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
    {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    <Box sx={{ mt: 1.5 }}>{children}</Box>
  </Box>
);

/**
 * Add or edit an event. event: the event being edited, or null to add one.
 * onSave(formData) returns a promise; errors are shown in the dialog.
 */
const EventFormDialog = ({ open, event, onClose, onSave }) => {
  const isEdit = Boolean(event);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [zones] = useState(allTimeZones);

  useEffect(() => {
    if (!open) return;
    setForm(event ? formFromEvent(event) : emptyForm());
    setImages((event?.imageGallery || []).map((img) => ({ url: img.url })));
    setErrors({});
    setSaveError('');
  }, [open, event]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const onVenue = (venue) => {
    if (!venue) return set({ pin: null, placeId: '' });
    set({
      pin: { lat: venue.lat, lng: venue.lng },
      ...(venue.timeZone ? { timeZone: venue.timeZone } : {}),
      ...(venue.venueName !== undefined ? { venueName: venue.venueName } : {}),
      ...(venue.eventAddress ? { eventAddress: venue.eventAddress } : {}),
      ...(venue.placeId ? { placeId: venue.placeId } : {}),
      ...(venue.city ? { eventCity: venue.city } : {}),
      ...(venue.state !== undefined ? { eventStates: venue.state } : {}),
      ...(venue.country ? { eventCountry: venue.country } : {}),
    });
  };

  const addImages = (files) => {
    const accepted = [];
    for (const file of Array.from(files || [])) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_IMAGE_BYTES) {
        setErrors((e) => ({ ...e, images: `${file.name} is over 5 MB` }));
        continue;
      }
      accepted.push({ url: URL.createObjectURL(file), file });
    }
    setImages((prev) => [...prev, ...accepted].slice(0, MAX_IMAGES));
  };

  const removeImage = (index) =>
    setImages((prev) => {
      const img = prev[index];
      if (img.file) URL.revokeObjectURL(img.url);
      return prev.filter((_, i) => i !== index);
    });

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form, images);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      setSaving(true);
      setSaveError('');
      await onSave(buildPayload(form, images, isEdit));
    } catch (error) {
      setSaveError(error?.response?.data?.message || 'Could not save the event.');
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props = {}) => (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={form[name]}
      onChange={(e) => set({ [name]: e.target.value })}
      error={Boolean(errors[name])}
      helperText={errors[name] || ' '}
      {...props}
    />
  );

  const startForLabel = form.startDate ? new Date(`${form.startDate}T12:00:00Z`) : new Date();

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>
          {isEdit ? 'Edit event' : 'Add event'}
          <IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 12, top: 12 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>
            <Section title="About the event">
              {field('eventName', 'Event name', { autoFocus: !isEdit })}
              {field('eventDescription', 'Description', { multiline: true, minRows: 4 })}
            </Section>

            <Section title="Photos" hint={`The first photo is the cover. Up to ${MAX_IMAGES}, 5 MB each.`}>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1.5 }}>
                {images.map((img, index) => (
                  <Box key={img.url} sx={{ position: 'relative', width: 112, height: 80 }}>
                    <Box
                      component="img"
                      src={img.url}
                      alt=""
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}
                    />
                    {index === 0 && (
                      <Typography
                        variant="caption"
                        sx={{ position: 'absolute', left: 4, bottom: 4, px: 0.75, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                      >
                        Cover
                      </Typography>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => removeImage(index)}
                      sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
                {images.length < MAX_IMAGES && (
                  <Button
                    component="label"
                    variant="outlined"
                    sx={{ width: 112, height: 80, flexDirection: 'column', textTransform: 'none', borderStyle: 'dashed' }}
                  >
                    <AddPhotoAlternateIcon />
                    <Typography variant="caption">Add photos</Typography>
                    <input hidden multiple type="file" accept="image/*" onChange={(e) => { addImages(e.target.files); e.target.value = ''; }} />
                  </Button>
                )}
              </Stack>
              {errors.images && <Typography variant="caption" color="error">{errors.images}</Typography>}
            </Section>

            <Divider />

            <Section title="Where">
              <ToggleButtonGroup
                exclusive
                size="small"
                value={form.isOnline ? 'online' : 'venue'}
                onChange={(_, v) => v && set({ isOnline: v === 'online' })}
                sx={{ mb: 2 }}
              >
                <ToggleButton value="venue" sx={{ textTransform: 'none', px: 2 }}>
                  <PlaceIcon fontSize="small" sx={{ mr: 1 }} /> In person
                </ToggleButton>
                <ToggleButton value="online" sx={{ textTransform: 'none', px: 2 }}>
                  <VideocamIcon fontSize="small" sx={{ mr: 1 }} /> Online
                </ToggleButton>
              </ToggleButtonGroup>

              {form.isOnline ? (
                <>
                  {field('onlineLink', 'Join link (Zoom, Meet, …)', { placeholder: 'https://' })}
                  {field('eventCountry', 'Only for one country (optional)', {
                    helperText: errors.eventCountry || 'Leave empty to show it to everyone',
                  })}
                  <Typography variant="caption" color="text.secondary">
                    Only people marked Going see the link.
                  </Typography>
                </>
              ) : (
                <Stack spacing={1}>
                  <LocationPicker value={form.pin} onChange={onVenue} />
                  {!form.pin && (
                    <Alert severity="warning" sx={{ py: 0 }}>
                      Without a pin the event only shows to people searching the same city, and not on the map.
                    </Alert>
                  )}
                  <Box sx={{ pt: 1 }}>
                    {field('venueName', 'Venue name (optional)')}
                    {field('eventAddress', 'Address')}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      {field('eventCity', 'City')}
                      {field('eventStates', 'State / region')}
                      {field('eventCountry', 'Country')}
                    </Stack>
                  </Box>
                </Stack>
              )}
            </Section>

            <Divider />

            <Section title="When" hint={`Times are at the event: ${zoneLabel(form.timeZone, startForLabel)}.`}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {field('startDate', 'Start date', { type: 'date', InputLabelProps: { shrink: true } })}
                {field('startTime', 'Start time', { type: 'time', InputLabelProps: { shrink: true } })}
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {field('endDate', 'End date (optional)', { type: 'date', InputLabelProps: { shrink: true } })}
                {field('endTime', 'End time (optional)', { type: 'time', InputLabelProps: { shrink: true } })}
              </Stack>
              <Autocomplete
                size="small"
                options={zones}
                value={form.timeZone}
                disableClearable
                onChange={(_, value) => value && set({ timeZone: value })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Time zone"
                    helperText={form.isOnline ? 'The zone the times above are in' : 'Set from the venue pin; change it only if that is wrong'}
                  />
                )}
              />
            </Section>

            <Section title="Capacity" hint="Optional. When full, people can still mark Interested.">
              {field('capacity', 'Maximum people going', { type: 'number', inputProps: { min: 1 }, sx: { maxWidth: 260 } })}
            </Section>

            {isEdit && (
              <FormControlLabel
                control={<Checkbox checked={form.notifyAttendees} onChange={(e) => set({ notifyAttendees: e.target.checked })} />}
                label="Tell attendees if the time or place changes"
              />
            )}

            {saveError && <Alert severity="error">{saveError}</Alert>}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={saving} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving} sx={{ textTransform: 'none', boxShadow: 'none', minWidth: 140 }}>
            {saving ? <CircularProgress size={20} color="inherit" /> : isEdit ? 'Save changes' : 'Add event'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EventFormDialog;
