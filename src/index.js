// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

import App from './App';
import HistoryPage from './pages/HistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import Layout from './Layout';
import DashboardPage from './pages/DashboardPage';
import ThankYouPage from './pages/turkeydrop/thankyou';
import AuthProvider from './Components/AuthProvider';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './Components/PrivateRoute';
import TurkeyDashboard from './pages/TurkeyDashboard'

// 👇 NEW: RSVP page route (public)
import TurkeyDropRSVP from './pages/turkeydrop';
import TurkeyDrop2025 from './pages/turkeydrop/turkeydrop2025';
import WhiteChristmas from './pages/whitechristmas/index.jsx';
import WhiteChristmasThankYou from './pages/whitechristmas/thankyou.jsx';

const Root = () => (
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route
                index
                element={
                  <PrivateRoute>
                    <App />
                  </PrivateRoute>
                }
              />

              <Route
                path="history"
                element={
                  <PrivateRoute>
                    <HistoryPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="analytics"
                element={
                  <PrivateRoute>
                    <AnalyticsPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="dashboard"
                element={
                  <PrivateRoute>
                    <DashboardPage />
                  </PrivateRoute>
                }
              />

              {/* 👇 Public RSVP route */}
              <Route path="turkeydrop" element={<TurkeyDropRSVP />} />
              <Route path="turkeydrop2025/thankyou" element={<ThankYouPage />} />
              <Route path="/turkeydrop2025" element={<TurkeyDrop2025 />} />
              <Route path="/whitechristmas" element={<WhiteChristmas />} />
              <Route
                path="/whitechristmas/thankyou"
                element={<WhiteChristmasThankYou />}
              />
              <Route path="/admin/rsvps" element={<TurkeyDashboard />} />

              {/* Auth */}
              <Route path="login" element={<LoginPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
