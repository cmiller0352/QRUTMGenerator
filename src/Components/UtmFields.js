// src/Components/UtmFields.js
import React from 'react';
import { Grid, TextField } from '@mui/material';

const UtmFields = ({ utmSource, setUtmSource, utmMedium, setUtmMedium, utmCampaign, setUtmCampaign }) => (
  <Grid container spacing={2} mt={1} mb={1}>
    <Grid item xs={4}>
      <TextField label="UTM Source" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} fullWidth />
    </Grid>
    <Grid item xs={4}>
      <TextField label="UTM Medium" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} fullWidth />
    </Grid>
    <Grid item xs={4}>
      <TextField label="UTM Campaign" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} fullWidth />
    </Grid>
  </Grid>
);

export default UtmFields;
