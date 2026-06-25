import Box from '@mui/joy/Box';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import FormHelperText from '@mui/joy/FormHelperText';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Stack from '@mui/joy/Stack';
import { useContext, useState } from 'react';
import { useConfig } from '../../ConfigContext.jsx';
import ColorDistrInputs from '../Inputs/ColorDistrInputs.jsx';
import { ErrorContext } from '../../Contexts.js';
import AddRounded from '@mui/icons-material/AddRounded';
import { ToastsContext } from '../../Contexts.js';

export default function NewArticuloForm({
  newArticuloData,
  setNewArticuloData,
}) {
  const { apiUrl } = useConfig();
  const { addToast } = useContext(ToastsContext);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(false); // 'color' || 'distr' || false
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e, articulo, articuloExists, talles) {
    e.preventDefault();
    setLoading(true);

    if (formData.colorDistr.length > 1) {
      const distrSum = formData.colorDistr.reduce(
        (acc, curr) => acc + curr.porcentaje,
        0
      );

      if (distrSum > 1) {
        // 100%
        setError('distr');
        return;
      }

      // validate colors are unique
      const colors = formData.colorDistr.map((color) => color.color);
      if (new Set(colors).size !== colors.length) {
        setError('color');
        return;
      }
    }

    if (!articuloExists) {
      try {
        const res = await fetch(`${apiUrl}/articulo/insert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ articulo, tipo: formData.tipo }),
        });

        const resData = await res.json();
        addToast({
          type: res.status === 500 ? 'danger' : 'success',
          message: resData.message,
        });
      } catch (err) {
        console.error(`[CLIENT] Error fetching /articulo/insert:`, err);
      }
    }

    if (formData.colorDistr) {
      try {
        const res = await fetch(`${apiUrl}/colorDistr/insertAllTalles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            articulo,
            talles,
            colorDistr: formData.colorDistr,
          }),
        });

        const resData = await res.json();
        addToast({
          type: res.status === 500 ? 'danger' : 'success',
          message: resData.message,
        });
      } catch (err) {
        console.error(`[CLIENT] Error fetching /colorDistr/insert:`, err);
      }
    }

    setLoading(false);
    setNewArticuloData((prev) => prev.slice(1)); // Remove first item
    setFormData({});
    setError(false);
  }

  return (
    <form
      key={newArticuloData.articulo}
      onSubmit={(e) => {
        handleSubmit(
          e,
          newArticuloData.articulo,
          newArticuloData.articuloExists,
          newArticuloData.talles
        );
      }}
      className='w-sm'
    >
      <Stack direction='column' className='gap-4'>
        {/* articulo and tipo */}
        <Stack direction='row' className='gap-4'>
          <FormControl>
            <FormLabel>Artículo</FormLabel>
            <Input
              value={newArticuloData.articulo}
              disabled
              className='w-24 grow'
            />
          </FormControl>

          <FormControl className='grow'>
            <FormLabel>Tipo (si aplica)</FormLabel>
            <Stack direction='row' className='gap-2'>
              <Input
                value={formData.tipo ?? newArticuloData.tipo ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tipo: e.target.value,
                  })
                }
                disabled={newArticuloData.tipo}
                type='text'
                slotProps={{ input: { maxLength: 1, pattern: '[#$%]' } }}
                className='w-10'
              />
              <FormHelperText className='mt-0'>
                <Stack direction='column' className='justify-between size-full'>
                  <Box>
                    <Typography level='body-sm'>
                      <Typography variant='soft' color='warning'>
                        #
                      </Typography>
                      &nbsp;si se divide a la mitad.&nbsp;
                    </Typography>
                  </Box>
                  <Box>
                    <Typography level='body-sm'>
                      <Typography variant='soft' color='warning'>
                        $
                      </Typography>
                      &nbsp;o&nbsp;
                      <Typography variant='soft' color='warning'>
                        %
                      </Typography>
                      &nbsp;si se duplica.
                    </Typography>
                  </Box>
                </Stack>
              </FormHelperText>
            </Stack>
          </FormControl>
        </Stack>

        {/* color distr */}
        <ErrorContext value={error}>
          <ColorDistrInputs
            formData={formData}
            setFormData={setFormData}
            articulo={newArticuloData.articulo}
          />
        </ErrorContext>
        {/* submit btn */}
        <Button
          type='submit'
          loading={loading}
          startDecorator={!loading && <AddRounded />}
        >
          Agregar artículo
        </Button>
      </Stack>
    </form>
  );
}
