// src/Components/TargetUrlInput.js
import React from 'react';
import { Button, Stack, TextField } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const TargetUrlInput = ({ baseUrl, setBaseUrl, finalUrl, showBaseUrlError = false }) => {
  const copyFinalUrl = async () => {
    if (!finalUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(finalUrl);
        return;
      }
      const textarea = document.createElement('textarea');
      textarea.value = finalUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (err) {
      console.error('Failed to copy final URL', err);
    }
  };

  return (
    <Stack spacing={1} sx={{ mb: 1 }}>
      <TextField
        label="Base URL"
        fullWidth
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.9rem' } }}
        margin="dense"
        error={showBaseUrlError}
        helperText={showBaseUrlError ? 'Enter a valid URL including https://' : undefined}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-end' }}>
        <TextField
          label="Final URL (with UTMs)"
          fullWidth
          value={finalUrl || ''}
          InputProps={{
            readOnly: true,
            style: { fontFamily: 'monospace', fontSize: '0.9rem' },
          }}
          margin="dense"
        />
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={copyFinalUrl}
          disabled={!finalUrl}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Copy Final URL
        </Button>
      </Stack>
    </Stack>
  );
};

export default TargetUrlInput;
