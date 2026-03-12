import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import InsightsChartTooltip from './InsightsChartTooltip';

const COLORS = ['#006633', '#0f8a4d', '#64b57d', '#f2ae00', '#d97b00', '#8c5d00'];

const order = ['Desktop', 'Mobile', 'Tablet', 'Bot', 'Unknown'];

const InsightsDeviceChart = ({ data }) => {
  const normalized = order.map((label) => {
    const match = data.find((item) => item.label.toLowerCase() === label.toLowerCase());
    return { label, count: match?.count || 0 };
  });
  const hasCounts = normalized.some((item) => item.count > 0);

  return (
    <Paper elevation={3} sx={{ p: 3, height: 420 }}>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h6">
          Device Breakdown
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Desktop, mobile, tablet, bot, and unknown traffic split.
        </Typography>
      </Stack>
      <Box sx={{ width: '100%', height: 320, minWidth: 0 }}>
        {hasCounts ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={normalized} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" interval={0} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} width={36} />
              <Tooltip
                cursor={{ fill: 'rgba(0, 102, 51, 0.06)' }}
                content={({ active, payload, label }) => (
                  <InsightsChartTooltip active={active} payload={payload} label={label} />
                )}
              />
              <Bar dataKey="count" name="Scans" radius={[6, 6, 0, 0]} activeBar={{ fill: '#0b6b3b' }}>
                {normalized.map((entry, index) => (
                  <Cell key={`${entry.label}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              No device data is available for this range.
            </Typography>
          </Stack>
        )}
      </Box>
    </Paper>
  );
};

export default InsightsDeviceChart;
