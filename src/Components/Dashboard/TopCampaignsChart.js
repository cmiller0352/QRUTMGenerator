// src/components/dashboard/TopCampaignsChart.js
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Paper, Typography } from '@mui/material';

const TopCampaignsChart = ({ data }) => {
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3, minHeight: 400 }}>
      <Typography variant="h6" gutterBottom>
        Top Campaigns
      </Typography>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <XAxis dataKey="utm_campaign" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#003865" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default TopCampaignsChart;
