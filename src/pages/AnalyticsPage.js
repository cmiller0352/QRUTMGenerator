// src/AnalyticsPage.js
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  Chip,
  Container,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Pagination,
  Stack
} from '@mui/material';

const isProxyCity = (city) => {
  const proxyCities = ['Boydton', 'Ashburn', 'Redmond'];
  return proxyCities.includes(city);
};

const rowsPerPage = 10;

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data, error } = await supabase.from('qr_redirect_logs').select('*').order('created_at',{ascending: false});
      if (error) console.error('Error fetching analytics:', error);
      else setAnalytics(data);
    };
    fetchAnalytics();
  }, []);

  const filteredData = useMemo(() => {
    return analytics.filter((row) => {
      return (
        row.short_code?.toLowerCase().includes(search.toLowerCase()) ||
        row.utm_campaign?.toLowerCase().includes(search.toLowerCase()) ||
        row.utm_source?.toLowerCase().includes(search.toLowerCase()) ||
        row.utm_medium?.toLowerCase().includes(search.toLowerCase()) ||
        row.city?.toLowerCase().includes(search.toLowerCase()) ||
        row.region?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [analytics, search]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page]);

  return (
    <Container sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">QR Scan Analytics</Typography>
      </Stack>

      <TextField
        fullWidth
        label="Search by shortcode, UTM, or location"
        variant="outlined"
        margin="dense"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        sx={{ mb: 2 }}
      />

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Short Code</TableCell>
            <TableCell>UTM Source</TableCell>
            <TableCell>UTM Medium</TableCell>
            <TableCell>UTM Campaign</TableCell>
            <TableCell>City</TableCell>
            <TableCell>Region</TableCell>
            <TableCell>Postal Code</TableCell>
            <TableCell>Confidence</TableCell>
            <TableCell>Scanned</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedData.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.short_code}</TableCell>
              <TableCell>{row.utm_source || row.inferred_source || '-'}</TableCell>
              <TableCell>{row.utm_medium || row.inferred_medium || '-'}</TableCell>
              <TableCell>{row.utm_campaign || '-'}</TableCell>
              <TableCell>{row.city || '-'}</TableCell>
              <TableCell>{row.region || '-'}</TableCell>
              <TableCell>{row.postal_code || '-'}</TableCell>
              <TableCell>
                {row.city
                  ? isProxyCity(row.city)
                    ? <Chip label="Estimated" color="warning" size="small" />
                    : <Chip label="Confirmed" color="success" size="small" />
                  : <Chip label="Unknown" size="small" />}
              </TableCell>
              <TableCell>{row.created_at?.slice(0, 19).replace('T', ' ')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Stack alignItems="center" mt={3}>
        <Pagination
          count={Math.ceil(filteredData.length / rowsPerPage)}
          page={page}
          onChange={(e, value) => setPage(value)}
          color="primary"
        />
      </Stack>
    </Container>
  );
};

export default AnalyticsPage;
