// src/Components/LogoUpload.js
import React, { useMemo } from 'react';
import { Button, Typography, Slider, Stack } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';

const MIN_LOGO_SCALE = 0.1;
const MAX_LOGO_SCALE = 0.35;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const LogoUpload = ({ logoFile, setLogoFile, logoScale, setLogoScale }) => {
  const sliderValue = useMemo(() => {
    const safeScale = clamp(
      typeof logoScale === 'number' ? logoScale : MIN_LOGO_SCALE,
      MIN_LOGO_SCALE,
      MAX_LOGO_SCALE
    );
    return Math.round(((safeScale - MIN_LOGO_SCALE) / (MAX_LOGO_SCALE - MIN_LOGO_SCALE)) * 100);
  }, [logoScale]);

  const handleSliderChange = (_, value) => {
    if (Array.isArray(value)) return;
    const pct = clamp(value, 0, 100);
    const effectiveScale =
      MIN_LOGO_SCALE + (pct / 100) * (MAX_LOGO_SCALE - MIN_LOGO_SCALE);
    setLogoScale(Number(effectiveScale.toFixed(4)));
  };

  return (
    <Stack direction="column" spacing={1} mb={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
          Upload Logo
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setLogoFile(file);
              e.target.value = null;
            }}
          />
        </Button>
        <Button
          variant="text"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setLogoFile(null)}
          disabled={!logoFile}
        >
          Remove Logo
        </Button>
      </Stack>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography>Logo Size</Typography>
        <Slider
          min={0}
          max={100}
          step={1}
          value={sliderValue}
          onChange={handleSliderChange}
          style={{ width: '200px' }}
        />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Max size is capped for scan reliability.
      </Typography>
    </Stack>
  );
};

export default LogoUpload;
