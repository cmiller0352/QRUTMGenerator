import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

const CityChart = ({ data }) => {
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Top Cities
      </Typography>
      <Box sx={{ width: '100%', height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="city" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#006633" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default CityChart;
