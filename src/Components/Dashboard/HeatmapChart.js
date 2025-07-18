import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat'; // attaches itself to L.heatLayer
import { Paper, Typography, Box } from '@mui/material';

const HeatmapLayer = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points.length || !window.L) return;

    const heatLayer = window.L.heatLayer(points, {
      radius: 20,
      blur: 25,
      maxZoom: 12,
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [points, map]);

  return null;
};

const HeatmapChart = ({ data }) => {
  const points =
    data?.filter(pt => pt.latitude && pt.longitude).map(pt => [
      parseFloat(pt.latitude),
      parseFloat(pt.longitude),
      pt.count ? Math.min(pt.count / 5, 1.0) : 0.8,
    ]) || [];

  const defaultCenter = [39.8283, -98.5795];

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Scan Heatmap
      </Typography>

      {points.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
          No valid location data available yet.
        </Box>
      ) : (
        <Box sx={{ width: '100%', height: 400 }}>
          <MapContainer
            center={[41.8781, -87.6298]}
            zoom={9}
            minzoom={4}
            scrollWheelZoom={false}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='© OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HeatmapLayer points={points} />
          </MapContainer>
        </Box>
      )}
    </Paper>
  );
};

export default HeatmapChart;
