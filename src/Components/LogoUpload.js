// src/Components/LogoUpload.js
import React from 'react';
import { Button, Typography, Slider, Stack } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';

const LogoUpload = ({ logoFile, setLogoFile, logoScale, setLogoScale }) => (
  <Stack direction="row" spacing={2} alignItems="center" mb={2}>
    <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
      Upload Logo
      <input type="file" hidden accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} />
    </Button>
    <Typography>Logo Size</Typography>
    <Slider
      min={0.05}
      max={0.4}
      step={0.01}
      value={logoScale}
      onChange={(e, val) => setLogoScale(val)}
      style={{ width: '200px' }}
    />
  </Stack>
);

export default LogoUpload;
