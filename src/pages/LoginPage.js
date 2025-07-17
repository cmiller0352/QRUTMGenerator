import React, { useState } from 'react';
import { TextField, Button, Container, Typography, Box } from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';


const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else navigate('/dashboard');
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Box sx={{ boxShadow: 3, p: 4, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>Login</Typography>
        <form onSubmit={handleLogin}>
          <TextField
            label="Email"
            fullWidth
            margin="normal"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            fullWidth
            margin="normal"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
          <Button variant="contained" type="submit" fullWidth sx={{ mt: 2 }}>
            Login
          </Button>
        </form>
      </Box>
    </Container>
  );
};

export default LoginPage;
