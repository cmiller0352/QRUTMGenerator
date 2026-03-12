import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value) || 0);

const hasCoordinates = (row) => Number.isFinite(Number(row?.latitude)) && Number.isFinite(Number(row?.longitude));
const DEFAULT_CENTER = [39.8283, -98.5795];
const US_BOUNDS = {
  minLat: 24.396308,
  maxLat: 49.384358,
  minLng: -125.0,
  maxLng: -66.93457,
};
const US_COUNTRY_LABELS = new Set([
  'us',
  'usa',
  'u.s.',
  'u.s.a.',
  'united states',
  'united states of america',
]);

const isWithinUsBounds = (row) => {
  const lat = Number(row?.latitude);
  const lng = Number(row?.longitude);
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= US_BOUNDS.minLat &&
    lat <= US_BOUNDS.maxLat &&
    lng >= US_BOUNDS.minLng &&
    lng <= US_BOUNDS.maxLng;
};

const isUsLocation = (row) => {
  const country = String(row?.country || '').trim().toLowerCase();
  if (country) return US_COUNTRY_LABELS.has(country);
  return isWithinUsBounds(row);
};

const aggregateLocations = (rows) => {
  const map = new Map();

  for (const row of rows) {
    const label = [row.city, row.region, row.country].filter(Boolean).join(', ') || row.label || 'Unknown';
    const key = label.toLowerCase();
    const nextCount = Number(row.count) || 1;
    const current = map.get(key);

    if (current) {
      current.count += nextCount;
    } else {
      map.set(key, { label, count: nextCount });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
};

const HeatmapLayer = ({ points }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!points.length || !window.L) return undefined;

    const weights = points.map((point) => point[2]);
    const maxWeight = Math.max(...weights, 0.25);
    const heatLayer = window.L.heatLayer(points, {
      radius: 28,
      blur: 32,
      maxZoom: 12,
      max: maxWeight,
      minOpacity: 0.45,
      gradient: {
        0.15: '#86efac',
        0.35: '#facc15',
        0.55: '#fb923c',
        0.8: '#ef4444',
        1: '#991b1b',
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
};

const InsightsHeatmapCard = ({ data }) => {
  const usRows = data.filter(isUsLocation);
  const mappableRows = usRows.filter(hasCoordinates).filter(isWithinUsBounds);
  const groupedLocations = aggregateLocations(usRows);
  const maxCount = Math.max(...mappableRows.map((row) => Number(row.count) || 1), 1);
  const points = mappableRows.map((location) => ([
    Number(location.latitude),
    Number(location.longitude),
    Math.max(((Number(location.count) || 1) / maxCount), 0.28),
  ]));

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h6">Location Signal</Typography>
          <Typography variant="body2" color="text.secondary">
            Secondary geographic view based on locations with valid coordinates.
          </Typography>
        </Stack>
        <Box sx={{ width: '100%', height: 420, borderRadius: 2, overflow: 'hidden' }}>
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={4}
            scrollWheelZoom={false}
            maxBounds={[
              [US_BOUNDS.minLat, US_BOUNDS.minLng],
              [US_BOUNDS.maxLat, US_BOUNDS.maxLng],
            ]}
            maxBoundsViscosity={0.6}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution="© OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HeatmapLayer points={points} />
          </MapContainer>
        </Box>
        <List disablePadding>
          {groupedLocations.slice(0, 5).map((location, index) => {
            return (
              <ListItem
                key={`${location.label}-${index}`}
                disableGutters
                divider={index < Math.min(groupedLocations.length, 5) - 1}
                sx={{
                  px: 1,
                  borderRadius: 1.5,
                  transition: 'background-color 120ms ease',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 102, 51, 0.05)',
                  },
                }}
              >
                <Tooltip title={`${formatNumber(location.count)} scans`} placement="top" arrow>
                  <ListItemText
                    primary={location.label}
                    secondary={`${formatNumber(location.count)} scans`}
                  />
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Stack>
    </Paper>
  );
};

export default InsightsHeatmapCard;
