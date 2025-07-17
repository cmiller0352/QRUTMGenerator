// src/Layout.js
import React from 'react';
import { Container, Tabs, Tab, Box, Button } from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useUser } from './Components/useUser';
import { supabase } from './utils/supabaseClient';





const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();

  const tabs = ['/', '/history', '/analytics', '/dashboard'];
  const currentTab = tabs.includes(location.pathname) ? tabs.indexOf(location.pathname) : 0;

  return (
    
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, newVal) => navigate(tabs[newVal])} centered>
          <Tab label="Generator" />
          <Tab label="History" />
          <Tab label="Analytics" />
          <Tab label="Dashboard" />
        </Tabs>
      </Box>
      <Box textAlign="right" sx={{ mt: 2 }}>
  {user ? (
    <Button onClick={async () => {
  await supabase.auth.signOut();
  navigate('/login');
}}>
  Logout
</Button>
  ) : (
    <Button component={Link} to="/login">Login</Button>
  )}
</Box>
      <Outlet />
    </Container>
  );
};

export default Layout;
