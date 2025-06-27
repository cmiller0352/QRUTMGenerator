// src/components/dashboard/ScanByDayChart.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Paper, Typography } from '@mui/material';

const ScanByDayChart = ({ data }) => {
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Scans by Day (Last 28 Days)
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#006633" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default ScanByDayChart;