// src/Layout.js
import React from 'react';
import { Container, Tabs, Tab, Box } from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = ['/', '/history', '/analytics'];
  const currentTab = tabs.includes(location.pathname) ? tabs.indexOf(location.pathname) : 0;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, newVal) => navigate(tabs[newVal])} centered>
          <Tab label="Generator" />
          <Tab label="History" />
          <Tab label="Analytics" />
        </Tabs>
      </Box>
      <Outlet />
    </Container>
  );
};

export default Layout;
