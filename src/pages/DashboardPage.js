// src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Container, Typography, CircularProgress, Grid } from '@mui/material';
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

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.rpc('get_dashboard_data');
      if (error) console.error('Error fetching dashboard data:', error);
      else setChartData(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <CircularProgress sx={{ mt: 8, display: 'block', mx: 'auto' }} />;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" gutterBottom>
        OutreachOS Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}><ScanByDayChart data={chartData.scansByDay} /></Grid>
        <Grid item xs={12} md={6}><ScanByHourChart data={chartData.scansByHour} /></Grid>
        <Grid item xs={12} md={6}><CityChart data={chartData.cities} /></Grid>
        <Grid item xs={12} md={6}><DeviceTypeChart data={chartData.devices} /></Grid>
        <Grid item xs={12}><TopCampaignsChart data={chartData.campaigns} /></Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;