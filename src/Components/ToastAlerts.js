// src/Components/ToastAlerts.js
import React from 'react';
import { Snackbar, Alert, Box, Typography, Button } from '@mui/material';

const ToastAlerts = ({ openSnackbar, setOpenSnackbar, errorSnackbar, setErrorSnackbar, shortCode }) => {
  const shortLink = shortCode
    ? `https://qrutmgenerator.vercel.app/${shortCode}`
    : null;

  return (
    <>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={5000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          QR code saved!
          {shortLink && (
            <Box mt={1}>
              <Typography variant="caption" display="block">
                Short link:
              </Typography>
              <Typography
                variant="body2"
                component="a"
                href={shortLink}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textDecoration: 'underline', color: '#fff' }}
              >
                {shortLink}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigator.clipboard.writeText(shortLink)}
                sx={{ ml: 1, color: '#fff', borderColor: '#fff' }}
              >
                Copy Short Link
              </Button>
            </Box>
          )}
        </Alert>
      </Snackbar>

      <Snackbar
        open={errorSnackbar}
        autoHideDuration={4000}
        onClose={() => setErrorSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setErrorSnackbar(false)}
          severity="error"
          sx={{ width: '100%' }}
        >
          Error saving QR code. Please try again.
        </Alert>
      </Snackbar>
    </>
  );
};

export default ToastAlerts;
