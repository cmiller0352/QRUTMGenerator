// src/HistoryPage.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  TextField
} from '@mui/material';

const HistoryPage = () => {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('qr_utm_generator_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error) setEntries(data);
    };
    fetchHistory();
  }, []);

  const buildRegenerateUrl = (entry) => {
    const params = new URLSearchParams();
    if (entry.base_url) params.append('base_url', entry.base_url);
    if (entry.utm_source) params.append('utm_source', entry.utm_source);
    if (entry.utm_medium) params.append('utm_medium', entry.utm_medium);
    if (entry.utm_campaign) params.append('utm_campaign', entry.utm_campaign);
    if (entry.logo_url) params.append('logo_url', entry.logo_url);
    return `/?${params.toString()}`;
  };

  const filteredEntries = entries.filter((entry) => {
    return (
      entry.full_url?.toLowerCase().includes(search.toLowerCase()) ||
      entry.utm_campaign?.toLowerCase().includes(search.toLowerCase()) ||
      entry.utm_source?.toLowerCase().includes(search.toLowerCase()) ||
      entry.utm_medium?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">QR History</Typography>
        <Button variant="outlined" href="/">
          Back to Generator
        </Button>
      </Stack>

      <TextField
        fullWidth
        label="Search by campaign, source, medium, or URL"
        variant="outlined"
        margin="dense"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Grid container spacing={2}>
        {filteredEntries.map((entry) => (
          <Grid item xs={12} md={6} key={entry.id}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" noWrap>
                  {entry.full_url || entry.base_url}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(entry.created_at).toLocaleString()}
                </Typography>
                <Stack direction="row" spacing={1} mt={1}>
                  <Button size="small" onClick={() => navigator.clipboard.writeText(entry.full_url)}>
                    Copy URL
                  </Button>
                  <Button size="small" onClick={() => window.open(entry.full_url, '_blank')}>
                    Open
                  </Button>
                  <Button size="small" variant="outlined" href={buildRegenerateUrl(entry)}>
                    Regenerate
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default HistoryPage;
