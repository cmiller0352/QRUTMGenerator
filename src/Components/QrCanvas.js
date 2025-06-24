// src/Components/QrCanvas.js
import React from 'react';
import { Box } from '@mui/material';

const QrCanvas = ({ canvasRef, backgroundColor }) => (
  <Box display="flex" justifyContent="center">
    <canvas
      ref={canvasRef}
      style={{ border: '1px solid #ccc', backgroundColor }}
      width={300}
      height={300}
    />
  </Box>
);

export default QrCanvas;
