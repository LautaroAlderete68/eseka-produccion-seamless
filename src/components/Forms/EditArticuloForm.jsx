import { useContext, useState } from 'react';
import Box from '@mui/joy/Box';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import FormHelperText from '@mui/joy/FormHelperText';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Stack from '@mui/joy/Stack';
import { useConfig } from '../../ConfigContext.jsx';
import ColorDistrInputs from '../Inputs/ColorDistrInputs.jsx';
import { ErrorContext } from '../../Contexts.js';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import { ToastsContext } from '../../Contexts.js';

export default function EditArticuloForm({ articuloData }) {
  const { apiUrl } = useConfig();
  const { addToast } = useContext(ToastsContext);
  const [formData, setFormData] = useState({
    ...articuloData,
    allTalles: false,
  });
  const [error, setError] = useState(false); // 'color' || 'distr' || false
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    // validate colorDistr
    if (formData.colorDistr.length > 1) {
      // can't be greater than 100%
      const distrSum = formData.colorDistr.reduce(
        (acc, curr) => acc + curr.porcentaje,
        0
      );

      if (distrSum > 1) {
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

    if (formData.tipo !== articuloData.tipo) {
      // edit articulo
      try {
        const res = await fetch(`${apiUrl}/articulo/updateTipo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            articulo: formData.articulo,
            tipo: formData.tipo,
          }),
        });

        const resData = await res.json();
        addToast({
          type: res.status === 500 ? 'danger' : 'success',
          message: resData.message,
        });
      } catch (err) {
        console.error(`[CLIENT] Error fetching /articulo/updateTipo:`, err);
      }
    }

    if (!colorDistrEqual(formData.colorDistr, articuloData.colorDistr)) {
      try {
        let insertRes;
        if (!formData.allTalles) {
          // insert for single talle
          insertRes = await fetch(`${apiUrl}/colorDistr/insert`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              articulo: formData.articulo,
              talle: formData.talle,
              colorDistr: formData.colorDistr, // [{color, porcentaje}]
            }),
          });
        } else {
          // get all talles for current colorDistr
          const res = await fetch(
            `${apiUrl}/articulo/${articuloData.articulo}/currentColorDistr`
          );
          const data = await res.json();
          const talles = [...new Set(data.map((row) => row.Talle))];

          // insert for all talles
          insertRes = await fetch(`${apiUrl}/colorDistr/insertAllTalles`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              articulo: formData.articulo,
              talles,
              colorDistr: formData.colorDistr, // [{color, porcentaje}]
            }),
          });
        }

        const data = await insertRes.json();
        addToast({
          type: insertRes.status === 500 ? 'danger' : 'success',
          message: data.message,
        });
      } catch (err) {
        console.error('[CLIENT] Error fetching /colorDistr/insert:', err);
      }
    }

    setError(false);
    setLoading(false);
    window.location.reload();
  }

  return (
    <form
      key={articuloData.articulo}
      onSubmit={(e) => {
        handleSubmit(e);
      }}
      className='w-sm'
    >
      <Stack direction='column' className='gap-4'>
        {/* articulo and tipo */}
        <Stack direction='row' className='gap-4'>
          <FormControl>
            <FormLabel>Artículo</FormLabel>
            <Input
              value={articuloData.articulo}
              disabled
              className='w-24 grow'
            />
          </FormControl>

          <FormControl className='grow'>
            <FormLabel>Tipo (si aplica)</FormLabel>
            <Stack direction='row' className='gap-2'>
              <Input
                value={formData.tipo ?? articuloData.tipo ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tipo: e.target.value,
                  })
                }
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
            articulo={formData.articulo}
          />
        </ErrorContext>
        {/* submit btn */}
        <Button
          type='submit'
          loading={loading}
          startDecorator={!loading && <SaveOutlined />}
        >
          Guardar cambios
        </Button>
      </Stack>
    </form>
  );
}

function colorDistrEqual(a, b) {
  if (a.length !== b.length) return false;
  // Ensure color is always a string for sorting
  const safeColor = (x) => (x.color ?? '').toString();
  const aSorted = [...a].sort((x, y) =>
    safeColor(x).localeCompare(safeColor(y))
  );
  const bSorted = [...b].sort((x, y) =>
    safeColor(x).localeCompare(safeColor(y))
  );
  return aSorted.every(
    (item, i) =>
      safeColor(item) === safeColor(bSorted[i]) &&
      item.porcentaje === bSorted[i].porcentaje
  );
}
