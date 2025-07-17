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

  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) {
    setError(loginError.message);
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();

  // ✅ Check if a profile already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  // ✅ Only insert if profile doesn't exist
  if (!existingProfile) {
    const { error: insertError } = await supabase.from('profiles').insert([
      {
        id: user.id,
        email: user.email,
        role: 'outreach' // optional default; admin can update later
      }
    ]);

    if (insertError) {
      console.error('Profile insert error:', insertError);
    }
  }

  navigate('/dashboard');
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
