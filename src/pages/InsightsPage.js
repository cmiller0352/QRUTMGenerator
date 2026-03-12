import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Container,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import InsightsFilters from '../Components/Insights/InsightsFilters';
import InsightsMetricCards from '../Components/Insights/InsightsMetricCards';
import InsightsTrendChart from '../Components/Insights/InsightsTrendChart';
import InsightsDeviceChart from '../Components/Insights/InsightsDeviceChart';
import InsightsSourceChart from '../Components/Insights/InsightsSourceChart';
import InsightsMediumChart from '../Components/Insights/InsightsMediumChart';
import InsightsCampaignsCard from '../Components/Insights/InsightsCampaignsCard';
import InsightsQualityCard from '../Components/Insights/InsightsQualityCard';
import InsightsRecentActivityTable from '../Components/Insights/InsightsRecentActivityTable';
import InsightsHeatmapCard from '../Components/Insights/InsightsHeatmapCard';

const RANGE_OPTIONS = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

const DEFAULT_DATA = {
  meta: {},
  summary: {},
  trend: [],
  hourly: [],
  devices: [],
  sources: [],
  campaigns: [],
  locations: [],
  recent_scans: [],
};

const ALL_TIME_FALLBACK_START = '2025-06-24T20:54:43.872292+00:00';

const toIsoString = (date) => date.toISOString();

const getRangeParams = (range, earliestStart = ALL_TIME_FALLBACK_START) => {
  const now = new Date();

  switch (range) {
    case '24h':
      return {
        start_date: toIsoString(new Date(now.getTime() - (24 * 60 * 60 * 1000))),
        end_date: toIsoString(now),
        time_grain: 'hour',
      };
    case '7d':
      return {
        start_date: toIsoString(new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))),
        end_date: toIsoString(now),
        time_grain: 'day',
      };
    case '30d':
      return {
        start_date: toIsoString(new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))),
        end_date: toIsoString(now),
        time_grain: 'day',
      };
    case '90d':
      return {
        start_date: toIsoString(new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))),
        end_date: toIsoString(now),
        time_grain: 'week',
      };
    case 'all':
    default:
      return {
        start_date: earliestStart,
        end_date: toIsoString(now),
        time_grain: 'month',
      };
  }
};

const normalizeCount = (row) => Number(row?.count ?? row?.scans ?? row?.value ?? 0);

const normalizeLabel = (row, labelKeys, fallback = 'Unknown') => {
  for (const key of labelKeys) {
    const value = row?.[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value);
  }
  return fallback;
};

const normalizeRecentScan = (row) => ({
  timestamp: row?.timestamp || row?.created_at || null,
  short_code: row?.short_code || row?.code || null,
  campaign: row?.utm_campaign || row?.campaign || null,
  source: row?.utm_source || row?.source || null,
  medium: row?.utm_medium || row?.medium || null,
  device: row?.device_type || row?.device || null,
  region: row?.region || null,
  country: row?.country || null,
});

const normalizeResponse = (data) => ({
  meta: data?.meta || {},
  summary: data?.summary || {},
  trend: (data?.trend || []).map((row) => ({
    label: row.label || row.bucket || row.date || row.period,
    count: normalizeCount(row),
    pct_of_total: row.pct_of_total ?? null,
    top_source: row.top_source || null,
    top_source_count: row.top_source_count ?? null,
    top_campaign: row.top_campaign || null,
    top_campaign_count: row.top_campaign_count ?? null,
  })),
  hourly: (data?.hourly || []).map((row) => ({
    label: row.label || row.bucket || row.hour,
    count: normalizeCount(row),
  })),
  devices: (data?.devices || []).map((row) => ({
    label: normalizeLabel(row, ['device_type', 'device', 'label']),
    count: normalizeCount(row),
  })),
  sources: (data?.sources || []).map((row) => ({
    label: normalizeLabel(row, ['utm_source', 'source', 'label']),
    count: normalizeCount(row),
  })),
  campaigns: (data?.campaigns || []).map((row) => ({
    label: normalizeLabel(row, ['utm_campaign', 'campaign', 'label']),
    count: normalizeCount(row),
  })),
  locations: (data?.locations || []).map((row) => ({
    city: row.city || null,
    region: row.region || row.state || null,
    country: row.country || null,
    label: row.label || null,
    latitude: row.latitude || row.lat || null,
    longitude: row.longitude || row.lng || null,
    count: normalizeCount(row),
  })),
  recent_scans: (data?.recent_scans || []).map(normalizeRecentScan),
});

const hasAnyData = (insights) => {
  const summaryTotal = Number(insights.summary?.total_scans || 0);
  return summaryTotal > 0 ||
    insights.trend.length > 0 ||
    insights.hourly.length > 0 ||
    insights.devices.length > 0 ||
    insights.sources.length > 0 ||
    insights.campaigns.length > 0 ||
    insights.locations.length > 0 ||
    insights.recent_scans.length > 0;
};

const hasLocationData = (locations) => locations.some((row) => (
  Number.isFinite(Number(row?.latitude)) && Number.isFinite(Number(row?.longitude))
));

const rangeDescription = {
  '24h': 'Last 24 hours by hour',
  '7d': 'Last 7 days by day',
  '30d': 'Last 30 days by day',
  '90d': 'Last 90 days by week',
  all: 'All time by month',
};

const buildMediumData = (recentScans) => {
  const counts = new Map();

  for (const row of recentScans) {
    const label = row.medium || 'Unknown';
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
};

const LoadingState = () => (
  <Stack spacing={3}>
    <Skeleton variant="rounded" height={96} />
    <Grid container spacing={3}>
      {[0, 1, 2, 3].map((item) => (
        <Grid key={item} item xs={12} sm={6} lg={3}>
          <Skeleton variant="rounded" height={132} />
        </Grid>
      ))}
    </Grid>
    <Grid container spacing={3}>
      <Grid item xs={12} lg={8}>
        <Skeleton variant="rounded" height={420} />
      </Grid>
      <Grid item xs={12} lg={4}>
        <Skeleton variant="rounded" height={420} />
      </Grid>
    </Grid>
    <Grid container spacing={3}>
      <Grid item xs={12} lg={7}>
        <Skeleton variant="rounded" height={420} />
      </Grid>
      <Grid item xs={12} lg={5}>
        <Skeleton variant="rounded" height={420} />
      </Grid>
    </Grid>
    <Skeleton variant="rounded" height={340} />
  </Stack>
);

const InsightsPage = () => {
  const [selectedRange, setSelectedRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [insights, setInsights] = useState(DEFAULT_DATA);
  const [allTimeStart, setAllTimeStart] = useState(ALL_TIME_FALLBACK_START);

  useEffect(() => {
    let isActive = true;

    const fetchInsights = async () => {
      setLoading(true);
      setError('');

      const params = getRangeParams(selectedRange, allTimeStart);
      const { data, error: rpcError } = await supabase.rpc('get_dashboard_data_v2', params);

      if (!isActive) return;

      if (rpcError) {
        console.error('Error fetching insights data:', rpcError);
        setInsights(DEFAULT_DATA);
        setError(rpcError.message || 'Unable to load insights right now.');
        setLoading(false);
        return;
      }

      const normalized = normalizeResponse(data);
      const discoveredAllTimeStart = normalized.meta?.start_date || normalized.meta?.min_date || normalized.meta?.earliest_date;
      if (selectedRange === 'all' && discoveredAllTimeStart) {
        setAllTimeStart(discoveredAllTimeStart);
      }
      setInsights(normalized);
      setLoading(false);
    };

    fetchInsights();

    return () => {
      isActive = false;
    };
  }, [selectedRange, allTimeStart]);

  const trendData = insights.trend.length > 0 ? insights.trend : insights.hourly;
  const sourceData = insights.sources.slice(0, 7);
  const mediumData = buildMediumData(insights.recent_scans);
  const campaignData = insights.campaigns.slice(0, 6);
  const showLocations = hasLocationData(insights.locations);
  const selectedSummary = rangeDescription[selectedRange];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            OutreachOS Insights
          </Typography>
          <Typography color="text.secondary">
            Showing {selectedSummary}.
          </Typography>
        </Box>

        <InsightsFilters
          options={RANGE_OPTIONS}
          selectedRange={selectedRange}
          onChange={setSelectedRange}
        />

        {loading ? <LoadingState /> : null}

        {!loading && error ? (
          <Alert severity="error">
            {error}
          </Alert>
        ) : null}

        {!loading && !error && !hasAnyData(insights) ? (
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>
              No insights available
            </Typography>
            <Typography color="text.secondary">
              There are no scans in the selected date range yet. Try a broader range.
            </Typography>
          </Paper>
        ) : null}

        {!loading && !error && hasAnyData(insights) ? (
          <>
            <InsightsMetricCards summary={insights.summary} />

            <Box sx={{ width: '100%', minWidth: 0 }}>
              <InsightsTrendChart
                data={trendData}
                rangeLabel={rangeDescription[selectedRange]}
                timeGrain={getRangeParams(selectedRange, allTimeStart).time_grain}
              />
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6} lg={5}>
                <InsightsSourceChart data={sourceData} />
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <InsightsMediumChart data={mediumData} derived />
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <InsightsDeviceChart data={insights.devices} />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <InsightsCampaignsCard data={campaignData} />
              </Grid>
              <Grid item xs={12} lg={4}>
                <InsightsQualityCard devices={insights.devices} />
              </Grid>
            </Grid>

            <InsightsRecentActivityTable data={insights.recent_scans} />

            {showLocations ? (
              <InsightsHeatmapCard data={insights.locations} />
            ) : null}
          </>
        ) : null}
      </Stack>
    </Container>
  );
};

export default InsightsPage;
