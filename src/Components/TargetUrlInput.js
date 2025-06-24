// src/Components/TargetUrlInput.js
import React from 'react';
import { TextField } from '@mui/material';

const TargetUrlInput = ({ targetUrl, setBaseUrl }) => (
  <TextField
    label="Target URL"
    fullWidth
    value={targetUrl}
    onChange={(e) => setBaseUrl(e.target.value)}
    inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.9rem' } }}
    margin="dense"
  />
);

export default TargetUrlInput;
