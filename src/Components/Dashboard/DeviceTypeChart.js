import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import { Paper, Typography, Grid, Box } from '@mui/material';

const COLORS = ['#006633', '#F2AE00', '#003865'];

const DeviceTypeChart = ({ data }) => {
  const pieData = data || [];
  const barData =
    data?.map((item) => ({
      device: item.device,
      count: item.count,
    })) || [];

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Device Type Breakdown
      </Typography>

      <Grid container spacing={2} alignItems="center">
        {/* Pie Chart */}
        <Grid item xs={12} md={6}>
          <Box display="flex" justifyContent="center">
            <ResponsiveContainer width={300} height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="device"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Grid>

        {/* Bar Chart */}
        <Grid item xs={12} md={6}>
          <Box display="flex" justifyContent="center">
            <ResponsiveContainer width={300} height={300}>
              <BarChart layout="vertical" data={barData} margin={{ left: 40 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="device" />
                <Tooltip />
                <Bar dataKey="count" fill="#003865" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default DeviceTypeChart;
