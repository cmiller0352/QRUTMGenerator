// src/Components/ToastAlerts.js
import React from 'react';
import { Snackbar, Alert } from '@mui/material';

const ToastAlerts = ({ openSnackbar, setOpenSnackbar, errorSnackbar, setErrorSnackbar }) => (
  <>
    <Snackbar
      open={openSnackbar}
      autoHideDuration={3000}
      onClose={() => setOpenSnackbar(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
        QR code saved to history!
      </Alert>
    </Snackbar>

    <Snackbar
      open={errorSnackbar}
      autoHideDuration={4000}
      onClose={() => setErrorSnackbar(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={() => setErrorSnackbar(false)} severity="error" sx={{ width: '100%' }}>
        Error saving QR code. Please try again.
      </Alert>
    </Snackbar>
  </>
);

export default ToastAlerts;
