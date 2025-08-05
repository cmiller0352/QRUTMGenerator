// src/Components/Dashboard/TopCampaignsChart.js
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Paper, Typography } from '@mui/material';

const truncate = (s, n = 18) => (s ? (s.length > n ? s.slice(0, n) + '…' : s) : '(unknown)');

const TopCampaignsChart = ({ data = [] }) => {
  const rows = (Array.isArray(data) ? data : []).map(d => ({
    utm_campaign: d?.utm_campaign || '(unknown)',
    count: Number(d?.count) || 0,
  }));

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3, minHeight: 400 }}>
      <Typography variant="h6" gutterBottom>
        Top Campaigns
      </Typography>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={rows}
          margin={{ top: 10, right: 20, left: 10, bottom: 70 }} // room for rotated ticks
        >
          <XAxis
            dataKey="utm_campaign"
            interval={0}               // show every label
            angle={-35}               // tilt to fit
            textAnchor="end"
            height={70}
            tickFormatter={(v) => truncate(v, 18)}
          />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value) => [value, 'Count']}
            labelFormatter={(label) => `Campaign: ${label || '(unknown)'}`}
          />
          <Bar dataKey="count" fill="#003865" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default TopCampaignsChart;
