import React from 'react';
import { Chip } from '@mui/material';

const STYLES = {
  UPCOMING: { label: 'Upcoming', color: 'primary' },
  LIVE: { label: 'Happening now', color: 'success' },
  PAST: { label: 'Past', color: 'default' },
  CANCELLED: { label: 'Cancelled', color: 'error' },
};

const EventStatusChip = ({ status }) => {
  const style = STYLES[status] || STYLES.UPCOMING;
  return <Chip size="small" label={style.label} color={style.color} variant={status === 'PAST' ? 'outlined' : 'filled'} />;
};

export default EventStatusChip;
