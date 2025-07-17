import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

const ScanByDayChart = ({ data }) => {
  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3, minHeight: 400 }}>
      <Typography variant="h6" gutterBottom>
        Scans by Day (Rolling 12 Months)
      </Typography>
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <Box sx={{ minWidth: data.length * 20 }}>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#006633" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Paper>
  );
};

export default ScanByDayChart;
