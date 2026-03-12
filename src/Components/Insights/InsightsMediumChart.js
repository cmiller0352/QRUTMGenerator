import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import InsightsChartTooltip from './InsightsChartTooltip';

const truncateLabel = (value) => {
  const text = String(value || '');
  return text.length > 16 ? `${text.slice(0, 16)}...` : text;
};

const InsightsMediumChart = ({ data, derived }) => (
  <Paper elevation={3} sx={{ p: 3, height: 360 }}>
    <Stack spacing={0.5} sx={{ mb: 2 }}>
      <Typography variant="h6">
        Medium Breakdown
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {derived
          ? 'Derived from recent activity in the current range.'
          : 'UTM medium performance for the selected range.'}
      </Typography>
    </Stack>
    <Box sx={{ width: '100%', height: 260, minWidth: 0 }}>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tickFormatter={truncateLabel}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(15, 138, 77, 0.08)' }}
              content={({ active, payload, label }) => (
                <InsightsChartTooltip active={active} payload={payload} label={label} />
              )}
            />
            <Bar dataKey="count" name="Scans" fill="#0f8a4d" radius={[0, 6, 6, 0]} activeBar={{ fill: '#0b6b3b' }} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
          <Typography variant="body2" color="text.secondary">
            No medium data is available for this range.
          </Typography>
        </Stack>
      )}
    </Box>
  </Paper>
);

export default InsightsMediumChart;
