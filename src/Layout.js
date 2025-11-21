// src/Layout.js
import React from 'react';
import { Tabs, Tab, Box, Button } from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useUser } from './Components/useUser';
import { supabase } from './utils/supabaseClient';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useUser();

  // Routes that should hide the site chrome (tabs + welcome + auth buttons)
  const hideChrome =
    location.pathname.startsWith('/turkeydrop') ||
    location.pathname.startsWith('/whitechristmas');

  const tabs = ['/', '/history', '/analytics', '/dashboard'];
  const currentTab = tabs.includes(location.pathname) ? tabs.indexOf(location.pathname) : 0;

  if (hideChrome) {
    // Minimal wrapper for the public RSVP flow
    return (
      <Box sx={{ px: { xs: 2, md: 6 }, py: { xs: 2, md: 4 }, width: '100%' }}>
        <Box sx={{ width: '100%' }}>
          <Outlet />
        </Box>
      </Box>
    );
  }

  // Default app layout (with tabs + user area)
  return (
    <Box sx={{ px: 6, py: 4, width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, newVal) => navigate(tabs[newVal])} centered>
          <Tab label="Generator" />
          <Tab label="History" />
          <Tab label="Analytics" />
          <Tab label="Dashboard" />
        </Tabs>
      </Box>

      <Box textAlign="right" sx={{ mt: 2 }}>
        {profile && (
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '4px' }}>
            Welcome, {profile.full_name} ({profile.role})
          </div>
        )}
        {user ? (
          <Button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }}
          >
            Logout
          </Button>
        ) : (
          <Button component={Link} to="/login">Login</Button>
        )}
      </Box>

      {/* Force content to full-width grid */}
      <Box sx={{ width: '100%' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
