// src/Components/SaveOptions.js
import React from 'react';
import { ToggleButton, ToggleButtonGroup, Typography, Stack } from '@mui/material';

const SaveOptions = ({ linkType, setLinkType }) => (
  <Stack direction="row" spacing={2} alignItems="center" mb={2}>
    <Typography variant="body1" sx={{ whiteSpace: 'nowrap' }}>Save as:</Typography>
    <ToggleButtonGroup
      value={linkType}
      exclusive
      onChange={(e, val) => val && setLinkType(val)}
      size="small"
      color="primary"
    >
      <ToggleButton value="link">Link Only</ToggleButton>
      <ToggleButton value="qr">QR Only</ToggleButton>
      <ToggleButton value="both">Both</ToggleButton>
    </ToggleButtonGroup>
  </Stack>
);

export default SaveOptions;
