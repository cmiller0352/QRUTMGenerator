// src/Components/ExportButtons.js
import React from 'react';
import { Button, Stack } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ImageIcon from '@mui/icons-material/Image';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import { copyCanvasImageToClipboard, exportPng, exportSvg } from '../CanvasUtils';

const ExportButtons = ({ targetUrl, canvasRef, onSave }) => (
  <Stack direction="row" spacing={2} justifyContent="flex-start" mt={2} mb={2}>
    <Button variant="outlined" onClick={() => navigator.clipboard.writeText(targetUrl)} startIcon={<ContentCopyIcon />}>
      Copy URL
    </Button>
    <Button variant="outlined" onClick={() => copyCanvasImageToClipboard(canvasRef)} startIcon={<ImageIcon />}>
      Copy QR
    </Button>
    <Button variant="outlined" onClick={() => exportPng(canvasRef)} startIcon={<DownloadIcon />}>
      Export PNG
    </Button>
    <Button variant="outlined" onClick={() => exportSvg(canvasRef)} startIcon={<DownloadIcon />}>
      Export SVG
    </Button>
    <Button variant="contained" onClick={onSave} startIcon={<SaveIcon />}>
      Save
    </Button>
  </Stack>
);

export default ExportButtons;
