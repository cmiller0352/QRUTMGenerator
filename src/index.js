// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

import App from './App';
import HistoryPage from './pages/HistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AppLayout, { PublicLayout } from './Layout';
import DashboardPage from './pages/DashboardPage';
import ThankYouPage from './pages/turkeydrop/thankyou';
import AuthProvider from './Components/AuthProvider';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './Components/PrivateRoute';
import TurkeyDashboard from './pages/turkeydrop/turkeydrop2025/TurkeyDashboard'
import CheckinMode from './pages/turkeydrop/turkeydrop2025/CheckinMode'

// 👇 NEW: RSVP page route (public)
import TurkeyDropRSVP from './pages/turkeydrop';
import TurkeyDrop2025 from './pages/turkeydrop/turkeydrop2025';
import WhiteChristmas from './pages/whitechristmas/index.jsx';
import WhiteChristmasThankYou from './pages/whitechristmas/thankyou.jsx';
import MailingListSignup from './pages/signup';
import SignupThankYou from './pages/signup/thankyou';
import OpenHouseThankYou from './pages/openhouse/thankyou';
import OpenHouseRsvpPage from './pages/openhouse';
import MstWebinarSeries2026Page from './pages/mst-webinar-series-2026';
import MstWebinarSeries2026ThankYou from './pages/mst-webinar-series-2026/thankyou';
import ChowCall from './pages/sd/ChowCall';
import SaluteSocialJimmys from './pages/sd/SaluteSocialJimmys';
import SaluteSocialMcps from './pages/sd/SaluteSocialMcps';
import SaluteSocialCaliforniaWildAles from './pages/sd/SaluteSocialCaliforniaWildAles';
import SanDiegoSaluteAndSocial from './pages/sd/SanDiegoSaluteAndSocial';
import SdThankYou from './pages/sd/ThankYou';

const Root = () => (
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<AppLayout />}>
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

              <Route path="admin/rsvps" element={<TurkeyDashboard />} />
              <Route path="admin/checkin" element={<CheckinMode />} />
            </Route>

            <Route element={<PublicLayout />}>
              <Route path="/turkeydrop" element={<TurkeyDropRSVP />} />
              <Route path="/turkeydrop2025/thankyou" element={<ThankYouPage />} />
              <Route path="/turkeydrop2025" element={<TurkeyDrop2025 />} />
              <Route path="/whitechristmas" element={<WhiteChristmas />} />
              <Route
                path="/whitechristmas/thankyou"
                element={<WhiteChristmasThankYou />}
              />
              <Route path="/signup" element={<MailingListSignup />} />
              <Route path="/signup/thankyou" element={<SignupThankYou />} />
              <Route path="/open-house" element={<OpenHouseRsvpPage />} />
              <Route path="/open-house/thankyou" element={<OpenHouseThankYou />} />
              <Route
                path="/mst-webinar-series-2026"
                element={<MstWebinarSeries2026Page />}
              />
              <Route
                path="/mst-webinar-series-2026/thankyou"
                element={<MstWebinarSeries2026ThankYou />}
              />
              <Route path="/sd" element={<Navigate to="/sd/chow-call" replace />} />
              <Route path="/sd/chow-call" element={<ChowCall />} />
              <Route
                path="/sandiego-salute-and-social"
                element={<SanDiegoSaluteAndSocial />}
              />
              <Route
                path="/sd/salute-social-jimmys"
                element={<SaluteSocialJimmys />}
              />
              <Route path="/sd/salute-social-mcps" element={<SaluteSocialMcps />} />
              <Route
                path="/sd/salute-social-california-wild-ales"
                element={<SaluteSocialCaliforniaWildAles />}
              />
              <Route path="/sd/thank-you" element={<SdThankYou />} />
              <Route path="/login" element={<LoginPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
