import Select from '@mui/joy/Select';
import IconButton from '@mui/joy/IconButton';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import { useContext, useRef } from 'react';
import { ErrorContext } from '../../Contexts.js';

export default function SelectClearable({
  value,
  setValue,
  setFormData,
  listboxOpen,
  onListboxOpen,
  children,
  className = '',
  ...props
}) {
  const error = useContext(ErrorContext);
  const action = useRef(null);

  return (
    <Select
      action={action}
      value={value}
      onChange={(e, newValue) => {
        setValue(newValue);
        setFormData(newValue);
      }}
      listboxOpen={listboxOpen}
      onListboxOpenChange={onListboxOpen}
      color={error === 'color' ? 'danger' : ''}
      className={`border border-solid border-[var(--joy-palette-neutral-outlinedBorder)] ${className}`}
      {...props}
      {...(value && {
        // display the button and remove select indicator
        // when user has selected a value
        endDecorator: (
          <IconButton
            variant='plain'
            color='neutral'
            onMouseDown={(event) => {
              // don't open the popup when clicking on this button
              event.stopPropagation();
            }}
            onClick={() => {
              setValue(null);
              setFormData(''); // can't be null for requests
              action.current?.focusVisible();
            }}
            sx={{ color: 'inherit' }}
          >
            <CloseOutlined />
          </IconButton>
        ),
        indicator: null,
      })}
    >
      {children}
    </Select>
  );
}
