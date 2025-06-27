// src/components/dashboard/ScanByHourChart.js
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Paper, Typography } from '@mui/material';

const ScanByHourChart = ({ data }) => {
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Scans by Hour
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="hour" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#F2AE00" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default ScanByHourChart;
