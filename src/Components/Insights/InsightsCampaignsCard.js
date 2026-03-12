import React, { useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  LinearProgress,
  Typography,
} from '@mui/material';

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value) || 0);

const formatPct = (value) => `${Number(value || 0).toFixed(1)}%`;

const InsightsCampaignsCard = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const topRows = data.slice(0, 6);
  const total = topRows.reduce((sum, item) => sum + (Number(item.count) || 0), 0);

  return (
    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h6">Campaign Leaderboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Ranked by scan volume for the selected range.
          </Typography>
        </Stack>
        {topRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No campaign data is available for this range.
          </Typography>
        ) : null}
        {topRows.map((campaign, index) => {
          const percent = total > 0 ? ((Number(campaign.count) || 0) / total) * 100 : 0;

          return (
            <Box
              key={`${campaign.label}-${index}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              sx={{
                px: 1,
                py: 0.75,
                mx: -1,
                borderRadius: 2,
                transition: 'background-color 120ms ease, transform 120ms ease',
                backgroundColor: hoveredIndex === index ? 'rgba(0, 102, 51, 0.05)' : 'transparent',
                transform: hoveredIndex === index ? 'translateX(2px)' : 'translateX(0)',
              }}
            >
              <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mb: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {campaign.label || 'Unattributed'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {formatNumber(campaign.count)} • {formatPct(percent)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.max(percent, total > 0 ? 4 : 0)}
                sx={{
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: 'rgba(0, 102, 51, 0.12)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 999,
                    backgroundColor: hoveredIndex === index ? '#0a7a40' : index === 0 ? '#006633' : '#0f8a4d',
                  },
                }}
              />
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
};

export default InsightsCampaignsCard;
