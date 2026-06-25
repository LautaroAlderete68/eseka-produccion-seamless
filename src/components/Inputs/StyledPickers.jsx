import { styled } from '@mui/joy/styles';
import Paper from '@mui/material/Paper';
import {
  DatePicker,
  DateTimePicker,
  PickersTextField,
} from '@mui/x-date-pickers';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';

const JoyPickersTextField = styled(PickersTextField)({
  boxShadow: 'var(--joy-shadowRing)',
  '& *': {
    transition: 'none !important',
    transform: 'none !important',
    fontFamily: 'var(--joy-fontFamily-body) !important',
  },
  '& label': {
    fontSize: 'var(--joy-fontSize-sm)',
    margin: '0 0 0.375rem 0',
    lineHeight: 'var(--joy-lineHeight-sm)',
    color: 'var(--joy-palette-text-primary)',
    position: 'relative',
  },
  '& span': {
    color: 'var(--joy-palette-text-secondary)',
    lineHeight: 'var(--joy-lineHeight-md)',
  },
  '& button': {
    color: 'var(--joy-palette-text-icon)',
    fontSize: 'var(--joy-fontSize-xl2)',
    borderRadius: 'var(--joy-radius-sm)',
    padding: '4px',
    marginRight: '-8px',
    '&:hover': {
      backgroundColor: 'var(--joy-palette-primary-plainHoverBg)',
    },
  },
  '& .MuiPickersInputBase-root': {
    minHeight: '2.25rem',
    paddingInline: '0.75rem',
    fontSize: 'var(--joy-fontSize-md)',
    backgroundColor: 'var(--joy-palette-background-surface)',
    border: '1px solid var(--joy-palette-neutral-outlinedBorder)',
    borderRadius: 'var(--joy-radius-sm)',
    '&.Mui-focused::before': {
      boxSizing: 'border-box',
      content: '""',
      display: 'block',
      position: 'absolute',
      pointerEvents: 'none',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 1,
      borderRadius: 'var(--joy-radius-sm)',
      margin: 'calc(1px * -1)',
      borderColor: 'var(--joy-palette-focusVisible)',
      boxShadow:
        'inset 0 0 0 calc(1 * var(--joy-focus-thickness)) var(--joy-palette-focusVisible)',
    },
  },
  '& .MuiPickersOutlinedInput-notchedOutline': {
    display: 'none',
  },
  '& .MuiPickersOutlinedInput-root.Mui-disabled *': {
    pointerEvents: 'none',
    cursor: 'default',
    color: 'var(--joy-palette-neutral-outlinedDisabledColor)',
    borderColor: 'var(--joy-palette-neutral-outlinedDisabledBorder)',
  },
  '& .MuiInputLabel-root': {
    '&.Mui-disabled, &.Mui-focused': {
      color: 'var(--joy-palette-text-primary)',
    },
  },
  '& .MuiPickersSectionList-root': {
    padding: '0',
    width: 'fit-content',
  },
  '& .MuiTouchRipple-root': {
    display: 'none',
  },
});

const JoyPickersCalendar = styled(Paper)({
  borderRadius: 'var(--joy-radius-sm)',
  border: '1px solid var(--joy-palette-neutral-outlinedBorder)',
  backgroundColor: 'var(--joy-palette-background-surface)',
  color: 'var(--joy-palette-text-primary)',
  '& *': {
    fontFamily: 'var(--joy-fontFamily-body)!important',
  },
  // Week days header (L M M J V S D)
  '& .MuiDayCalendar-weekDayLabel': {
    color: 'var(--joy-palette-text-secondary)',
  },
  // Calendar header (Month, Year)
  '& .MuiPickersCalendarHeader-label': {
    color: 'var(--joy-palette-text-primary)',
    fontWeight: 'var(--joy-fontWeight-md)',
  },
  // Navigation icons (left / right arrows)
  '& .MuiIconButton-root': {
    color: 'var(--joy-palette-text-primary)',
    '&:hover': {
      backgroundColor: 'var(--joy-palette-neutral-hoverBg)',
    },
    '&.Mui-disabled': {
      color: 'var(--joy-palette-neutral-outlinedDisabledColor)',
    },
  },
  // Calendar days
  '& .MuiPickersDay-root': {
    color: 'var(--joy-palette-text-primary)',
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: 'var(--joy-palette-neutral-hoverBg)',
    },
    '&.Mui-selected': {
      backgroundColor: 'var(--joy-palette-primary-solidBg) !important',
      color: 'var(--joy-palette-primary-solidColor) !important',
      '&:hover': {
        backgroundColor: 'var(--joy-palette-primary-solidHoverBg) !important',
      },
    },
    '&.MuiPickersDay-today': {
      borderColor: 'var(--joy-palette-primary-outlinedBorder)',
      color: 'var(--joy-palette-primary-plainColor)',
      '&.Mui-selected': {
        color: 'var(--joy-palette-primary-solidColor) !important',
      },
    },
    '&.Mui-disabled': {
      color: 'var(--joy-palette-neutral-outlinedDisabledColor)',
    },
  },
  // Year selector
  '& .MuiPickersYear-yearButton': {
    color: 'var(--joy-palette-text-primary)',
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: 'var(--joy-palette-neutral-hoverBg)',
    },
    '&.Mui-selected': {
      backgroundColor: 'var(--joy-palette-primary-solidBg) !important',
      color: 'var(--joy-palette-primary-solidColor) !important',
      '&:hover': {
        backgroundColor: 'var(--joy-palette-primary-solidHoverBg) !important',
      },
    },
  },
  // Digital Clock (Time Picker)
  '& .MuiDigitalClock-list': {
    backgroundColor: 'var(--joy-palette-background-surface)',
  },
  '& .MuiDigitalClock-item': {
    color: 'var(--joy-palette-text-primary)',
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: 'var(--joy-palette-neutral-hoverBg)',
    },
    '&.Mui-selected': {
      backgroundColor: 'var(--joy-palette-primary-solidBg) !important',
      color: 'var(--joy-palette-primary-solidColor) !important',
    },
  },
  // Multi-section clock (if used)
  '& .MuiMultiSectionDigitalClock-root': {
    backgroundColor: 'var(--joy-palette-background-surface)',
    borderTop: '1px solid var(--joy-palette-neutral-outlinedBorder)',
  },
  '& .MuiMultiSectionDigitalClockSection-item': {
    color: 'var(--joy-palette-text-primary)',
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: 'var(--joy-palette-neutral-hoverBg)',
    },
    '&.Mui-selected': {
      backgroundColor: 'var(--joy-palette-primary-solidBg) !important',
      color: 'var(--joy-palette-primary-solidColor) !important',
    },
  },
});

function StyledDatePicker({ ...props }) {
  return (
    <DatePicker
      {...props}
      slots={{
        textField: JoyPickersTextField,
        desktopPaper: JoyPickersCalendar,
        openPickerIcon: CalendarMonthOutlined,
      }}
    />
  );
}

function StyledDateTimePicker({ ...props }) {
  return (
    <DateTimePicker
      {...props}
      slots={{
        textField: JoyPickersTextField,
        desktopPaper: JoyPickersCalendar,
        openPickerIcon: CalendarMonthOutlined,
      }}
    />
  );
}

export { StyledDatePicker, StyledDateTimePicker };
