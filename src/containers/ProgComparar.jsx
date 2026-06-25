import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import Add from '@mui/icons-material/Add';
import Warning from '@mui/icons-material/Warning';
import { useContext, useEffect, useRef, useState } from 'react';
import { useConfig } from '../ConfigContext.jsx';
import dayjs from 'dayjs';
import NewArticuloForm from '../components/Forms/NewArticuloForm.jsx';
import ModalWrapper from '../components/ModalWrapper.jsx';
import { useLocation, useOutletContext } from 'react-router';
import { ToastsContext } from '../Contexts.js';
import localizedNum from '../utils/numFormat.js';
import CompareInstructions from '../components/Compare/CompareInstructions.jsx';
import DateTotalToolbar from '../components/Compare/DateTotalToolbar.jsx';
import CompareToolbar from '../components/Compare/CompareToolbar.jsx';
import FileUploadToolbar from '../components/Compare/FileUploadToolbar.jsx';
import NewProgTable from '../components/Compare/NewProgTable.jsx';
import DiffTable from '../components/Compare/DiffTable.jsx';
import NewTargetsTable from '../components/Compare/NewTargetsTable.jsx';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Input from '@mui/joy/Input';
import Switch from '@mui/joy/Switch';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Table from '@mui/joy/Table';
import Sheet from '@mui/joy/Sheet';
import CircularProgress from '@mui/joy/CircularProgress';
import IconButton from '@mui/joy/IconButton';

// to avoid useEffect dependency issues
let apiUrl, sqlDateFormat;

export default function ProgComparar() {
  // context
  ({ apiUrl, sqlDateFormat } = useConfig());
  const { room } = useOutletContext();
  const { addToast } = useContext(ToastsContext);
  // load, file upload and reading
  const [startDate, setStartDate] = useState();
  const [currTotal, setCurrTotal] = useState();
  const [programada, setProgramada] = useState();
  // diff and updates
  const [diff, setDiff] = useState();
  const [isResetting, setIsResetting] = useState(false);
  const [newArticuloData, setNewArticuloData] = useState([]);
  const [newTargets, setNewTargets] = useState();
  const [isSpecialArticlesOpen, setIsSpecialArticlesOpen] = useState(false);
  // helper refs
  const diffMounted = useRef(false);
  const loadType = useRef('');
  const intervalRef = useRef();
  useIntervalCleanup(intervalRef);

  // history states
  const [historyMonth, setHistoryMonth] = useState(() => dayjs().tz().month() + 1);
  const [historyYear, setHistoryYear] = useState(() => dayjs().tz().year());
  const [historyArticulo, setHistoryArticulo] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [prevRoom, setPrevRoom] = useState(room);
  if (room !== prevRoom) {
    setPrevRoom(room);
    setStartDate(undefined);
    setCurrTotal(undefined);
    setProgramada(undefined);
    setDiff(undefined);
    setIsResetting(false);
    setNewArticuloData([]);
    setNewTargets(undefined);
  }

  // fetch history
  useEffect(() => {
    let ignore = false;
    setHistoryLoading(true);

    const params = new URLSearchParams({
      mes: historyMonth,
      anio: historyYear,
      roomCode: room,
      articulo: historyArticulo,
    }).toString();

    fetch(`${apiUrl}/programada/history?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          setHistoryData(data);
          setHistoryLoading(false);
        }
      })
      .catch((err) => {
        console.error('[CLIENT] Error fetching programada history:', err);
        if (!ignore) setHistoryLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [historyMonth, historyYear, room, historyArticulo]);

  // get current programada total on load
  useEffect(() => {
    let ignore = false;
    if (startDate === undefined) {
      // fetch start date of current programada
      fetch(`${apiUrl}/${room}/programada/actualDate`)
        .then((res) => res.json())
        .then((data) => {
          if (!ignore) setStartDate(data[0].Date);
        })
        .catch((err) =>
          console.error('[CLIENT] Error fetching /programada/actualDate:', err)
        );
    }

    return () => {
      ignore = true;
    };
  }, [startDate]);

  // Insert diff updates after validating new articulos
  useEffect(() => {
    let ignore = false;

    // just inserts updates
    async function insertUpdates() {
      try {
        const res = await fetch(`${apiUrl}/${room}/programada/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(diff),
        });

        const resData = await res.json();
        addToast({
          type: res.status === 500 ? 'danger' : 'success',
          message: resData.message,
        });

        const data = resData.inserted;
        fetchNewTargets(data);
        intervalRef.current = setInterval(() => {
          fetchNewTargets(data);
        }, 30000); // update every 30 seconds
      } catch (err) {
        console.error('[CLIENT] Error fetching data:', err);
      }

      fetch(`${apiUrl}/${room}/programada/total/${startDate}`)
        .then((res) => res.json())
        .then((data) => setCurrTotal(data[0].Total)) // single-record object
        .catch((err) => console.error('[CLIENT] Error fetching data:', err));
    }

    // inserts the whole programada
    // used for initial load at month start
    async function insertAll() {
      if (programada) {
        try {
          const res = await fetch(`${apiUrl}/${room}/programada/insertAll`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(programada.rows),
          });

          const resData = await res.json();
          addToast({
            type: res.status === 500 ? 'danger' : 'success',
            message: resData.message,
          });

          const data = resData.inserted;

          // insert programada start date to db
          fetch(`${apiUrl}/${room}/programada/insertStartDate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              date: dayjs.tz().format(sqlDateFormat),
              month: dayjs.tz().month() + 1, // month is 0-indexed in dayjs
              year: dayjs.tz().year(),
            }),
          })
            .then(async (res) => {
              const resData = await res.json();
              addToast({
                type: res.status === 500 ? 'danger' : 'success',
                message: resData.message,
              });
            })
            .catch((err) => {
              console.error('[CLIENT] Error inserting start date:', err);
            });

          // fetch and repeat every 30 seconds
          fetchNewTargets(data);
          intervalRef.current = setInterval(() => {
            fetchNewTargets(data);
          }, 30000); // update every 30 seconds

          setStartDate(dayjs.tz().format(sqlDateFormat));
          // currTotal auto-updates on startDate change
        } catch (err) {
          console.error('[CLIENT] Error fetching data:', err);
        }
      }
    }

    if (diff && !diffMounted.current) {
      diffMounted.current = true;
      return; // skip when diff is first set to not auto-insert updates
    }

    if (isResetting) {
      setIsResetting(false);
      return;
    }

    // need to check both diff.added and newArticuloData because one could be
    // empty while the other isn't
    if (
      !ignore &&
      startDate !== undefined &&
      diff &&
      diff.added.length === 0 &&
      newArticuloData.length === 0
    ) {
      if (loadType.current === 'update') {
        insertUpdates();
      } else if (loadType.current === 'insert') {
        insertAll();
      }

      setDiff();
    }

    return () => {
      ignore = true;
    };
  }, [diff, newArticuloData, programada, startDate, addToast]);

  function fetchNewTargets(inserted) {
    fetch(`${apiUrl}/${room}/programada/calculateNewTargets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inserted), // inserted prog updates
    })
      .then((res) => res.json())
      .then((data) =>
        setNewTargets(data.sort((a, b) => a.StyleCode - b.StyleCode))
      )
      .catch((err) => console.error('[CLIENT] Error fetching data:', err));
  }

  function useIntervalCleanup(intervalRef) {
    const { pathname } = useLocation();

    useEffect(() => {
      const handleUnload = () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };

      window.addEventListener('beforeunload', handleUnload);

      return () => {
        window.removeEventListener('beforeunload', handleUnload);

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [pathname, intervalRef]);
  }

  const currentYear = dayjs().tz().year();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={3}
      sx={{
        py: 2,
        alignItems: 'stretch',
        width: '100%',
        height: { xs: 'auto', md: 'calc(100vh - 32px)' },
        boxSizing: 'border-box'
      }}
    >
      {/* Primer Panel: Comparador de Programación */}
      <Box
        sx={{
          width: { xs: '100%', md: '65%' },
          height: { xs: 'auto', md: '100%' },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto'
        }}
      >
        <Card variant='plain' sx={{ p: 0, bgcolor: 'transparent', height: '100%', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
          <Stack direction='row' className='items-center justify-between flex-wrap gap-2'>
            <Typography level='h4' component='h2'>
              Comparar producción programada
            </Typography>
            <Button
              size='sm'
              variant='soft'
              color='neutral'
              onClick={() => setIsSpecialArticlesOpen(true)}
              startDecorator={<SettingsOutlined />}
              sx={{
                bgcolor: 'background.level2',
                border: '1px solid',
                borderColor: 'neutral.outlinedBorder',
                '&:hover': {
                  bgcolor: 'background.level3',
                }
              }}
            >
              Artículos con +10 variantes
            </Button>
          </Stack>
          
          {/* Collapsible instructions */}
          <CompareInstructions />

          {/* buttons */}
          <Stack direction='row' className='items-end justify-between flex-wrap gap-2'>
            <DateTotalToolbar
              newTargets={newTargets}
              startDate={startDate}
              setStartDate={setStartDate}
              diff={diff}
              setIsResetting={setIsResetting}
              setCurrTotal={setCurrTotal}
              currTotal={currTotal}
            />

            <FileUploadToolbar
              setProgramada={setProgramada}
              setDiff={setDiff}
              setNewTargets={setNewTargets}
              diffMounted={diffMounted}
            />
          </Stack>

          {programada && (
            <Stack direction='row' className='items-center gap-4 flex-wrap'>
              {/* New total */}
              <Typography
                variant='outlined'
                color='warning'
                level='body-lg'
                className='max-w-fit rounded-[var(--joy-radius-sm)] py-1.5 px-4 mx-0'
              >
                Total nuevo: {localizedNum(programada.total)}
              </Typography>

              <CompareToolbar
                programada={programada}
                diff={diff}
                setDiff={setDiff}
                newTargets={newTargets}
                startDate={startDate}
                loadType={loadType}
                setNewArticuloData={setNewArticuloData}
              />
            </Stack>
          )}

          {/* New programada table */}
          {programada && !diff && !newTargets && (
            <NewProgTable programada={programada} />
          )}

          {/* diff table */}
          {diff && <DiffTable diff={diff} />}

          {newTargets && <NewTargetsTable newTargets={newTargets} />}
        </Card>
      </Box>

      {/* Segundo Panel: Historial de Cambios */}
      <Box sx={{ width: { xs: '100%', md: '35%' }, height: { xs: 'auto', md: '100%' }, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Card variant='outlined' sx={{ p: 2, height: '100%', bgcolor: 'background.surface', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Typography level='h4' component='h2' className='mb-2'>
            Historial de Cambios ({room === 'HOMBRE' ? 'ALGODÓN' : room})
          </Typography>
          
          <Stack direction='row' spacing={2} className='items-end mb-4 flex-wrap gap-y-2'>
            <FormControl size='sm'>
              <FormLabel>Año</FormLabel>
              <Select
                value={historyYear}
                onChange={(e, val) => val && setHistoryYear(val)}
                sx={{ width: 90 }}
              >
                {years.map((y) => (
                  <Option key={y} value={y}>
                    {y}
                  </Option>
                ))}
              </Select>
            </FormControl>

            <FormControl size='sm'>
              <FormLabel>Mes</FormLabel>
              <Select
                value={historyMonth}
                onChange={(e, val) => val && setHistoryMonth(val)}
                sx={{ width: 120 }}
              >
                {months.map((m) => (
                  <Option key={m.value} value={m.value}>
                    {m.label}
                  </Option>
                ))}
              </Select>
            </FormControl>

            <FormControl size='sm'>
              <FormLabel>Artículo</FormLabel>
              <Input
                type='text'
                placeholder='Buscar...'
                value={historyArticulo}
                onChange={(e) => setHistoryArticulo(e.target.value)}
                sx={{ width: 110 }}
                endDecorator={
                  historyArticulo && (
                    <IconButton
                      size='sm'
                      variant='plain'
                      color='neutral'
                      onClick={() => setHistoryArticulo('')}
                      sx={{ p: 0.5, minWidth: 0, minHeight: 0 }}
                    >
                      ✕
                    </IconButton>
                  )
                }
              />
            </FormControl>
          </Stack>

          <Sheet
            variant='outlined'
            sx={{
              overflow: 'auto',
              borderRadius: 'sm',
              bgcolor: 'background.body',
              flexGrow: 1,
              minHeight: 0,
            }}
          >
            <Table borderAxis='both' size='sm' hoverRow sx={{ minWidth: 400 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>Fecha</th>
                  <th style={{ textAlign: 'center' }}>Articulo</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Talle</th>
                  <th style={{ textAlign: 'center' }}>Doc. Actuales</th>
                  <th style={{ textAlign: 'center' }}>Doc. Previas</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                      <CircularProgress size='sm' />
                    </td>
                  </tr>
                ) : historyData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--joy-palette-text-secondary)' }}>
                      Sin cambios registrados.
                    </td>
                  </tr>
                ) : (
                  historyData.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center' }}>{dayjs(row.Fecha).format('DD/MM HH:mm')}</td>
                      <td style={{ textAlign: 'center' }}>{row.Articulo}</td>
                      <td style={{ width: '70px', textAlign: 'center' }}>{row.Talle}</td>
                      <td style={{ textAlign: 'center' }}>{localizedNum(row.Docenas)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {row['Docenas prev.'] !== null ? localizedNum(row['Docenas prev.']) : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Typography
                          level='body-xs'
                          variant='soft'
                          color={row['Estado articulo'] === 'Agregado' ? 'success' : 'warning'}
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 'xs',
                            display: 'inline-block',
                            fontWeight: 'bold',
                          }}
                        >
                          {row['Estado articulo']}
                        </Typography>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Sheet>
        </Card>
      </Box>

      {/* render one Modal at a time */}
      {newArticuloData.length > 0 && (
        <ModalWrapper
          title='Agregar artículo nuevo'
          content='Por favor, ingrese los datos del siguiente artículo.'
          handleClose={() => window.location.reload()}
          contentClassName='w-sm'
        >
          <NewArticuloForm
            newArticuloData={newArticuloData[0]}
            setNewArticuloData={setNewArticuloData}
          />
        </ModalWrapper>
      )}

      <ModalWrapper
        title='Administrar Artículos Especiales'
        isOpen={isSpecialArticlesOpen}
        handleClose={() => setIsSpecialArticlesOpen(false)}
        dialogSx={{ width: '100%', maxWidth: 416 }}
      >
        <SpecialArticlesForm onClose={() => setIsSpecialArticlesOpen(false)} />
      </ModalWrapper>
    </Stack>
  );
}

function SpecialArticlesForm({ onClose }) {
  const { apiUrl } = useConfig();
  const { addToast } = useContext(ToastsContext);
  const [articles, setArticles] = useState([]);
  const [newArticle, setNewArticle] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchArticles = () => {
    setLoading(true);
    fetch(`${apiUrl}/articulos-especiales`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setArticles(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    const artNum = parseInt(newArticle);
    if (isNaN(artNum)) {
      addToast({ type: 'danger', message: 'Por favor, ingrese un número válido.' });
      return;
    }
    if (articles.includes(artNum)) {
      addToast({ type: 'warning', message: 'El artículo ya está en la lista.' });
      return;
    }

    fetch(`${apiUrl}/articulos-especiales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articulo: artNum }),
    })
      .then((res) => res.json())
      .then((resData) => {
        addToast({ type: 'success', message: `Artículo ${artNum} agregado con éxito.` });
        setNewArticle('');
        fetchArticles();
      })
      .catch((err) => {
        addToast({ type: 'danger', message: 'Error al agregar el artículo.' });
        console.error(err);
      });
  };

  const handleDelete = (art) => {
    fetch(`${apiUrl}/${art}/programada`)
      .then(res => res.json())
      .then(data => {
        // Warning if deleting an article that has data, but allow it
      })
      .catch(() => {});

    fetch(`${apiUrl}/articulos-especiales/${art}`, {
      method: 'DELETE',
    })
      .then((res) => res.json())
      .then((resData) => {
        addToast({ type: 'success', message: `Artículo ${art} eliminado con éxito.` });
        fetchArticles();
      })
      .catch((err) => {
        addToast({ type: 'danger', message: 'Error al eliminar el artículo.' });
        console.error(err);
      });
  };

  return (
    <Stack spacing={2} sx={{ minWidth: 280, p: 1 }}>
      <Typography level="body-sm" color="neutral">
        Los artículos de esta lista muestran una advertencia en el formulario de color y realizan la selección automática de los diseños .01 (Diseño 1) y .1 (Diseño 10).
      </Typography>

      <Box
        sx={{
          p: 1.5,
          border: '1px dashed',
          borderColor: 'warning.outlinedBorder',
          borderRadius: 'sm',
          bgcolor: 'warning.softBg',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Typography level="body-xs" fontWeight="bold" color="warning">
          Ejemplo de advertencia en el formulario:
        </Typography>
        <div>
          <Typography
            level="body-xs"
            color="warning"
            variant="soft"
            startDecorator={<Warning sx={{ fontSize: '1rem' }} />}
            sx={{ px: 1, py: 0.25, borderRadius: 'xs' }}
          >
            Advertencia, artículo con más de 10 variantes.
          </Typography>
        </div>
      </Box>

      <form onSubmit={handleAdd}>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Input
            size="sm"
            type="number"
            placeholder="Ej: 2398"
            value={newArticle}
            onChange={(e) => setNewArticle(e.target.value)}
            sx={{ flex: 1 }}
            required
          />
          <Button type="submit" size="sm" startDecorator={<Add />}>
            Agregar
          </Button>
        </Stack>
      </form>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size="sm" />
        </Stack>
      ) : articles.length === 0 ? (
        <Typography level="body-xs" sx={{ py: 2, textAlign: 'center', fontStyle: 'italic' }}>
          No hay artículos especiales configurados.
        </Typography>
      ) : (
        <Sheet
          variant="outlined"
          sx={{
            maxHeight: 250,
            overflowY: 'auto',
            borderRadius: 'sm',
            bgcolor: 'background.level1',
          }}
        >
          <Table stickyHeader size="sm">
            <thead>
              <tr>
                <th>Artículo</th>
                <th style={{ width: 60, textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((art) => (
                <tr key={art}>
                  <td>
                    <Typography fontWeight="bold">{art}</Typography>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <IconButton
                      size="sm"
                      color="danger"
                      variant="plain"
                      onClick={() => handleDelete(art)}
                    >
                      <DeleteOutline sx={{ fontSize: '1.2rem' }} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Sheet>
      )}
    </Stack>
  );
}
