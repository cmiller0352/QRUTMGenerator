import React, { useState } from 'react';
import { Box, Button, Container, TextField, Typography } from '@mui/material';

const AuthGate = ({ children }) => {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  const correctPassword = 'rhpaccess2025'; // Change this as needed

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === correctPassword) {
      setUnlocked(true);
    } else {
      alert('Incorrect password');
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Container maxWidth="xs" sx={{ textAlign: 'center', boxShadow: 3, p: 4, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Typography variant="h5" gutterBottom>
          Welcome to Road Home Generator
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Please enter the access code to continue.
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="password"
            label="Access Code"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <Button fullWidth variant="contained" type="submit">
            Unlock
          </Button>
        </form>
      </Container>
    </Box>
  );
};

export default AuthGate;
