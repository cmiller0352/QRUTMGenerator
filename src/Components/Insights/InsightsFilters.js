import React from 'react';
import { Button, ButtonGroup, Paper, Stack, Typography } from '@mui/material';

const InsightsFilters = ({ options, selectedRange, onChange }) => (
  <Paper elevation={2} sx={{ p: 2.5 }}>
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', md: 'center' }}
    >
      <div>
        <Typography variant="h6">Date Range</Typography>
        <Typography variant="body2" color="text.secondary">
          Change the reporting window to refresh metrics and charts.
        </Typography>
      </div>

      <ButtonGroup
        variant="outlined"
        aria-label="Insights date range selector"
        sx={{
          flexWrap: 'wrap',
          gap: 1,
          '& .MuiButtonGroup-grouped': {
            borderRadius: '8px !important',
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {options.map((option) => {
          const isSelected = option.value === selectedRange;
          return (
            <Button
              key={option.value}
              variant={isSelected ? 'contained' : 'outlined'}
              color={isSelected ? 'primary' : 'inherit'}
              onClick={() => onChange(option.value)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {option.label}
            </Button>
          );
        })}
      </ButtonGroup>
    </Stack>
  </Paper>
);

export default InsightsFilters;
