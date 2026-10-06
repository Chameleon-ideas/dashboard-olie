'use client';
// Venue picker: search a place (Google Places), then fine-tune the pin on the map.
// Picking or moving the pin fills in the address fields and the venue's time zone.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import tzlookup from '@photostructure/tz-lookup';
import { Alert, Autocomplete, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
const DEFAULT_CENTER = { lat: 20, lng: 0 };

export const timeZoneAt = (lat, lng) => {
  try {
    return tzlookup(lat, lng);
  } catch {
    return null;
  }
};

// Address parts from Places (longText/types) or the Geocoder (long_name/types).
const fromComponents = (components = []) => {
  const get = (...types) => {
    for (const type of types) {
      const c = components.find((item) => item.types?.includes(type));
      if (c) return c.longText ?? c.long_name ?? '';
    }
    return '';
  };
  return {
    city: get('locality', 'postal_town', 'administrative_area_level_3', 'administrative_area_level_2', 'sublocality'),
    state: get('administrative_area_level_1'),
    country: get('country'),
  };
};

// Keeps the map centred on the pin when it is set from search.
const FollowPin = ({ pin }) => {
  const map = useMap();
  const last = useRef(null);
  useEffect(() => {
    if (!map || !pin) return;
    const key = `${pin.lat},${pin.lng}`;
    if (last.current === key) return;
    last.current = key;
    map.panTo(pin);
    if ((map.getZoom() || 0) < 15) map.setZoom(16);
  }, [map, pin]);
  return null;
};

const PlaceSearch = ({ onPick }) => {
  const places = useMapsLibrary('places');
  const [input, setInput] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const session = useRef(null);

  useEffect(() => {
    if (!places || input.trim().length < 3) {
      setOptions([]);
      return undefined;
    }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        session.current = session.current || new places.AutocompleteSessionToken();
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: session.current,
        });
        if (active) {
          setOptions(suggestions.map((s) => s.placePrediction).filter(Boolean));
          setError('');
        }
      } catch (e) {
        if (active) setError('Place search is unavailable. Check that Places API (New) is enabled for the key.');
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [places, input]);

  const pick = async (prediction) => {
    if (!prediction) return;
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents', 'types'] });
    session.current = null;
    const lat = place.location.lat();
    const lng = place.location.lng();
    const isAddress = (place.types || []).some((t) => ['street_address', 'premise', 'route', 'subpremise'].includes(t));
    onPick({
      venueName: isAddress ? '' : place.displayName || '',
      eventAddress: place.formattedAddress || '',
      placeId: place.id || '',
      lat,
      lng,
      ...fromComponents(place.addressComponents),
    });
  };

  return (
    <>
      <Autocomplete
        options={options}
        filterOptions={(x) => x}
        getOptionLabel={(o) => o?.text?.text || ''}
        isOptionEqualToValue={(a, b) => a.placeId === b.placeId}
        loading={loading}
        onInputChange={(_, value) => setInput(value)}
        onChange={(_, value) => pick(value)}
        noOptionsText={input.trim().length < 3 ? 'Type at least 3 letters' : 'No places found'}
        renderOption={(props, o) => (
          <Box component="li" {...props} key={o.placeId} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <PlaceIcon fontSize="small" sx={{ mt: 0.3, color: 'text.secondary' }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.mainText?.text || o.text?.text}</Typography>
              <Typography variant="caption" color="text.secondary">{o.secondaryText?.text}</Typography>
            </Box>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            label="Search venue or address"
            placeholder="e.g. Frere Hall, Karachi"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      {error && <Alert severity="warning" sx={{ mt: 1 }}>{error}</Alert>}
    </>
  );
};

const PinMap = ({ pin, onMove }) => {
  const geocoding = useMapsLibrary('geocoding');
  const geocoder = useMemo(() => (geocoding ? new geocoding.Geocoder() : null), [geocoding]);

  // Moving the pin by hand: look up the address there, but keep the venue name.
  const moveTo = async (lat, lng) => {
    let address = {};
    if (geocoder) {
      try {
        const { results } = await geocoder.geocode({ location: { lat, lng } });
        const best = results?.[0];
        if (best) {
          address = { eventAddress: best.formatted_address, placeId: best.place_id, ...fromComponents(best.address_components) };
        }
      } catch {
        // Geocoding API not enabled or no result: keep the typed address.
      }
    }
    onMove({ lat, lng, ...address });
  };

  return (
    <Box sx={{ height: 300, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
      <Map
        mapId={MAP_ID}
        defaultCenter={pin || DEFAULT_CENTER}
        defaultZoom={pin ? 16 : 2}
        gestureHandling="greedy"
        streetViewControl={false}
        mapTypeControl={false}
        onClick={(e) => e.detail.latLng && moveTo(e.detail.latLng.lat, e.detail.latLng.lng)}
      >
        {pin && (
          <AdvancedMarker
            position={pin}
            draggable
            onDragEnd={(e) => e.latLng && moveTo(e.latLng.lat(), e.latLng.lng())}
          />
        )}
        <FollowPin pin={pin} />
      </Map>
    </Box>
  );
};

/**
 * value: { lat, lng } or null. onChange receives the picked venue: lat/lng, timeZone
 * and whichever of venueName, eventAddress, city, state, country, placeId were found.
 */
const LocationPicker = ({ value, onChange }) => {
  const emit = (venue) => onChange({ ...venue, timeZone: timeZoneAt(venue.lat, venue.lng) });

  if (!MAPS_KEY) {
    return (
      <Alert severity="info">
        Map search is off: set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to pick the venue on a map. Until then,
        type the address below; the event will be matched by city.
      </Alert>
    );
  }

  return (
    <APIProvider apiKey={MAPS_KEY}>
      <Stack spacing={1.5}>
        <PlaceSearch onPick={emit} />
        <PinMap pin={value} onMove={emit} />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {value
              ? `Pin: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}. Drag it or click the map to adjust.`
              : 'Search for the venue, or click the map to drop a pin.'}
          </Typography>
          {value && (
            <Button size="small" color="inherit" onClick={() => onChange(null)} sx={{ textTransform: 'none' }}>
              Remove pin
            </Button>
          )}
        </Stack>
      </Stack>
    </APIProvider>
  );
};

export default LocationPicker;
