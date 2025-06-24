import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Container, Typography, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data, error } = await supabase.from('qr_redirect_full_stats').select('*');
      if (error) console.error('Error fetching analytics:', error);
      else setAnalytics(data);
    };
    fetchAnalytics();
  }, []);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>QR Scan Analytics</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Short Code</TableCell>
            <TableCell>Scan Count</TableCell>
            <TableCell>Campaign</TableCell>
            <TableCell>Last Scanned</TableCell>
            <TableCell>Link</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {analytics.map((row) => (
            <TableRow key={row.short_code}>
              <TableCell>{row.short_code}</TableCell>
              <TableCell>{row.scan_count}</TableCell>
              <TableCell>{row.utm_campaign || '-'}</TableCell>
              <TableCell>{row.last_scanned?.slice(0, 19).replace('T', ' ')}</TableCell>
              <TableCell>
                <a href={`https://qrutmgenerator.vercel.app/${row.short_code}`} target="_blank" rel="noopener noreferrer">
                  Visit
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
};

export default AnalyticsPage;
