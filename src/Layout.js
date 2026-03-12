// src/Layout.js
import React from 'react';
import { Tabs, Tab, Box, Button } from '@mui/material';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useUser } from './Components/useUser';
import { supabase } from './utils/supabaseClient';

const navItems = [
  { label: 'Generator', path: '/' },
  { label: 'History', path: '/history' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Insights', path: '/insights' },
  { label: 'Legacy Dashboard', path: '/dashboard' },
  { label: 'RSVP Admin', path: '/admin/rsvps' },
];

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useUser();

  const currentTab = navItems.some(({ path }) => path === location.pathname)
    ? location.pathname
    : false;

  return (
    <Box sx={{ px: 6, py: 4, width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newVal) => navigate(newVal)}
          centered
        >
          {navItems.map(({ label, path }) => (
            <Tab key={path} label={label} value={path} />
          ))}
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
          <Button component={Link} to="/login">
            Login
          </Button>
        )}
      </Box>

      <Box sx={{ width: '100%' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export const PublicLayout = () => <Outlet />;

export default AppLayout;
