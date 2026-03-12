import React from 'react';
import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

const formatTimestamp = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const firstValue = (row, keys, fallback = '-') => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value);
  }
  return fallback;
};

const deviceLabel = (row) => firstValue(row, ['device_type', 'device'], 'Unknown');
const locationLabel = (row) => firstValue(row, ['region_country', 'region', 'country'], '-');

const InsightsRecentActivityTable = ({ data }) => (
  <Paper elevation={3} sx={{ p: 3 }}>
    <Typography variant="h6" gutterBottom>
      Recent Activity
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Latest scans flowing through the platform.
    </Typography>
    {data.length === 0 ? (
      <Typography variant="body2" color="text.secondary">
        No recent activity is available for this range.
      </Typography>
    ) : null}
    <TableContainer
      sx={{
        minWidth: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.72)',
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>When</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Short Code</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Campaign</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Medium</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Device</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Region/Country</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={`${firstValue(row, ['short_code', 'code'], 'scan')}-${firstValue(row, ['created_at', 'timestamp'], index)}`}
              sx={{
                '&:nth-of-type(odd)': {
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                },
                transition: 'background-color 120ms ease',
                '&:hover': {
                  backgroundColor: 'rgba(0, 102, 51, 0.06)',
                },
              }}
            >
              <TableCell>{formatTimestamp(firstValue(row, ['created_at', 'timestamp'], ''))}</TableCell>
              <TableCell>{firstValue(row, ['short_code', 'code'])}</TableCell>
              <TableCell>{firstValue(row, ['utm_campaign', 'campaign'])}</TableCell>
              <TableCell>{firstValue(row, ['utm_source', 'source'])}</TableCell>
              <TableCell>{firstValue(row, ['utm_medium', 'medium'])}</TableCell>
              <TableCell>
                <Chip
                  label={deviceLabel(row)}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    backgroundColor: 'rgba(0, 102, 51, 0.08)',
                    border: '1px solid rgba(0, 102, 51, 0.18)',
                  }}
                />
              </TableCell>
              <TableCell>{locationLabel(row)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

export default InsightsRecentActivityTable;
