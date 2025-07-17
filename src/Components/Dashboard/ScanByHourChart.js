import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

const normalizeHourlyData = (data) => {
  const hours = Array.from({ length: 25 }, (_, i) => i);
  const map = new Map(data.map(d => [parseInt(d.hour), d.count]));
  return hours.map(hour => ({
    hour,
    count: map.get(hour) || 0,
  }));
};

const hourTicks = [0, 6, 12, 18, 24]; // ✅ Manual ticks

const ScanByHourChart = ({ data }) => {
  const normalizedData = normalizeHourlyData(data);

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3, minHeight: 400 }}>
      <Typography variant="h6" gutterBottom>
        Scans by Hour (0–24)
      </Typography>
      <Box sx={{ width: '100%' }}>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={normalizedData}>
            <XAxis
              dataKey="hour"
              ticks={hourTicks}
              domain={[0, 24]}
              interval={0}
              allowDecimals={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#F2AE00" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default ScanByHourChart;
