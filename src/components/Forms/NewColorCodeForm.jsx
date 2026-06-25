import { useContext, useEffect, useState } from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormHelperText from '@mui/joy/FormHelperText';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { useConfig } from '../../ConfigContext.jsx';
import FloatingLabelInput from '../Inputs/FloatingLabelInput.jsx';
import ColorSelect from '../Inputs/ColorSelect.jsx';
import AddOutlined from '@mui/icons-material/AddOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import { ToastsContext } from '../../Contexts.js';
import DialogActions from '@mui/joy/DialogActions';
import DialogContent from '@mui/joy/DialogContent';
import DialogTitle from '@mui/joy/DialogTitle';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import WarningOutlined from '@mui/icons-material/WarningOutlined';
import Warning from '@mui/icons-material/Warning';
import Divider from '@mui/joy/Divider';

let apiUrl;

export default function NewColorCodeForm({ newColorCode, setNewColorCodes }) {
  apiUrl = useConfig().apiUrl;
  const { addToast } = useContext(ToastsContext);
  const [colors, setColors] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [specialArticles, setSpecialArticles] = useState(['2398', '2621', '2622', '3352', '3356', '3668', '3354']);

  useEffect(() => {
    let ignore = false;
    fetch(`${apiUrl}/colors`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setColors(data);
      })
      .catch((err) => console.error('[CLIENT] Error fetching /colors:', err));

    fetch(`${apiUrl}/articulos-especiales`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          setSpecialArticles(data.map(String));
        }
      })
      .catch((err) => console.error('[CLIENT] Error fetching special articles:', err));

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!newColorCode || colors.length === 0) return;

    const artBase = String(newColorCode.StyleCode.articulo).split('.')[0].trim();
    const isSpecial = specialArticles.includes(artBase);
    const code = String(newColorCode.StyleCode.color || '').trim();

    let autoPunto = '';
    let autoColorId = null;

    // Extrae cualquier número de dígitos ignorando el prefijo opcional 'D' o 'd'
    const match = code.match(/^[Dd]?(\d+)$/);
    if (match) {
      const numVal = parseInt(match[1], 10);

      if (isSpecial) {
        // En los especiales: si es menor a 10 (ej: D1 -> 1, D2 -> 2), se le agrega un 0 adelante (01, 02)
        if (numVal < 10) {
          autoPunto = '0' + numVal;
        } else {
          autoPunto = String(numVal);
        }
      } else {
        // En los comunes: D2 quiere decir .2
        autoPunto = String(numVal);
      }

      const designName = `DISEÑO ${numVal}`;
      const matchedColor = colors.find(
        (c) => (c.Color || '').toUpperCase() === designName.toUpperCase()
      );
      if (matchedColor) {
        autoColorId = matchedColor.Id;
      }
    }

    setFormData({
      punto: autoPunto,
      tipo: '',
      color: autoColorId,
      code: code,
    });
  }, [newColorCode, colors, specialArticles]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const data = {
      ...formData,
      articulo: newColorCode.StyleCode.articulo,
      punto: formData.punto ?? newColorCode.StyleCode.punto,
      tipo: null, // Dejar "Tipo" vacio siempre
      talle: newColorCode.StyleCode.talle,
      styleCode: newColorCode.StyleCode.styleCode,
    };

    try {
      const res = await fetch(`${apiUrl}/colorCodes/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      addToast({
        type: res.status === 500 ? 'danger' : 'success',
        message: resData.message,
      });
    } catch (err) {
      console.error('[CLIENT] Error fetching /colorCodes/insert:', err);
    }
    const codes = JSON.parse(localStorage.getItem('newColorCodes'));
    codes.pop();
    localStorage.setItem('newColorCodes', JSON.stringify(codes));
    setNewColorCodes(codes);
    setFormData({});
    setLoading(false);

    if (codes.length === 0) {
      window.location.reload();
    }
  }

  function handleDelete() {
    setDeleteOpen(false);
    const codes = JSON.parse(localStorage.getItem('newColorCodes'));
    codes.pop();
    localStorage.setItem('newColorCodes', JSON.stringify(codes));
    setNewColorCodes(codes);
    setFormData({});

    addToast({
      type: 'success',
      message: `Código de color ${newColorCode.StyleCode.styleCode} descartado.`,
    });
  }

  return (
    <>
      <form
        key={newColorCode.MachCode}
        onSubmit={(e) => handleSubmit(e)}
        className='w-xs'
      >
        <Stack direction='column' className='gap-4'>
          {specialArticles.includes(String(newColorCode.StyleCode.articulo).split('.')[0].trim()) && (
            <Typography
              level="body-xs"
              color="warning"
              variant="soft"
              startDecorator={<Warning sx={{ fontSize: '1rem' }} />}
              sx={{ px: 1, py: 0.25, borderRadius: 'xs', width: 'fit-content' }}
            >
              Advertencia, artículo con más de 10 variantes.
            </Typography>
          )}

          <Stack direction='column' className='gap-1.5'>
            <Stack direction='row' className='items-start max-w-full gap-4'>
              <FormControl>
                <FloatingLabelInput
                  inputProps={{
                    label: 'Artículo',
                    value: newColorCode.StyleCode.articulo,
                    type: 'number',
                  }}
                  className='w-24'
                  disabled
                />
              </FormControl>
              <Typography
                level='h1'
                color='primary'
                variant='outlined'
                className='rounded-md h-14'
              >
                .
              </Typography>
              <FormControl className='grow'>
                <FloatingLabelInput
                  disabled={newColorCode.StyleCode.punto}
                  inputProps={{
                    value: formData.punto ?? newColorCode.StyleCode.punto ?? '',
                    label: 'Punto (si aplica)',
                    type: 'text',
                    pattern: '^\\d{0,2}$', // match 0 to 2 digits
                    placeholder: 'Sin "."',
                    className: 'w-full',
                    onChange: (e) =>
                      setFormData({
                        ...formData,
                        punto: e.target.value,
                      }),
                  }}
                />
              </FormControl>
            </Stack>
            <FormHelperText>
              <Typography
                variant='soft'
                level='body-sm'
                color='warning'
                className='mx-0'
              >
                PUNTO:
              </Typography>
              &nbsp;si en duda, verificar programada.
            </FormHelperText>
          </Stack>

          <FormControl>
            <FormLabel>Tipo (si aplica)</FormLabel>
            <Stack direction='row' className='gap-2'>
              <Input
                value=''
                disabled
                type='text'
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

          <Stack direction='row' className='gap-2'>
            <FormControl>
              <FormLabel>Código</FormLabel>
              <Input
                value={newColorCode.StyleCode.color}
                type='text'
                disabled
                className='*:text-center w-14'
              />
            </FormControl>

            <ColorSelect
              onChange={(color) => {
                setFormData((prev) => ({
                  ...prev,
                  color: color,
                  code: newColorCode.StyleCode.color,
                }));
              }}
              val={formData.color || null}
              inheritedColors={colors}
              required
              allowAdd
              className='grow'
            />
          </Stack>

          <Stack direction='row' className='gap-2'>
            <Button
              color='danger'
              variant='outlined'
              startDecorator={<DeleteOutlined />}
              sx={{ '& .MuiButton-startDecorator': { mr: '2px' } }}
              className='grow'
              onClick={() => setDeleteOpen(true)}
            >
              Descartar
            </Button>
            <Button
              type='submit'
              loading={loading}
              startDecorator={!loading && <AddOutlined />}
              sx={{ '& .MuiButton-startDecorator': { mr: '2px' } }}
              className='grow'
            >
              Agregar
            </Button>
          </Stack>
        </Stack>
      </form>

      {deleteOpen && (
        <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <ModalDialog variant='outlined' role='alertdialog'>
            <DialogTitle>
              <WarningOutlined />
              Confirmar
            </DialogTitle>

            <Divider />

            <DialogContent>
              <Stack direction='column' className='gap-2'>
                <Typography>
                  ¿Seguro que desea descartar el código{' '}
                  <Typography variant='soft' color='warning'>
                    {newColorCode.StyleCode.styleCode}
                  </Typography>
                  ?
                </Typography>
                <Typography>
                  Solo debería descartar el código si es erróneo. De lo
                  contrario, no se vinculará la producción correctamente.
                </Typography>
                <Typography>
                  El código seguirá apareciendo hasta que se cambie la cadena en
                  la máquina, se ponga en stop de producción o se apague.
                </Typography>
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button variant='solid' color='danger' onClick={handleDelete}>
                Descartar
              </Button>
              <Button
                variant='plain'
                color='neutral'
                onClick={() => setDeleteOpen(false)}
              >
                Cancelar
              </Button>
            </DialogActions>
          </ModalDialog>
        </Modal>
      )}
    </>
  );
}
