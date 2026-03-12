import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import InsightsChartTooltip from './InsightsChartTooltip';

const formatXAxis = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatHourlyTick = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: 'numeric' });
};

const formatFullLabel = (value, timeGrain) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  if (timeGrain === 'hour') {
    return date.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
    });
  }

  if (timeGrain === 'month') {
    return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
  }

  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return `${Number(value).toFixed(1)}%`;
};

const InsightsTrendChart = ({ data, rangeLabel, timeGrain }) => (
  <Paper
    elevation={3}
    sx={{
      p: 3,
      height: 520,
      width: '100%',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Stack spacing={0.5} sx={{ mb: 2 }}>
      <Typography variant="h6">
        Scans Over Time
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {rangeLabel}
      </Typography>
    </Stack>
    <Box sx={{ width: '100%', height: 420, minWidth: 0, flex: 1 }}>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickFormatter={timeGrain === 'hour' ? formatHourlyTick : formatXAxis}
              minTickGap={timeGrain === 'hour' ? 0 : 24}
              interval={timeGrain === 'hour' ? 0 : 'preserveStartEnd'}
              angle={timeGrain === 'hour' ? -45 : 0}
              textAnchor={timeGrain === 'hour' ? 'end' : 'middle'}
              height={timeGrain === 'hour' ? 72 : 30}
            />
            <YAxis allowDecimals={false} width={40} />
            <Tooltip
              offset={20}
              position={{ y: 24 }}
              cursor={{ stroke: '#006633', strokeOpacity: 0.08, strokeWidth: 1.5 }}
              content={({ active, payload, label }) => (
                (() => {
                  const point = payload?.[0]?.payload || {};
                  const bucketSections = [];

                  if (point.pct_of_total !== null && point.pct_of_total !== undefined) {
                    bucketSections.push({
                      title: 'Bucket Share',
                      rows: [
                        { label: 'Percent of range total', value: formatPercent(point.pct_of_total) },
                      ],
                    });
                  }

                  if (point.top_source || point.top_source_count !== null) {
                    bucketSections.push({
                      title: 'Top Source',
                      rows: [
                        { label: point.top_source || 'Unknown', value: `${Number(point.top_source_count) || 0} scans` },
                      ],
                    });
                  }

                  if (point.top_campaign || point.top_campaign_count !== null) {
                    bucketSections.push({
                      title: 'Top Campaign',
                      rows: [
                        { label: point.top_campaign || 'Unknown', value: `${Number(point.top_campaign_count) || 0} scans` },
                      ],
                    });
                  }

                  return (
                <InsightsChartTooltip
                  active={active}
                  payload={payload}
                  label={formatFullLabel(label, timeGrain)}
                  sections={bucketSections}
                  sx={{
                    minWidth: 210,
                    backgroundColor: 'rgba(255,255,255,0.50)',
                    border: '1px solid rgba(0, 102, 51, 0.10)',
                    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.10)',
                  }}
                />
                  );
                })()
              )}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Scans"
              stroke="#006633"
              fill="rgba(0, 102, 51, 0.18)"
              strokeWidth={3}
              activeDot={{ r: 4.5, strokeWidth: 1.5, stroke: '#ffffff', fill: '#006633' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
          <Typography variant="body2" color="text.secondary">
            No trend data is available for this range.
          </Typography>
        </Stack>
      )}
    </Box>
  </Paper>
);

export default InsightsTrendChart;
