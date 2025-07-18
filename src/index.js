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
import DashboardPage from './pages/DashboardPage'; // also add this!
import AuthProvider from './Components/AuthProvider';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './Components/PrivateRoute';




const Root = () => (
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
  <Route index element={
    <PrivateRoute><App /></PrivateRoute>
  } />
  <Route path="history" element={
    <PrivateRoute><HistoryPage /></PrivateRoute>
  } />
  <Route path="analytics" element={
    <PrivateRoute><AnalyticsPage /></PrivateRoute>
  } />
  <Route path="dashboard" element={
    <PrivateRoute><DashboardPage /></PrivateRoute>
  } />
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
