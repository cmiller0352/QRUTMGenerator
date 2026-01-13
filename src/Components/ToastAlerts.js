// src/Components/ToastAlerts.js
import React from 'react';
import { Snackbar, Alert, Box, Typography, Button } from '@mui/material';

const ToastAlerts = ({
  openSnackbar,
  setOpenSnackbar,
  errorSnackbar,
  setErrorSnackbar,
  shortCode,
  errorMessage = 'Error saving QR code. Please try again.',
}) => {
  const shortLink = shortCode
    ? `https://www.roadhome.io/${shortCode}`
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
          sx={{
            width: '100%',
            backgroundColor: '#e6ffed', // pale green
            color: '#1b1b1b',            // very dark gray (almost black)
            border: '1px solid #c2e4ca',
            boxShadow: 2,
          }}
        >
          <strong>QR code saved!</strong>
          {shortLink && (
            <Box mt={1}>
              <Typography variant="caption" display="block" sx={{ color: '#1b1b1b' }}>
                Short link:
              </Typography>
              <Typography
                variant="body2"
                component="a"
                href={shortLink}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textDecoration: 'underline', color: '#1b1b1b' }}
              >
                {shortLink}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigator.clipboard.writeText(shortLink)}
                sx={{
                  ml: 1,
                  color: '#1b1b1b',
                  borderColor: '#1b1b1b',
                  '&:hover': {
                    backgroundColor: '#d6f5e3',
                    borderColor: '#1b1b1b',
                  },
                }}
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
          sx={{
            width: '100%',
            backgroundColor: '#ffe6e6',
            color: '#1b1b1b',
            border: '1px solid #f5c2c7',
            boxShadow: 2,
          }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ToastAlerts;
