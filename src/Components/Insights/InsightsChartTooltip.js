import React from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value) || 0);

const InsightsChartTooltip = ({ active, label, payload, sections = [], sx = {} }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <Box
      sx={{
        minWidth: 180,
        maxWidth: 280,
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        border: '1px solid rgba(15, 23, 42, 0.07)',
        backgroundColor: 'rgba(255,255,255,0.50)',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.10)',
        backdropFilter: 'blur(8px)',
        ...sx,
      }}
    >
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <Stack spacing={0.5}>
          {payload.map((item) => (
            <Stack key={item.dataKey || item.name} direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {item.name || item.dataKey}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: item.color || 'text.primary' }}>
                {formatNumber(item.value)}
              </Typography>
            </Stack>
          ))}
        </Stack>
        {sections.filter(Boolean).map((section, index) => (
          <React.Fragment key={section.title || index}>
            <Divider />
            <Stack spacing={0.4}>
              {section.title ? (
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
                  {section.title}
                </Typography>
              ) : null}
              {section.rows.map((row) => (
                <Stack key={row.label} direction="row" justifyContent="space-between" spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    {row.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </React.Fragment>
        ))}
      </Stack>
    </Box>
  );
};

export default InsightsChartTooltip;
