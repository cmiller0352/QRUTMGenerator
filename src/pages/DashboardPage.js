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

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({
    scansByDay: [],
    scansByHour: [],
    cities: [],
    devices: [],
    campaigns: [],
  });

  const [metrics, setMetrics] = useState({
    totalQrCodes: 0,
    totalRedirects: 0,
    totalCampaigns: 0,
    totalCities: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: charts, error } = await supabase.rpc('get_dashboard_data');
      if (error) console.error('Error fetching dashboard data:', error);
      else setChartData(charts);

      const [qrCodesRes, redirectsRes, campaignsRes, citiesRes] = await Promise.all([
        supabase.from('qr_utm_generator_logs').select('*', { count: 'exact', head: true }),
        supabase.from('qr_redirect_logs').select('*', { count: 'exact', head: true }),
        supabase.from('qr_redirect_logs').select('utm_campaign', { distinct: true }),
        supabase.from('qr_redirect_logs').select('city', { distinct: true }),
      ]);

      setMetrics({
        totalQrCodes: qrCodesRes.count || 0,
        totalRedirects: redirectsRes.count || 0,
        totalCampaigns: campaignsRes.data?.length || 0,
        totalCities: citiesRes.data?.length || 0,
      });

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading)
    return <CircularProgress sx={{ mt: 8, display: 'block', mx: 'auto' }} />;

  return (
    <Container maxWidth={false} disableGutters sx={{ px: 6, mt: 4, mb: 6 }}>
      <Box sx={{ maxWidth: '1800px', mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          OutreachOS Dashboard
        </Typography>

        {/* Metrics Summary */}
        <Grid container spacing={3} sx={{ mt: 3 }}>
          {[
            { label: 'QR Codes Created', value: metrics.totalQrCodes },
            { label: 'Total Scans (Redirects)', value: metrics.totalRedirects },
            { label: 'Unique Campaigns (with UTM)', value: metrics.totalCampaigns },
            { label: 'Cities Detected from QR Scans', value: metrics.totalCities },
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {stat.label}
                </Typography>
                <Typography variant="h4" color="primary">{stat.value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Charts */}
        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12}>
            <ScanByDayChart data={chartData.scansByDay} />
          </Grid>

          <Grid item xs={12} md={6}>
            <ScanByHourChart data={chartData.scansByHour} />
          </Grid>

          <Grid item xs={12}>
            <DeviceTypeChart data={chartData.devices} />
          </Grid>
        </Grid>

        {/* Cities and Campaigns in their own row */}
        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <CityChart data={chartData.cities} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TopCampaignsChart data={chartData.campaigns} />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default DashboardPage;
