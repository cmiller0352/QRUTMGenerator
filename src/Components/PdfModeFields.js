import React from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import formatFileSize from '../utils/formatFileSize';

const PdfModeFields = ({ fileTitle, setFileTitle, pdfFile, setPdfFile, disabled = false }) => (
  <Stack spacing={2} sx={{ mt: 1, mb: 1 }}>
    <TextField
      label="Document Title"
      fullWidth
      value={fileTitle}
      onChange={(e) => setFileTitle(e.target.value)}
      disabled={disabled}
    />
    <Box>
      <Typography variant="body2" sx={{ mb: 0.75 }}>
        PDF Upload
      </Typography>
      <input
        type="file"
        accept="application/pdf"
        disabled={disabled}
        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
      />
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
        Upload a PDF to create a short link and QR code for the document.
      </Typography>
      {pdfFile && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ sm: 'center' }}
          sx={{
            mt: 1,
            p: 1.25,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            backgroundColor: 'rgba(255,255,255,0.6)',
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {pdfFile.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatFileSize(pdfFile.size) || 'Unknown size'}
            </Typography>
          </Box>
          <Button
            variant="text"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={() => setPdfFile(null)}
            disabled={disabled}
          >
            Remove selected PDF
          </Button>
        </Stack>
      )}
    </Box>
  </Stack>
);

export default PdfModeFields;
