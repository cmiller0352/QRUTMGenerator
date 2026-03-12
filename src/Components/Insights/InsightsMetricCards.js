import React from 'react';
import { Grid, Paper, Stack, Typography } from '@mui/material';

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value) || 0);

const formatPct = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  const amount = Number(value);
  const sign = amount > 0 ? '+' : '';
  return `${sign}${amount.toFixed(1)}%`;
};

const metricCards = (summary) => [
  {
    label: 'Total Scans',
    value: formatNumber(summary.total_scans),
    helper: `Prev: ${formatNumber(summary.previous_total_scans)}`,
  },
  {
    label: 'Change vs Prior Period',
    value: formatPct(summary.pct_change_scans),
    helper: 'Compared with previous period',
  },
  {
    label: 'Top Campaign',
    value: summary.top_campaign || 'No data',
    helper: `${formatNumber(summary.top_campaign_count)} scans`,
  },
  {
    label: 'Top Source',
    value: summary.top_source || 'No data',
    helper: `${formatNumber(summary.top_source_count)} scans`,
  },
];

const InsightsMetricCards = ({ summary }) => (
  <Grid container spacing={3}>
    {metricCards(summary).map((metric) => (
      <Grid key={metric.label} item xs={12} sm={6} lg={3}>
        <Paper
          elevation={3}
          sx={{
            p: 2.5,
            height: '100%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(254,243,181,0.55) 100%)',
          }}
        >
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              {metric.label}
            </Typography>
            <Typography
              variant="h5"
              color="primary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {metric.value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {metric.helper}
            </Typography>
          </Stack>
        </Paper>
      </Grid>
    ))}
  </Grid>
);

export default InsightsMetricCards;
