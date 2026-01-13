// src/Components/ExportButtons.js
import React from 'react';
import { Button, Stack } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ImageIcon from '@mui/icons-material/Image';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import { copyCanvasImageToClipboard, exportPng, exportQrSvg } from '../CanvasUtils';

const ExportButtons = ({
  targetUrl,
  canvasRef,
  onSave,
  linkType,
  disableSave = false,
  foregroundColor,
  backgroundColor,
  logoFileOrUrl,
  logoScale,
}) => {
  const isLinkOnly = linkType === 'link';
  const handleSvgExport = async () => {
    if (!targetUrl) return;
    try {
      await exportQrSvg({
        text: targetUrl,
        foregroundColor,
        backgroundColor,
        logoFileOrUrl,
        logoScale,
      });
    } catch (err) {
      console.error('Failed to export SVG', err);
    }
  };

  return (
    <Stack direction="row" spacing={2} justifyContent="flex-start" mt={2} mb={2} flexWrap="wrap">
      <Button
        variant="outlined"
        onClick={() => navigator.clipboard.writeText(targetUrl)}
        startIcon={<ContentCopyIcon />}
        disabled={!targetUrl}
      >
        Copy URL
      </Button>
      {!isLinkOnly && (
        <>
          <Button
            variant="outlined"
            onClick={() => copyCanvasImageToClipboard(canvasRef)}
            startIcon={<ImageIcon />}
          >
            Copy QR
          </Button>
          <Button
            variant="outlined"
            onClick={() => exportPng(canvasRef)}
            startIcon={<DownloadIcon />}
          >
            Export PNG
          </Button>
          <Button
            variant="outlined"
            onClick={handleSvgExport}
            startIcon={<DownloadIcon />}
            disabled={!targetUrl}
          >
            Export SVG
          </Button>
        </>
      )}
      <Button variant="contained" onClick={onSave} startIcon={<SaveIcon />} disabled={disableSave}>
        Save
      </Button>
    </Stack>
  );
};

export default ExportButtons;
