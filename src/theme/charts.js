import {
  axisClasses,
  legendClasses,
  chartsTooltipClasses,
  chartsGridClasses,
} from '@mui/x-charts';

/* eslint-disable import/prefer-default-export */
export const getChartsCustomizations = (theme) => ({
  MuiChartsAxis: {
    styleOverrides: {
      root: {
        [`& .${axisClasses.line}`]: {
          stroke: theme.vars.palette.divider,
        },
        [`& .${axisClasses.tick}`]: { stroke: theme.vars.palette.divider },
        [`& .${axisClasses.tickLabel}`]: {
          fill: theme.vars.palette.text.secondary,
          fontWeight: theme.vars.fontWeight.md,
        },
      },
    },
  },
  MuiChartsTooltip: {
    styleOverrides: {
      root: {
        [`& .${chartsTooltipClasses.mark}`]: {
          ry: 6,
          boxShadow: 'none',
        },
        [`& .${chartsTooltipClasses.table}`]: {
          borderRadius: theme.vars.radius.sm,
          background: theme.vars.palette.background.surface,
          color: theme.vars.palette.text.primary,
        },
        [`& .${chartsTooltipClasses.cell}`]: {
          color: theme.vars.palette.text.primary,
        },
        [`& .${chartsTooltipClasses.labelCell}`]: {
          color: theme.vars.palette.text.secondary,
        },
        [`& .${chartsTooltipClasses.valueCell}`]: {
          color: theme.vars.palette.text.primary,
          fontWeight: theme.vars.fontWeight.lg,
        },
        [`& .${chartsTooltipClasses.paper}`]: {
          background: theme.vars.palette.background.level1,
          borderColor: theme.vars.palette.divider,
        },
      },
    },
  },
  MuiChartsAxisTooltipContent: {
    styleOverrides: {
      root: {
        borderRadius: theme.vars.radius.sm,
        background: theme.vars.palette.background.surface,
        borderColor: theme.vars.palette.divider,
        color: theme.vars.palette.text.primary,
        [`& .MuiChartsAxisTooltipContent-cell`]: {
          color: theme.vars.palette.text.primary,
        },
        [`& .MuiChartsAxisTooltipContent-labelCell`]: {
          color: theme.vars.palette.text.secondary,
        },
        [`& .MuiChartsAxisTooltipContent-valueCell`]: {
          color: theme.vars.palette.text.primary,
          fontWeight: theme.vars.fontWeight.lg,
        },
        [`& .MuiChartsAxisTooltipContent-axisValueCell`]: {
          color: theme.vars.palette.text.primary,
          fontWeight: theme.vars.fontWeight.lg,
        },
      },
    },
  },
  MuiChartsLegend: {
    styleOverrides: {
      root: {
        [`& .${legendClasses.mark}`]: {
          ry: 6,
        },
        [`& .${legendClasses.label}`]: {
          fill: theme.vars.palette.text.primary,
        },
      },
    },
  },
  MuiChartsGrid: {
    styleOverrides: {
      root: {
        [`& .${chartsGridClasses.line}`]: {
          stroke: theme.vars.palette.divider,
          strokeDasharray: '4 2',
          strokeWidth: 0.8,
        },
      },
    },
  },
});
