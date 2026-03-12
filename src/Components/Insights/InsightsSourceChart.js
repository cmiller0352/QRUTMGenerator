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
  return text.length > 18 ? `${text.slice(0, 18)}...` : text;
};

const InsightsSourceChart = ({ data }) => (
  <Paper elevation={3} sx={{ p: 3, height: 420 }}>
    <Stack spacing={0.5} sx={{ mb: 2 }}>
      <Typography variant="h6">
        Source Breakdown
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Highest-volume sources in the selected range.
      </Typography>
    </Stack>
    <Box sx={{ width: '100%', height: 320, minWidth: 0 }}>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tickFormatter={truncateLabel}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(242, 174, 0, 0.08)' }}
              content={({ active, payload, label }) => (
                <InsightsChartTooltip active={active} payload={payload} label={label} />
              )}
            />
            <Bar dataKey="count" name="Scans" fill="#F2AE00" radius={[0, 6, 6, 0]} activeBar={{ fill: '#d89a00' }} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
          <Typography variant="body2" color="text.secondary">
            No source data is available for this range.
          </Typography>
        </Stack>
      )}
    </Box>
  </Paper>
);

export default InsightsSourceChart;
