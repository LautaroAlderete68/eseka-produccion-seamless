import { useConfig } from '../ConfigContext.jsx';
import { useState } from 'react';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import Table from '@mui/joy/Table';
import Sheet from '@mui/joy/Sheet';
import IconButton from '@mui/joy/IconButton';
import KeyboardArrowDownOutlined from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowRightOutlined from '@mui/icons-material/KeyboardArrowRightOutlined';

let apiUrl;

// Collapsible Row for Day (Level 1)
function DayRow({ day }) {
  const [open, setOpen] = useState(false);
  const bgColor = day.piezas > 0 ? 'var(--prod-day-has-pieces)' : 'var(--prod-day-no-pieces)';

  return (
    <>
      <tr 
        style={{ backgroundColor: bgColor, color: 'var(--prod-text-color)' }} 
        className="border-b border-neutral-300 dark:border-neutral-700 font-semibold h-[38px]"
      >
        <td className="align-middle">
          <IconButton
            size="sm"
            variant="plain"
            onClick={() => setOpen(!open)}
            sx={{ mr: 1, '--IconButton-size': '24px', color: 'var(--prod-text-color)' }}
          >
            {open ? <KeyboardArrowDownOutlined /> : <KeyboardArrowRightOutlined />}
          </IconButton>
          {day.fecha}
        </td>
        <td className="text-center align-middle">{day.piezas}</td>
        <td className="text-center align-middle">{day.docenas}</td>
        <td className="text-center align-middle font-bold text-[var(--joy-palette-danger-plainColor)]">{day.saldo || ''}</td>
      </tr>
      {open && day.turnos.map((turno) => (
        <TurnoRow key={turno.id} turno={turno} />
      ))}
    </>
  );
}

// Collapsible Row for Shift (Level 2)
function TurnoRow({ turno }) {
  const [open, setOpen] = useState(false);
  const bgColor = turno.piezas > 0 ? 'var(--prod-turno-has-pieces)' : 'var(--prod-turno-no-pieces)';

  return (
    <>
      <tr 
        style={{ backgroundColor: bgColor, color: 'var(--prod-text-color)' }} 
        className="border-b border-neutral-200 dark:border-neutral-800 h-[32px]"
      >
        <td className="pl-6 align-middle">
          <IconButton
            size="sm"
            variant="plain"
            onClick={() => setOpen(!open)}
            disabled={turno.maquinas.length === 0}
            sx={{ mr: 1, '--IconButton-size': '24px', color: 'var(--prod-text-color)' }}
          >
            {open ? <KeyboardArrowDownOutlined /> : <KeyboardArrowRightOutlined />}
          </IconButton>
          {turno.name}
        </td>
        <td className="text-center align-middle">{turno.piezas}</td>
        <td className="text-center align-middle">{turno.docenas}</td>
        <td className="text-center align-middle font-bold text-[var(--joy-palette-danger-plainColor)]">{turno.saldo || ''}</td>
      </tr>
      {open && turno.maquinas.map((maquina) => (
        <MaquinaRow key={maquina.id} maquina={maquina} />
      ))}
    </>
  );
}

// Collapsible Row for Machine (Level 3)
function MaquinaRow({ maquina }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr 
        style={{ backgroundColor: 'var(--prod-maquina-bg)', color: 'var(--prod-text-color)' }} 
        className="border-b border-neutral-100 dark:border-neutral-900 h-[28px]"
      >
        <td className="pl-12 align-middle">
          <IconButton
            size="sm"
            variant="plain"
            onClick={() => setOpen(!open)}
            disabled={maquina.articulos.length === 0}
            sx={{ mr: 1, '--IconButton-size': '24px', color: 'var(--prod-text-color)' }}
          >
            {open ? <KeyboardArrowDownOutlined /> : <KeyboardArrowRightOutlined />}
          </IconButton>
          {maquina.name}
        </td>
        <td className="text-center align-middle">{maquina.piezas}</td>
        <td className="text-center align-middle">{maquina.docenas}</td>
        <td className="text-center align-middle font-bold text-[var(--joy-palette-danger-plainColor)]">{maquina.saldo || ''}</td>
      </tr>
      {open && maquina.articulos.map((articulo) => (
        <ArticuloRow key={articulo.id} articulo={articulo} />
      ))}
    </>
  );
}

// Row for Article/Style (Level 4)
function ArticuloRow({ articulo }) {
  return (
    <tr 
      style={{ backgroundColor: 'var(--prod-maquina-bg)', color: 'var(--prod-text-muted)' }} 
      className="border-b border-neutral-100 dark:border-neutral-900 h-[28px]"
    >
      <td className="pl-[72px] align-middle italic">
        {articulo.name}
      </td>
      <td className="text-center align-middle">{articulo.piezas}</td>
      <td className="text-center align-middle">{articulo.docenas}</td>
      <td className="text-center align-middle"></td>
    </tr>
  );
}

export default function ProduccionMaquinas() {
  ({ apiUrl } = useConfig());
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function handleSearch(e) {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    // Validate machine list
    const parts = searchTerm.split(',').map(p => p.trim());
    const valid = parts.every(p => /^\d+$/.test(p));
    if (!valid) {
      alert('Por favor, ingresa solo números de máquina separados por coma (ej. 430,429)');
      return;
    }

    setLoading(true);
    setSearched(true);

    fetch(`${apiUrl}/produccion/maquinas?maquinas=${encodeURIComponent(searchTerm)}`)
      .then((res) => {
        if (!res.ok) throw new Error('HTTP error ' + res.status);
        return res.json();
      })
      .then((incomingData) => {
        setData(incomingData);
      })
      .catch((err) => {
        console.error('[CLIENT] Error fetching machine production:', err);
        setData([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        className="sticky z-10 top-0 bg-[var(--joy-palette-background-body)] py-4"
      >
        <Typography level="h3" component="h1">
          Producción y Saldo
        </Typography>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Input
            placeholder="Máquina: 430 o 430,429..."
            startDecorator={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 260 }}
          />
          <Button type="submit" loading={loading}>
            Buscar
          </Button>
        </form>
      </Stack>

      <Sheet
        variant="outlined"
        sx={{
          width: '100%',
          boxShadow: 'sm',
          borderRadius: 'sm',
          minHeight: 300,
        }}
      >
        <Table
          aria-label="produccion maquinas tree table"
          hoverRow
          stickyHeader
          sx={{
            '--Table-headerUnderlineThickness': '1px',
            '--TableCell-paddingX': '12px',
            '--TableCell-paddingY': '8px',
            '& th': {
              top: '76px',
            }
          }}
        >
          <thead>
            <tr style={{ backgroundColor: 'var(--joy-palette-background-level1)' }}>
              <th style={{ width: '40%' }}>Fecha / Turno</th>
              <th style={{ width: '20%', textAlign: 'center' }}>Piezas</th>
              <th style={{ width: '20%', textAlign: 'center' }}>Docenas</th>
              <th style={{ width: '20%', textAlign: 'center' }}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', py: 4 }}>
                  <Typography level="body-md" color="neutral">
                    Cargando datos...
                  </Typography>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', py: 4 }}>
                  <Typography level="body-md" color="neutral" sx={{ fontStyle: 'italic', py: 2 }}>
                    {searched ? 'No se encontraron registros para las máquinas especificadas.' : 'Ingresa los números de máquina arriba y haz clic en Buscar.'}
                  </Typography>
                </td>
              </tr>
            ) : (
              data.map((day) => <DayRow key={day.id} day={day} />)
            )}
          </tbody>
        </Table>
      </Sheet>
    </Box>
  );
}
