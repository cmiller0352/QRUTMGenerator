// src/Components/ExportButtons.js
import React from 'react';
import { Button, CircularProgress, Stack } from '@mui/material';
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
  isSaving = false,
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
        disabled={!targetUrl || isSaving}
      >
        Copy URL
      </Button>
      {!isLinkOnly && (
        <>
          <Button
            variant="outlined"
            onClick={() => copyCanvasImageToClipboard(canvasRef)}
            startIcon={<ImageIcon />}
            disabled={isSaving}
          >
            Copy QR
          </Button>
          <Button
            variant="outlined"
            onClick={() => exportPng(canvasRef)}
            startIcon={<DownloadIcon />}
            disabled={isSaving}
          >
            Export PNG
          </Button>
          <Button
            variant="outlined"
            onClick={handleSvgExport}
            startIcon={<DownloadIcon />}
            disabled={!targetUrl || isSaving}
          >
            Export SVG
          </Button>
        </>
      )}
      <Button
        variant="contained"
        onClick={onSave}
        startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
        disabled={disableSave || isSaving}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
    </Stack>
  );
};

export default ExportButtons;
