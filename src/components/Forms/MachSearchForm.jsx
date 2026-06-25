import { useEffect, useState } from 'react';
import FilterAltOffOutlined from '@mui/icons-material/FilterAltOffOutlined';
import MachInput from '../Inputs/MachInput.jsx';
import Stack from '@mui/joy/Stack';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import IconButton from '@mui/joy/IconButton';
import { useOutletContext } from 'react-router';

export default function MachSearchForm({ machines, setFilteredMachines }) {
  const { room } = useOutletContext();
  const [formData, setFormData] = useState({});

  useEffect(() => {
    setFilteredMachines(
      // if fileds are empty, it shows all rows
      machines.filter((row) => {
        // if the fields are undefined, they are set as empty strings
        const { machine = '', styleCode = '', articulo = '' } = formData;
        if (machine !== '') return row.MachCode === Number(machine);

        if (room !== 'HOMBRE' && styleCode !== '')
          return row.StyleCode.styleCode.includes(styleCode);

        if (articulo !== '') {
          const fullArt = Number(
            `${row.StyleCode.articulo}.${row.StyleCode.punto}`
          ).toFixed(2);
          return fullArt.includes(articulo);
        }

        return true;
      })
    );
  }, [formData, machines, setFilteredMachines]);
  // having machines in the dep array ensures live data

  return (
    <form
      onReset={() => {
        setFormData({});
      }}
    >
      <Stack direction='row' className='items-end gap-4'>
        <FormControl>
          <FormLabel>{room !== 'HOMBRE' ? 'Cadena' : 'Artículo'}</FormLabel>
          <Input
            type='text'
            placeholder='Buscar...'
            className='w-32'
            onChange={(e) => {
              if (room !== 'HOMBRE')
                setFormData({ ...formData, styleCode: e.target.value });
              else setFormData({ ...formData, articulo: e.target.value });
            }}
          />
        </FormControl>

        <MachInput formData={formData} setFormData={setFormData} />

        <IconButton
          color='danger'
          variant='soft'
          type='reset'
          disabled={Object.values(formData).every(
            (val) => val === undefined || val === ''
          )}
        >
          <FilterAltOffOutlined />
        </IconButton>
      </Stack>
    </form>
  );
}
