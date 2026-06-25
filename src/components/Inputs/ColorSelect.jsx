import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Option from '@mui/joy/Option';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { useEffect, useState } from 'react';
import { useConfig } from '../../ConfigContext.jsx';
import SelectClearable from './SelectClearable.jsx';
import AddColorBtn from './AddColorBtn.jsx';
import Warning from '@mui/icons-material/Warning';

let apiUrl;

export default function ColorSelect({
  onChange,
  inheritedColors,
  showLabel = true,
  allowAdd = false,
  required = false,
  className = '',
  val = null,
  warning = null,
}) {
  apiUrl = useConfig().apiUrl;
  const [value, setValue] = useState(val);
  const [selectOpen, setSelectOpen] = useState(false);
  const [colors, setColors] = useState(
    Array.isArray(inheritedColors) ? inheritedColors : []
  );

  useEffect(() => {
    let ignore = false;
    if (Array.isArray(inheritedColors)) {
      setColors(inheritedColors);
    } else {
      fetch(`${apiUrl}/colors`)
        .then((res) => res.json())
        .then((data) => {
          if (!ignore) setColors(data);
        })
        .catch((err) => console.error('[CLIENT] Error fetching /colors:', err));
    }
    return () => {
      ignore = true;
    };
  }, [inheritedColors]);

  useEffect(() => {
    setValue(val);
  }, [val]);

  const selectedColor = colors.find((c) => c.Id === value);
  const selectStyle = selectedColor && selectedColor.Hex ? {
    backgroundColor: selectedColor.Hex,
    color: selectedColor.WhiteText ? 'white' : 'black',
    fontWeight: 'bold',
  } : {};

  return (
    <FormControl className={`min-w-56 ${className}`} required={required}>
      {showLabel && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <FormLabel sx={{ mb: 0 }}>Color</FormLabel>
          {warning && (
            <Typography
              level="body-xs"
              color="warning"
              variant="soft"
              startDecorator={<Warning sx={{ fontSize: '1rem' }} />}
              sx={{ px: 1, py: 0.25, borderRadius: 'xs' }}
            >
              {warning}
            </Typography>
          )}
        </Stack>
      )}
      <SelectClearable
        value={value}
        setValue={setValue}
        setFormData={onChange}
        placeholder='Seleccione...'
        required={required}
        listboxOpen={selectOpen}
        onListboxOpen={setSelectOpen}
        style={selectStyle}
      >
        {colors
          .slice()
          .sort((a, b) => {
            const aIsDiseño = (a.Color || '').toUpperCase().startsWith('DISEÑO');
            const bIsDiseño = (b.Color || '').toUpperCase().startsWith('DISEÑO');
            if (aIsDiseño && !bIsDiseño) return 1;
            if (!aIsDiseño && bIsDiseño) return -1;
            if (aIsDiseño && bIsDiseño) {
              const getDesignNumber = (str) => {
                const match = str.match(/DISEÑO\s+(\d+)/i);
                return match ? parseInt(match[1], 10) : null;
              };
              const aNum = getDesignNumber(a.Color || '');
              const bNum = getDesignNumber(b.Color || '');
              if (aNum !== null && bNum !== null) {
                return aNum - bNum;
              }
            }
            return (a.Color || '').localeCompare(b.Color || '');
          })
          .map((color) => (
            <Option
              key={color.Id}
              value={color.Id}
              label={color.Color}
              style={{
                backgroundColor: color.Hex || 'transparent',
                color: color.Hex ? (color.WhiteText ? 'white' : 'black') : 'inherit',
                fontWeight: 'bold',
              }}
            >
              {color.Color}
            </Option>
          ))}

        {allowAdd && (
          <AddColorBtn
            setSelectVal={setValue}
            setSelectOpen={setSelectOpen}
            setFormData={onChange}
          />
        )}
      </SelectClearable>
    </FormControl>
  );
}
