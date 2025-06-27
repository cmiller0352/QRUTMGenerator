// src/components/dashboard/DeviceTypeChart.js
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Paper, Typography } from '@mui/material';

const COLORS = ['#006633', '#F2AE00', '#003865'];

const DeviceTypeChart = ({ data }) => {
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Device Type Breakdown
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="device"
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default DeviceTypeChart;