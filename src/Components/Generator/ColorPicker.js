// src/Components/ColorPicker.js
import React from 'react';
import { Grid, TextField } from '@mui/material';

const ColorPicker = ({ foregroundColor, setForegroundColor, backgroundColor, setBackgroundColor }) => (
  <Grid container spacing={2} mt={1} mb={2}>
    <Grid item xs={6}>
      <TextField
        label="Foreground Color"
        value={foregroundColor}
        onChange={(e) => setForegroundColor(e.target.value)}
        fullWidth
        InputProps={{ style: { fontFamily: 'monospace' } }}
        placeholder="#000000"
      />
    </Grid>
    <Grid item xs={6}>
      <TextField
        label="Background Color"
        value={backgroundColor}
        onChange={(e) => setBackgroundColor(e.target.value)}
        fullWidth
        InputProps={{ style: { fontFamily: 'monospace' } }}
        placeholder="#ffffff"
      />
    </Grid>
  </Grid>
);

export default ColorPicker;
