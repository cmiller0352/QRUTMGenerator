import React from 'react';
import { Divider, Paper, Stack, Typography } from '@mui/material';

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value) || 0);

const byDevice = (data) => {
  const lookup = new Map(
    data.map((row) => [String(row.label || '').toLowerCase(), Number(row.count) || 0]),
  );

  const desktop = lookup.get('desktop') || 0;
  const mobile = lookup.get('mobile') || 0;
  const tablet = lookup.get('tablet') || 0;
  const bot = lookup.get('bot') || 0;
  const unknown = lookup.get('unknown') || 0;
  const humanLeaning = desktop + mobile + tablet;
  const total = humanLeaning + bot + unknown;
  const botShare = total > 0 ? (bot / total) * 100 : 0;

  return { bot, unknown, humanLeaning, botShare };
};

const MetricRow = ({ label, value, helper }) => (
  <Stack spacing={0.25}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h6" color="primary">
      {value}
    </Typography>
    {helper ? (
      <Typography variant="caption" color="text.secondary">
        {helper}
      </Typography>
    ) : null}
  </Stack>
);

const InsightsQualityCard = ({ devices }) => {
  const { bot, unknown, humanLeaning, botShare } = byDevice(devices);

  return (
    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h6">Scan Quality</Typography>
          <Typography variant="body2" color="text.secondary">
            Executive summary derived from current device buckets.
          </Typography>
        </Stack>

        <MetricRow
          label="Human-leaning scans"
          value={formatNumber(humanLeaning)}
          helper="Desktop + Mobile + Tablet"
        />
        <Divider />
        <MetricRow label="Bot scans" value={formatNumber(bot)} />
        <Divider />
        <MetricRow label="Unknown scans" value={formatNumber(unknown)} />
        <Divider />
        <MetricRow label="Bot share" value={`${botShare.toFixed(1)}%`} />
      </Stack>
    </Paper>
  );
};

export default InsightsQualityCard;
