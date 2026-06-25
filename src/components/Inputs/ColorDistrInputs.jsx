import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Stack from '@mui/joy/Stack';
import Switch from '@mui/joy/Switch';
import Typography from '@mui/joy/Typography';
import Input from '@mui/joy/Input';
import FormHelperText from '@mui/joy/FormHelperText';
import Checkbox from '@mui/joy/Checkbox';
import { useContext, useEffect, useState } from 'react';
import ColorSelect from './ColorSelect.jsx';
import { useConfig } from '../../ConfigContext.jsx';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Warning from '@mui/icons-material/Warning';
import { ErrorContext } from '../../Contexts.js';
import { useOutletContext } from 'react-router';

let apiUrl;

export default function ColorDistrInputs({ formData, setFormData, articulo }) {
  apiUrl = useConfig().apiUrl;
  const outletCtx = useOutletContext() || {};
  const docena = outletCtx.docena || 12;
  const room = outletCtx.room || '';
  const error = useContext(ErrorContext);
  const [colors, setColors] = useState([]);
  const [switched, setSwitched] = useState(
    formData?.colorDistr?.length > 1 ? true : false
  );
  const [numColors, setNumColors] = useState(
    formData?.colorDistr?.length > 1 ? formData.colorDistr.length : 2
  );

  useEffect(() => {
    let ignore = false;

    fetch(`${apiUrl}/colors`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setColors(data);
      })
      .catch((err) => console.error('[CLIENT] Error fetching /colors:', err));

    return () => {
      ignore = true;
    };
  }, []);

  const [specialArticles, setSpecialArticles] = useState(['2398', '2621', '2622', '3352', '3356', '3668', '3354']);

  useEffect(() => {
    let ignore = false;
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

  const getAutomaticColor = (art, rm) => {
    if (rm !== 'HOMBRE' || !art) return null;
    const strArt = String(art).trim();
    const parts = strArt.split('.');
    if (parts.length < 2) return null;
    const baseArt = parts[0].trim();
    const dec = parts[1].trim();
    const isSpecial = specialArticles.includes(baseArt);
    let designNum = null;
    if (isSpecial) {
      if (dec === '01') {
        designNum = 1;
      } else if (dec === '1') {
        designNum = 10;
      } else {
        const parsed = parseInt(dec, 10);
        if (!isNaN(parsed)) designNum = parsed;
      }
    } else {
      const parsed = parseInt(dec, 10);
      if (!isNaN(parsed)) designNum = parsed;
    }
    if (designNum !== null) return `DISEÑO ${designNum}`;
    return null;
  };

  const isMoreThan10Variants = (art) => {
    if (!art) return false;
    const base = String(art).trim().split('.')[0].trim();
    return specialArticles.includes(base);
  };

  useEffect(() => {
    if (colors.length === 0 || !articulo) return;
    const autoColorName = getAutomaticColor(articulo, room);
    if (!autoColorName) return;
    const matchedColor = colors.find(
      (c) => String(c.Color).toUpperCase().trim() === autoColorName.toUpperCase().trim()
    );
    if (!matchedColor) return;

    if (!switched) {
      const currentVal = formData.colorDistr?.[0]?.color;
      if (currentVal === undefined || currentVal === null) {
        setFormData((prev) => ({
          ...prev,
          colorDistr: [{ color: matchedColor.Id, porcentaje: 1 }],
        }));
      }
    } else {
      const currentVal = formData.colorDistr?.[0]?.color;
      if (currentVal === undefined || currentVal === null) {
        setFormData((prev) => {
          const colorDistr = [...(prev.colorDistr || [])];
          if (colorDistr.length === 0) {
            colorDistr.push({ color: matchedColor.Id, porcentaje: 1 });
          } else {
            colorDistr[0] = { ...colorDistr[0], color: matchedColor.Id };
          }
          return { ...prev, colorDistr };
        });
      }
    }
  }, [colors, articulo, switched, room]);

  return (
    <Stack direction='column' className='gap-4'>
      <Typography level='title-md'>Distribución de Colores</Typography>

      <Stack direction='row' className='justify-between'>
        <Checkbox
          label='Todos los talles'
          checked={formData?.allTalles ?? true}
          disabled={formData.allTalles === undefined}
          onChange={(e) =>
            setFormData({ ...formData, allTalles: e.target.checked })
          }
        />

        <Switch
          checked={switched}
          onChange={(e) => {
            setSwitched(e.target.checked);
            setFormData({ ...formData, colorDistr: [] });
            setNumColors(2);
          }}
          endDecorator='Surtido'
        />
      </Stack>

      {switched && (
        <Stack direction='row' className='items-end justify-between'>
          <FormControl required>
            <FormLabel>Cant. Colores</FormLabel>
            <Input
              type='number'
              value={numColors}
              onChange={(e) => {
                setFormData({ ...formData, colorDistr: [] });
                setNumColors(Number(e.target.value));
              }}
              slotProps={{ input: { min: 2, max: colors.length } }}
              className='w-15'
            />
          </FormControl>
          <Typography level='body-sm text-right max-w-[200px]'>
            Si no tiene distribución, ponga{' '}
            <Typography variant='soft' color='warning' className='mx-0'>
              0
            </Typography>{' '}
            en cada color.
          </Typography>
        </Stack>
      )}

      {!switched ? (
        <ColorSelect
          val={formData.colorDistr?.[0]?.color || null}
          onChange={(val) =>
            setFormData({
              ...formData,
              colorDistr: [{ color: val, porcentaje: 1 }],
            })
          }
          inheritedColors={colors}
          required
          allowAdd
          warning={
            isMoreThan10Variants(articulo)
              ? 'Advertencia, artículo con más de 10 variantes.'
              : null
          }
        />
      ) : (
        <FormControl error={error} required>
          <Stack direction='row' className='items-center justify-between' sx={{ mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FormLabel color={error === 'color' ? 'danger' : ''} sx={{ mb: 0 }}>
                Colores
              </FormLabel>
              {isMoreThan10Variants(articulo) && (
                <Typography
                  level="body-xs"
                  color="warning"
                  variant="soft"
                  startDecorator={<Warning sx={{ fontSize: '1rem' }} />}
                  sx={{ px: 1, py: 0.25, borderRadius: 'xs' }}
                >
                  Advertencia, artículo con más de 10 variantes.
                </Typography>
              )}
            </Stack>
            <FormLabel color={error === 'distr' ? 'danger' : ''}>
              Distribución
            </FormLabel>
          </Stack>
          <Stack key={numColors} direction='column' className='gap-4'>
            {Array(numColors)
              .fill(0)
              .map((_, i) => (
                <Stack direction='row' key={i} className='items-end gap-4'>
                  <ColorSelect
                    val={formData.colorDistr?.[i]?.color || null}
                    onChange={(val) =>
                      setFormData((prev) => {
                        const colorDistr = [...(prev.colorDistr || [])];
                        colorDistr[i] = {
                          ...colorDistr[i],
                          color: val,
                        };
                        return { ...prev, colorDistr };
                      })
                    }
                    inheritedColors={colors}
                    showLabel={false}
                    required
                    allowAdd
                    className='grow'
                  />

                  <Stack direction='row' className='items-center'>
                    <FormControl required error={error === 'distr'}>
                      <Input
                        type='number'
                        value={
                          formData.colorDistr?.[i]?.porcentaje
                            ? Math.round(
                                formData.colorDistr[i].porcentaje * docena
                              )
                            : 0
                        }
                        onChange={(e) =>
                          setFormData((prev) => {
                            const colorDistr = [...(prev.colorDistr || [])];
                            colorDistr[i] = {
                              ...colorDistr[i],
                              porcentaje: Number(e.target.value) / docena,
                            };
                            return { ...prev, colorDistr };
                          })
                        }
                        slotProps={{ input: { min: 0, max: docena } }}
                        className='**:text-right w-15'
                      />
                    </FormControl>
                    <Typography>&nbsp;/&nbsp;{docena}</Typography>
                  </Stack>
                </Stack>
              ))}
          </Stack>

          {error && (
            <FormHelperText>
              <ErrorOutline />
              {error === 'distr'
                ? `La suma del surtido es mayor a ${docena} unidades.`
                : 'Los colores no se pueden repetir.'}
            </FormHelperText>
          )}
        </FormControl>
      )}
    </Stack>
  );
}
