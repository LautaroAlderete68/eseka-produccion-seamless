import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import Sheet from '@mui/joy/Sheet';
import Table from '@mui/joy/Table';
import CircularProgress from '@mui/joy/CircularProgress';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import DialogTitle from '@mui/joy/DialogTitle';
import DialogContent from '@mui/joy/DialogContent';
import DialogActions from '@mui/joy/DialogActions';
import Divider from '@mui/joy/Divider';
import IconButton from '@mui/joy/IconButton';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Switch from '@mui/joy/Switch';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import QrCodeOutlined from '@mui/icons-material/QrCodeOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import FilterListOutlined from '@mui/icons-material/FilterListOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import WarningRounded from '@mui/icons-material/WarningRounded';
import ColorLensOutlined from '@mui/icons-material/ColorLensOutlined';
import { useState, useEffect } from 'react';
import { useConfig } from '../ConfigContext.jsx';
import dayjs from 'dayjs';

export default function CodigosColor() {
  const { apiUrl } = useConfig();
  const [articulo, setArticulo] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // null means not searched yet
  const [error, setError] = useState('');

  // States for APP_COLORES panel
  const [colores, setColores] = useState([]);
  const [loadingColores, setLoadingColores] = useState(false);
  const [errorColores, setErrorColores] = useState('');
  const [filterText, setFilterText] = useState('');

  // States for APP_COLOR_CODES_LOG panel
  const [colorLog, setColorLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [errorLog, setErrorLog] = useState('');

  // States for inline StyleCode editing & confirmation modal
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null); // { index, row, newValue }
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  // States for bottom Color Editor panel
  const [selectedColorId, setSelectedColorId] = useState(null);
  const [colorHex, setColorHex] = useState('');
  const [whiteText, setWhiteText] = useState(false);
  const [confirmColorOpen, setConfirmColorOpen] = useState(false);
  const [updatingColor, setUpdatingColor] = useState(false);
  const [colorEditorError, setColorEditorError] = useState('');
  const [colorEditorSuccess, setColorEditorSuccess] = useState('');

  const fetchLog = async () => {
    setLoadingLog(true);
    setErrorLog('');
    try {
      const res = await fetch(`${apiUrl}/color-codes/log`);
      if (!res.ok) {
        throw new Error('Error al cargar el registro de vinculaciones.');
      }
      const data = await res.json();
      setColorLog(data);
    } catch (err) {
      console.error(err);
      setErrorLog('Ocurrió un error al cargar el registro de vinculaciones.');
    } finally {
      setLoadingLog(false);
    }
  };

  useEffect(() => {
    const fetchColores = async () => {
      setLoadingColores(true);
      setErrorColores('');
      try {
        const res = await fetch(`${apiUrl}/color-codes/colores`);
        if (!res.ok) {
          throw new Error('Error al cargar la lista de colores.');
        }
        const data = await res.json();
        const sorted = data.slice().sort((a, b) => {
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
        });
        setColores(sorted);
      } catch (err) {
        console.error(err);
        setErrorColores('Ocurrió un error al cargar la lista de colores.');
      } finally {
        setLoadingColores(false);
      }
    };

    if (apiUrl) {
      fetchColores();
      fetchLog();
    }
  }, [apiUrl]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!articulo.trim()) {
      setError('Por favor, ingrese un número de artículo.');
      return;
    }
    if (isNaN(articulo.trim())) {
      setError('El artículo debe ser un número.');
      return;
    }

    setLoading(true);
    setError('');
    setUpdateError('');
    setUpdateSuccess('');
    setEditingIndex(null);
    try {
      const res = await fetch(`${apiUrl}/color-codes/search?articulo=${articulo.trim()}`);
      if (!res.ok) {
        throw new Error('Error al conectar con el servidor.');
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al buscar los códigos de color.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (idx, row) => {
    setEditingIndex(idx);
    setEditingValue(row.StyleCode ? row.StyleCode.trim() : '');
    setUpdateError('');
    setUpdateSuccess('');
  };

  const handleSaveRequest = (idx, row, newValue) => {
    if (newValue.trim().length > 8) {
      setUpdateError('El código de estilo no puede superar los 8 caracteres.');
      return;
    }
    setPendingUpdate({ index: idx, row, newValue: newValue.trim() });
    setConfirmOpen(true);
  };

  const handleConfirmUpdate = async () => {
    if (!pendingUpdate) return;
    const { index, row, newValue } = pendingUpdate;

    setUpdating(true);
    setUpdateError('');
    setUpdateSuccess('');
    try {
      const res = await fetch(`${apiUrl}/color-codes/update-style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articulo: row.Articulo,
          color: row.Color,
          talle: row.Talle,
          styleCode: newValue,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al actualizar el código de estilo en el servidor.');
      }

      const data = await res.json();
      if (data.success) {
        // Update state locally
        const updatedResults = [...results];
        updatedResults[index] = { ...row, StyleCode: newValue };
        setResults(updatedResults);
        setUpdateSuccess(`Código de estilo actualizado con éxito a "${newValue}".`);
        setEditingIndex(null);
        
        // Refresh the logs panel to show this update
        fetchLog();
      } else {
        throw new Error('No se pudo confirmar la actualización.');
      }
    } catch (err) {
      console.error(err);
      setUpdateError(err.message || 'Ocurrió un error al actualizar.');
    } finally {
      setUpdating(false);
      setConfirmOpen(false);
      setPendingUpdate(null);
    }
  };

  // Bottom Color Editor Handlers
  const handleColorSelect = (event, newValue) => {
    setSelectedColorId(newValue);
    if (newValue) {
      const selectedColor = colores.find((c) => c.Id === newValue);
      if (selectedColor) {
        setColorHex(selectedColor.Hex || '#ffffff');
        setWhiteText(!!selectedColor.WhiteText);
      }
    } else {
      setColorHex('');
      setWhiteText(false);
    }
    setColorEditorError('');
    setColorEditorSuccess('');
  };

  const handleSaveColorRequest = (e) => {
    if (e) e.preventDefault();
    if (!selectedColorId) {
      setColorEditorError('Por favor, selecciona un color para editar.');
      return;
    }
    if (!colorHex || !/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
      setColorEditorError('El formato hexadecimal del color debe ser #RRGGBB (ej: #BEB1B0).');
      return;
    }
    setConfirmColorOpen(true);
  };

  const handleConfirmColorUpdate = async () => {
    setUpdatingColor(true);
    setColorEditorError('');
    setColorEditorSuccess('');
    try {
      const res = await fetch(`${apiUrl}/color-codes/update-color`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedColorId,
          hex: colorHex.toUpperCase(),
          whiteText: whiteText,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al actualizar el color en el servidor.');
      }

      const data = await res.json();
      if (data.success) {
        setColorEditorSuccess('Color actualizado con éxito.');
        
        // 1. Refresh APP_COLORES reference list locally (so the table updates)
        const updatedColores = colores.map((c) =>
          c.Id === selectedColorId
            ? { ...c, Hex: colorHex.toUpperCase(), WhiteText: whiteText }
            : c
        );
        setColores(updatedColores);

        // 2. Refresh results list locally (if there is an active search result)
        if (results && results.length > 0) {
          const updatedResults = results.map((r) =>
            r.Color === selectedColorId
              ? { ...r, Hex: colorHex.toUpperCase(), WhiteText: whiteText }
              : r
          );
          setResults(updatedResults);
        }

        // 3. Refresh logs list locally
        if (colorLog && colorLog.length > 0) {
          const updatedLog = colorLog.map((l) =>
            l.ColorID === selectedColorId
              ? { ...l, Hex: colorHex.toUpperCase(), WhiteText: whiteText }
              : l
          );
          setColorLog(updatedLog);
        }
      } else {
        throw new Error('No se pudo confirmar la actualización del color.');
      }
    } catch (err) {
      console.error(err);
      setColorEditorError(err.message || 'Ocurrió un error al actualizar el color.');
    } finally {
      setUpdatingColor(false);
      setConfirmColorOpen(false);
    }
  };

  const filteredColores = colores.filter((c) => {
    if (!filterText.trim()) return true;
    const query = filterText.toLowerCase().trim();
    return (
      String(c.Id).includes(query) ||
      (c.Color && c.Color.toLowerCase().includes(query))
    );
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 4, pb: 12 }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <QrCodeOutlined sx={{ fontSize: '32px', color: 'primary.500' }} />
        <Box>
          <Typography level="h3" component="h1" sx={{ fontWeight: 'bold' }}>
            Buscador de Códigos de Color
          </Typography>
          <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
            Consulta códigos asignados a un artículo y visualiza el historial de vinculaciones
          </Typography>
        </Box>
      </Stack>

      {/* Unified Search & Filter Control Card */}
      <Card sx={{ p: 3, boxShadow: 'sm' }}>
        <Box className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
          
          {/* Left Side: Search Form */}
          <Box component="form" onSubmit={handleSearch}>
            <Typography level="body-sm" sx={{ mb: 1, fontWeight: 'bold' }}>
              Buscar por Artículo
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Input
                placeholder="Ej: 12050"
                value={articulo}
                onChange={(e) => setArticulo(e.target.value)}
                startDecorator={<SearchOutlined />}
                error={!!error}
                slotProps={{
                  input: {
                    type: 'text',
                    inputMode: 'numeric',
                  }
                }}
                sx={{
                  flex: 1,
                  borderRadius: 'sm',
                  '--Input-focusedHighlight': 'var(--joy-palette-primary-500)',
                  height: '36px',
                }}
              />
              <Button
                type="submit"
                loading={loading}
                variant="solid"
                color="primary"
                sx={{ px: 4, height: '36px' }}
              >
                Buscar
              </Button>
            </Stack>
            {error && (
              <Typography level="body-xs" color="danger" sx={{ mt: 1, fontWeight: 'bold' }}>
                {error}
              </Typography>
            )}
          </Box>

          {/* Right Side: Filter colors */}
          <Box>
            <Typography level="body-sm" sx={{ mb: 1, fontWeight: 'bold' }}>
              Filtrar Catálogo de Colores
            </Typography>
            <Input
              placeholder="Ej: Crudo, Negro o ID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              startDecorator={<FilterListOutlined />}
              sx={{
                borderRadius: 'sm',
                '--Input-focusedHighlight': 'var(--joy-palette-primary-500)',
                height: '36px',
              }}
            />
          </Box>
        </Box>
      </Card>

      {/* Split Screen Layout (aligned tables start at the same height) */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
        
        {/* Left Column: Color Codes Search Results */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size="lg" />
            </Box>
          ) : results === null ? (
            /* Not searched yet */
            <Card variant="outlined" sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed' }}>
              <SearchOutlined sx={{ fontSize: '48px', color: 'neutral.400', mx: 'auto', mb: 1 }} />
              <Typography level="title-md" sx={{ color: 'text.secondary' }}>
                Comienza ingresando un número de artículo en la barra superior.
              </Typography>
            </Card>
          ) : results.length === 0 ? (
            /* No results */
            <Card variant="outlined" sx={{ p: 6, textAlign: 'center', bgcolor: 'background.level1' }}>
              <WarningAmberOutlined sx={{ fontSize: '48px', color: 'warning.500', mx: 'auto', mb: 1 }} />
              <Typography level="title-md" sx={{ fontWeight: 'bold' }}>
                No se encontraron registros
              </Typography>
              <Typography level="body-sm" sx={{ color: 'text.secondary', mt: 0.5 }}>
                No hay códigos de color registrados para el artículo {articulo} o sus variaciones.
              </Typography>
            </Card>
          ) : (
            /* Results Table */
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography level="title-sm" sx={{ fontWeight: 'bold' }}>
                  Códigos de Color del Artículo ({results.length})
                </Typography>
                <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                  * Haz clic en el Código de Estilo para modificarlo
                </Typography>
              </Stack>

              {/* Status messages for updates */}
              {updateSuccess && (
                <Card variant="soft" color="success" sx={{ mb: 2, py: 1, px: 2, borderRadius: 'sm' }}>
                  <Typography level="body-sm" color="success" sx={{ fontWeight: 'bold' }}>
                    {updateSuccess}
                  </Typography>
                </Card>
              )}
              {updateError && (
                <Card variant="soft" color="danger" sx={{ mb: 2, py: 1, px: 2, borderRadius: 'sm' }}>
                  <Typography level="body-sm" color="danger" sx={{ fontWeight: 'bold' }}>
                    {updateError}
                  </Typography>
                </Card>
              )}

              <Sheet
                variant="outlined"
                sx={{
                  overflow: 'auto',
                  maxHeight: '600px',
                  borderRadius: 'sm',
                  boxShadow: 'sm',
                  bgcolor: 'background.surface',
                }}
              >
                <Table
                  aria-label="Tabla de códigos de color"
                  stickyHeader
                  hoverRow
                  sx={{
                    '& tr > th': {
                      bgcolor: 'background.level1',
                    },
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Artículo</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Color ID</th>
                      <th style={{ width: '120px' }}>Descripción Color</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Código</th>
                      <th style={{ width: '50px', textAlign: 'center' }}>Talle</th>
                      <th style={{ width: '130px' }}>Código de Estilo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.Articulo}</td>
                        <td style={{ textAlign: 'center' }}>{row.Color}</td>
                        <td
                          style={{
                            backgroundColor: row.Hex || 'transparent',
                            color: row.Hex ? (row.WhiteText ? 'white' : 'black') : 'inherit',
                            fontWeight: 'bold',
                          }}
                        >
                          {row.ColorDesc || '-'}
                        </td>
                        <td style={{ textAlign: 'center' }}>{row.Code}</td>
                        <td style={{ textAlign: 'center' }}>{row.Talle}</td>
                        
                        {/* Interactive StyleCode Cell */}
                        {editingIndex === idx ? (
                          <td>
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              size="sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveRequest(idx, row, editingValue);
                                } else if (e.key === 'Escape') {
                                  setEditingIndex(null);
                                }
                              }}
                              endDecorator={
                                <Stack direction="row" spacing={0.5}>
                                  <IconButton
                                    size="sm"
                                    variant="plain"
                                    color="success"
                                    onClick={() => handleSaveRequest(idx, row, editingValue)}
                                  >
                                    <CheckOutlined sx={{ fontSize: '18px' }} />
                                  </IconButton>
                                  <IconButton
                                    size="sm"
                                    variant="plain"
                                    color="danger"
                                    onClick={() => setEditingIndex(null)}
                                  >
                                    <CloseOutlined sx={{ fontSize: '18px' }} />
                                  </IconButton>
                                </Stack>
                              }
                              sx={{
                                width: '120px',
                                fontFamily: 'monospace',
                              }}
                            />
                          </td>
                        ) : (
                          <td
                            onClick={() => startEdit(idx, row)}
                            style={{ cursor: 'pointer' }}
                            title="Haz clic para modificar"
                          >
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                              <Typography sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                {row.StyleCode || '-'}
                              </Typography>
                              <EditOutlined sx={{ fontSize: '16px', color: 'neutral.400', opacity: 0.6 }} />
                            </Stack>
                          </td>
                        )}

                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Sheet>
            </Box>
          )}
        </Box>

        {/* Right Column: Reference Colors List & Link Logs */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          
          {/* Reference Colors Panel */}
          <Box>
            {loadingColores ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size="md" />
              </Box>
            ) : errorColores ? (
              <Card variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: 'background.level1' }}>
                <WarningAmberOutlined sx={{ fontSize: '32px', color: 'danger.500', mx: 'auto', mb: 1 }} />
                <Typography level="title-sm" sx={{ fontWeight: 'bold', color: 'danger.500' }}>
                  Error al cargar colores
                </Typography>
                <Typography level="body-xs" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {errorColores}
                </Typography>
              </Card>
            ) : filteredColores.length === 0 ? (
              <Card variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: 'background.level1' }}>
                <WarningAmberOutlined sx={{ fontSize: '32px', color: 'warning.500', mx: 'auto', mb: 1 }} />
                <Typography level="title-sm" sx={{ fontWeight: 'bold' }}>
                  No se encontraron colores
                </Typography>
                <Typography level="body-xs" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Ningún color coincide con el filtro.
                </Typography>
              </Card>
            ) : (
              <Box>
                <Typography level="title-sm" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                  Colores de Referencia ({filteredColores.length})
                </Typography>
                <Sheet
                  variant="outlined"
                  sx={{
                    overflow: 'auto',
                    maxHeight: '260px',
                    borderRadius: 'sm',
                    boxShadow: 'sm',
                    bgcolor: 'background.surface',
                  }}
                >
                  <Table
                    aria-label="Tabla de colores de referencia"
                    stickyHeader
                    hoverRow
                    sx={{
                      '& tr > th': {
                        bgcolor: 'background.level1',
                      },
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>ID Color</th>
                        <th>Descripción / Nombre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredColores.map((row) => (
                        <tr key={row.Id}>
                          <td style={{ fontWeight: 'bold' }}>{row.Id}</td>
                          <td
                            style={{
                              backgroundColor: row.Hex || 'transparent',
                              color: row.Hex ? (row.WhiteText ? 'white' : 'black') : 'inherit',
                              fontWeight: 'bold',
                            }}
                          >
                            {row.Color}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Sheet>
              </Box>
            )}
          </Box>

          {/* Logs of Vinculaciones Panel */}
          <Box>
            {loadingLog ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size="md" />
              </Box>
            ) : errorLog ? (
              <Card variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: 'background.level1' }}>
                <WarningAmberOutlined sx={{ fontSize: '32px', color: 'danger.500', mx: 'auto', mb: 1 }} />
                <Typography level="title-sm" sx={{ fontWeight: 'bold', color: 'danger.500' }}>
                  Error al cargar historial
                </Typography>
                <Typography level="body-xs" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {errorLog}
                </Typography>
              </Card>
            ) : colorLog.length === 0 ? (
              <Card variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: 'background.level1' }}>
                <WarningAmberOutlined sx={{ fontSize: '32px', color: 'warning.500', mx: 'auto', mb: 1 }} />
                <Typography level="title-sm" sx={{ fontWeight: 'bold' }}>
                  Sin registros
                </Typography>
                <Typography level="body-xs" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  No hay vinculaciones registradas.
                </Typography>
              </Card>
            ) : (
              <Box>
                <Typography level="title-sm" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                  Registro de Vinculaciones (Logs)
                </Typography>
                <Sheet
                  variant="outlined"
                  sx={{
                    overflow: 'auto',
                    maxHeight: '260px',
                    borderRadius: 'sm',
                    boxShadow: 'sm',
                    bgcolor: 'background.surface',
                  }}
                >
                  <Table
                    aria-label="Tabla de logs de vinculaciones"
                    stickyHeader
                    hoverRow
                    sx={{
                      '& tr > th': {
                        bgcolor: 'background.level1',
                      },
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Artículo</th>
                        <th style={{ width: '50px', textAlign: 'center' }}>Talle</th>
                        <th style={{ width: '50px', textAlign: 'center' }}>Code</th>
                        <th style={{ width: '70px', textAlign: 'center' }}>Color ID</th>
                        <th>Color</th>
                        <th style={{ width: '90px' }}>Estilo</th>
                        <th style={{ width: '110px' }}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colorLog.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.Articulo}</td>
                          <td style={{ textAlign: 'center' }}>{row.Talle}</td>
                          <td style={{ textAlign: 'center' }}>{row.Code}</td>
                          <td style={{ textAlign: 'center' }}>{row.ColorID}</td>
                          <td
                            style={{
                              backgroundColor: row.Hex || 'transparent',
                              color: row.Hex ? (row.WhiteText ? 'white' : 'black') : 'inherit',
                              fontWeight: 'bold',
                            }}
                          >
                            {row.Color}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {row.StyleCode}
                          </td>
                          <td style={{ fontSize: '11px', color: 'text.secondary' }}>
                            {row.FechaVinculacion
                              ? dayjs(row.FechaVinculacion).format('DD/MM HH:mm')
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Sheet>
              </Box>
            )}
          </Box>

        </Box>

      </Box>

      {/* Divider */}
      <Divider sx={{ my: 2 }} />

      {/* Bottom Panel: Color Editor */}
      <Card sx={{ p: 3, boxShadow: 'sm' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <ColorLensOutlined sx={{ fontSize: '28px', color: 'primary.500' }} />
          <Typography level="title-md" sx={{ fontWeight: 'bold' }}>
            Editor de Color
          </Typography>
        </Stack>

        {colorEditorSuccess && (
          <Card variant="soft" color="success" sx={{ mb: 2.5, py: 1, px: 2, borderRadius: 'sm' }}>
            <Typography level="body-sm" color="success" sx={{ fontWeight: 'bold' }}>
              {colorEditorSuccess}
            </Typography>
          </Card>
        )}
        {colorEditorError && (
          <Card variant="soft" color="danger" sx={{ mb: 2.5, py: 1, px: 2, borderRadius: 'sm' }}>
            <Typography level="body-sm" color="danger" sx={{ fontWeight: 'bold' }}>
              {colorEditorError}
            </Typography>
          </Card>
        )}

        <Box
          component="form"
          onSubmit={handleSaveColorRequest}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end w-full"
        >
          {/* 1. Selector de Color */}
          <Box>
            <Typography level="body-sm" sx={{ mb: 1, fontWeight: 'bold' }}>
              Seleccionar Color
            </Typography>
            <Select
              placeholder="Elige un color..."
              value={selectedColorId}
              onChange={handleColorSelect}
              sx={{
                borderRadius: 'sm',
                '--Select-focusedHighlight': 'var(--joy-palette-primary-500)',
                height: '36px',
              }}
            >
              <Option value={null}>-- Seleccionar --</Option>
              {colores.map((c) => (
                <Option key={c.Id} value={c.Id}>
                  {c.Id} - {c.Color}
                </Option>
              ))}
            </Select>
          </Box>

          {/* 2. Selector de Hex */}
          <Box>
            <Typography level="body-sm" sx={{ mb: 1, fontWeight: 'bold' }}>
              Código Hexadecimal
            </Typography>
            <Input
              placeholder="#FFFFFF"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              disabled={!selectedColorId}
              sx={{
                borderRadius: 'sm',
                '--Input-focusedHighlight': 'var(--joy-palette-primary-500)',
                height: '36px',
              }}
              startDecorator={
                <input
                  type="color"
                  value={
                    colorHex.startsWith('#') && colorHex.length === 7
                      ? colorHex
                      : '#ffffff'
                  }
                  onChange={(e) => setColorHex(e.target.value)}
                  disabled={!selectedColorId}
                  style={{
                    border: 'none',
                    width: '24px',
                    height: '24px',
                    padding: 0,
                    background: 'none',
                    cursor: selectedColorId ? 'pointer' : 'default',
                  }}
                />
              }
            />
          </Box>

          {/* 3. WhiteText Toggle & Legibility Preview */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>
              Contraste de Texto
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ height: '36px' }}>
              <Switch
                checked={whiteText}
                onChange={(e) => setWhiteText(e.target.checked)}
                disabled={!selectedColorId}
                color={whiteText ? 'primary' : 'neutral'}
              />
              {/* Legibility Preview box */}
              <Box
                sx={{
                  flex: 1,
                  height: '36px',
                  borderRadius: 'sm',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.2s',
                  backgroundColor: colorHex && /^#[0-9A-Fa-f]{6}$/.test(colorHex) ? colorHex : 'transparent',
                  color: colorHex && /^#[0-9A-Fa-f]{6}$/.test(colorHex) ? (whiteText ? 'white' : 'black') : 'text.secondary',
                }}
              >
                {selectedColorId ? 'Texto Prueba' : 'Sin color'}
              </Box>
            </Stack>
          </Box>

          {/* 4. Guardar Button */}
          <Button
            type="submit"
            disabled={!selectedColorId}
            variant="solid"
            color="primary"
            sx={{ height: '36px', borderRadius: 'sm' }}
          >
            Guardar Color
          </Button>
        </Box>
      </Card>

      {/* Confirmation Modal (StyleCode) */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <ModalDialog variant="outlined" role="alertdialog">
          <DialogTitle sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <WarningRounded sx={{ color: 'warning.500' }} />
            Confirmar Modificación
          </DialogTitle>
          <Divider />
          <DialogContent>
            {pendingUpdate && (
              <Typography level="body-md">
                ¿Estás seguro de que deseas modificar el Código de Estilo a{' '}
                <strong style={{ fontFamily: 'monospace' }}>
                  "{pendingUpdate.newValue}"
                </strong>{' '}
                para el Artículo <strong>{pendingUpdate.row.Articulo}</strong>, Color{' '}
                <strong>{pendingUpdate.row.ColorDesc || pendingUpdate.row.Color}</strong>{' '}
                (Talle {pendingUpdate.row.Talle})?
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              variant="solid"
              color="primary"
              loading={updating}
              onClick={handleConfirmUpdate}
            >
              Confirmar
            </Button>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      {/* Color Update Confirmation Modal */}
      <Modal open={confirmColorOpen} onClose={() => setConfirmColorOpen(false)}>
        <ModalDialog variant="outlined" role="alertdialog">
          <DialogTitle sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <WarningRounded sx={{ color: 'warning.500' }} />
            Confirmar Modificación de Color
          </DialogTitle>
          <Divider />
          <DialogContent>
            {selectedColorId && (
              <Typography level="body-md">
                ¿Estás seguro de que deseas modificar el color{' '}
                <strong>
                  "{colores.find((c) => c.Id === selectedColorId)?.Color}"
                </strong>{' '}
                (ID {selectedColorId})?
                <br />
                <br />
                - Nuevo Hex: <strong style={{ fontFamily: 'monospace' }}>{colorHex}</strong>
                <br />
                - Texto: <strong>{whiteText ? 'Blanco' : 'Oscuro'}</strong>
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              variant="solid"
              color="primary"
              loading={updatingColor}
              onClick={handleConfirmColorUpdate}
            >
              Confirmar
            </Button>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setConfirmColorOpen(false)}
            >
              Cancelar
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

    </Box>
  );
}
