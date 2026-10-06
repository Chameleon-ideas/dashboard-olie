// Event times are entered and shown in the venue's time zone, whatever the
// admin's own zone is. The API stores UTC and takes "YYYY-MM-DDTHH:mm" + zone.

export const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const allTimeZones = () => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC'];
  }
};

const partsIn = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
};

// UTC instant -> { date: "YYYY-MM-DD", time: "HH:mm" } at the venue.
export const toVenueInputs = (iso, timeZone) => {
  if (!iso) return { date: '', time: '' };
  const p = partsIn(new Date(iso), timeZone || 'UTC');
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
};

// "Pacific Daylight Time" style name of the zone on a given day.
export const zoneName = (timeZone, date = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'long' }).formatToParts(date);
    return parts.find((p) => p.type === 'timeZoneName')?.value || timeZone;
  } catch {
    return timeZone;
  }
};

const cityOfZone = (timeZone) => (timeZone || '').split('/').pop().replace(/_/g, ' ');

export const zoneLabel = (timeZone, date) => `${cityOfZone(timeZone)} (${zoneName(timeZone, date)})`;

// "Tue, Oct 20, 2026, 2:00 PM" at the venue.
export const formatAtVenue = (iso, timeZone, options = {}) => {
  if (!iso) return '-';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || undefined,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      ...options,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
};
