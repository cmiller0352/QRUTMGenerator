// src/Pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  Container,
  Typography,
  CircularProgress,
  Grid,
  Paper,
  Box,
} from '@mui/material';

import CityChart from '../Components/Dashboard/CityChart';
import ScanByDayChart from '../Components/Dashboard/ScanByDayChart';
import ScanByHourChart from '../Components/Dashboard/ScanByHourChart';
import DeviceTypeChart from '../Components/Dashboard/DeviceTypeChart';
import TopCampaignsChart from '../Components/Dashboard/TopCampaignsChart';
import HeatmapChart from '../Components/Dashboard/HeatmapChart';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({
    scansByDay: [],
    scansByHour: [],
    cities: [],
    devices: [],
    campaigns: [],
    locations: [],
  });

  const [metrics, setMetrics] = useState({
    totalQrCodes: 0,
    totalRedirects: 0,
    totalCampaigns: 0,
    totalCities: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      // 1) Base charts from RPC
      const { data: charts, error: chartsError } = await supabase.rpc('get_dashboard_data');
      if (chartsError) {
        console.error('Error fetching dashboard data:', chartsError);
      } else {
        setChartData(charts || {});
      }

      // 2) Summary metrics (use count on views to avoid 1000-row ceiling)
      const [
        qrCodesRes,
        redirectsRes,
        campaignsRes,
        citiesRes,
      ] = await Promise.all([
        supabase
          .from('qr_utm_generator_logs')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('qr_redirect_logs')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('v_unique_campaigns')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('v_unique_cities')
          .select('*', { count: 'exact', head: true }),
      ]);

      if (qrCodesRes.error) {
        console.error('Error counting QR codes:', qrCodesRes.error);
      }
      if (redirectsRes.error) {
        console.error('Error counting redirects:', redirectsRes.error);
      }
      if (campaignsRes.error) {
        console.error('Error counting campaigns:', campaignsRes.error);
      }
      if (citiesRes.error) {
        console.error('Error counting cities:', citiesRes.error);
      }

      setMetrics({
        totalQrCodes: qrCodesRes.count || 0,
        totalRedirects: redirectsRes.count || 0,
        totalCampaigns: campaignsRes.count || 0,
        totalCities: citiesRes.count || 0,
      });

      // 3) Top campaigns from normalized view (unchanged)
      const { data: topCampaigns, error: topCampaignsError } = await supabase
        .from('campaign_counts_norm')
        .select('utm_campaign:campaign_norm, count')
        .order('count', { ascending: false })
        .limit(10);

      if (topCampaignsError) {
        console.error('Error loading top campaigns (norm):', {
          message: topCampaignsError.message,
          details: topCampaignsError.details,
          hint: topCampaignsError.hint,
          code: topCampaignsError.code,
        });
      } else {
        setChartData((prev) => ({
          ...prev,
          campaigns: topCampaigns || [],
        }));
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return <CircularProgress sx={{ mt: 8, display: 'block', mx: 'auto' }} />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        OutreachOS Dashboard
      </Typography>

      {/* Metrics Summary */}
      <Grid container spacing={3}>
        {[
          { label: 'QR Codes Created', value: metrics.totalQrCodes },
          { label: 'Total Scans (Redirects)', value: metrics.totalRedirects },
          { label: 'Unique Campaigns', value: metrics.totalCampaigns },
          { label: 'Cities Detected', value: metrics.totalCities },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {stat.label}
              </Typography>
              <Typography variant="h5" color="primary">
                {stat.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Row 1: Scans by Day */}
      <Box sx={{ my: 4 }}>
        <ScanByDayChart data={chartData.scansByDay || []} />
      </Box>

      {/* Row 2: Hour + Device */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <ScanByHourChart data={chartData.scansByHour || []} />
        </Grid>
        <Grid item xs={12} md={6}>
          <DeviceTypeChart data={chartData.devices || []} />
        </Grid>
      </Grid>

      {/* Row 3: Cities + Heatmap */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 4,
          mt: 3,
          alignItems: 'stretch',
          width: '100%',
        }}
      >
        <Box flex={1} minWidth={0}>
          <CityChart data={chartData.cities || []} />
        </Box>
        <Box flex={1} minWidth={0}>
          <HeatmapChart data={chartData.locations || []} />
        </Box>
      </Box>

      {/* Row 4: Top Campaigns */}
      <Box sx={{ mt: 4 }}>
        <TopCampaignsChart data={chartData.campaigns || []} />
      </Box>
    </Container>
  );
};

export default DashboardPage;
