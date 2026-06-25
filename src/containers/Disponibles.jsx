import { useOutletContext } from 'react-router';
import { useConfig } from '../ConfigContext.jsx';
import { useEffect, useState } from 'react';
import EnhancedTable from '../components/Tables/EnhancedTable.jsx';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import RefreshBtn from '../components/RefreshBtn.jsx';
import Typography from '@mui/joy/Typography';
import Chip from '@mui/joy/Chip';
import { DatesContext } from '../Contexts.js';
import dayjs from 'dayjs';
import ExpandRowBtn from '../components/Tables/ExpandRowBtn.jsx';

let apiUrl;

export default function Disponibles() {
  ({ apiUrl } = useConfig());
  const { room } = useOutletContext();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDisponibles();
    const interval = setInterval(fetchDisponibles, 30000);
    return () => clearInterval(interval);
  }, [room]);

  async function fetchDisponibles() {
    setLoading(true);
    try {
      // Fetch machines and current schedule in parallel
      const [machinesRes, startDateRes] = await Promise.all([
        fetch(`${apiUrl}/disponibles?room=${room}`),
        fetch(`${apiUrl}/${room}/programada/actualDate`),
      ]);

      if (!machinesRes.ok || !startDateRes.ok) throw new Error('HTTP error');

      const machines = await machinesRes.json();
      const startDateData = await startDateRes.json();

      const now = dayjs.tz();
      const month = now.month() + 1;
      const year = now.year();
      let startDate = null;
      if (
        Array.isArray(startDateData) &&
        startDateData[0]?.Month === month &&
        startDateData[0]?.Year === year
      ) {
        startDate = startDateData[0].Date;
      }

      // Only proceed if we have a valid start date
      let progColor = [];
      if (startDate) {
        const progRes = await fetch(
          `${apiUrl}/${room}/programada?${new URLSearchParams({ startDate })}`
        );
        if (progRes.ok) {
          progColor = await progRes.json();
        }
      }

      // All State=8 machines (STOP PRODUCCIÓN)
      const state8Machines = machines.filter((m) => m.State === 8);

      if (state8Machines.length === 0) {
        setData([
          {
            MachCode: null,
            Sala: '',
            Cadena: 'No hay máquinas con STOP PRODUCCIÓN',
            _noData: true,
          },
        ]);
      } else {
        // Enrich each machine with its matching schedule row + targetMet flag
        const enriched = state8Machines.map((m) => {
          const hasValidCode = typeof m.StyleCode?.articulo !== 'string';

          let matchingRow = null;
          if (hasValidCode) {
            const machArticulo = m.StyleCode.punto
              ? parseFloat(`${m.StyleCode.articulo}.${m.StyleCode.punto}`)
              : m.StyleCode.articulo;

            matchingRow = progColor.find(
              (row) =>
                machArticulo === row.Articulo &&
                m.StyleCode.talle === row.Talle &&
                m.StyleCode.colorId === row.ColorId
            );
          }

          const target = matchingRow?.Target ?? 0;
          const producido = matchingRow?.Producido ?? 0;
          const faltaUnidades = target - producido;
          const targetMet = target > 0 && faltaUnidades <= 0;

          return {
            ...m,
            Sala: (m.RoomCode || '').trim(),
            Articulo: matchingRow?.Articulo ?? '',
            Talle: matchingRow?.Talle ?? m.StyleCode?.talle,
            Color: matchingRow?.Color ?? '',
            Target: target,
            Producido: producido,
            targetMet,
          };
        });

        // Filter out machines with empty/missing LastStyleCode or StyleCode.styleCode, '00' chains, or MachCode = 435
        const filteredEnriched = enriched.filter((m) => {
          const styleCode = m.LastStyleCode ?? m.StyleCode?.styleCode;
          return (
            Number(m.MachCode) !== 435 &&
            styleCode &&
            styleCode.trim() !== '' &&
            styleCode.trim() !== '-' &&
            styleCode.trim() !== '00'
          );
        });

        if (filteredEnriched.length === 0) {
          setData([
            {
              MachCode: null,
              Sala: '',
              Cadena: 'No hay máquinas con STOP PRODUCCIÓN',
              _noData: true,
            },
          ]);
        } else {
          setData(filteredEnriched);
        }
      }
    } catch (err) {
      console.error('[CLIENT] Error fetching disponibles:', err);
      setData([
        {
          MachCode: null,
          'Sala': '',
          'Cadena': 'Error al conectar con el servidor',
          _noData: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const cols = [
    {
      id: 'MachCode',
      label: 'Máquina',
      align: 'center',
      width: 'w-[15%]',
    },
    {
      id: 'Sala',
      label: 'Sala',
      align: 'center',
      width: 'w-[15%]',
    },
    {
      id: 'styleCode',
      label: 'Cadena actual',
      align: 'center',
      width: 'w-[20%]',
    },
    {
      id: 'Articulo',
      label: 'Artículo',
      align: 'center',
      width: 'w-[15%]',
    },
    {
      id: 'targetMet',
      label: 'Artículo completado',
      align: 'center',
      width: 'w-[15%]',
    },
    {
      id: 'dateRec',
      label: 'Último Registro',
      align: 'center',
      width: 'w-[20%]',
    },
  ];

  function renderRow(row, i, opened, handleClick) {
    const isNoData = row._noData;

    const targetMet = row.targetMet;
    const rowClassName = isNoData
      ? '*:border-dark-accent bg-neutral-50 italic text-neutral-500'
      : targetMet
        ? '*:border-dark-accent hover:bg-row-hover'                                          // sin color: llegó al target
        : 'bg-yellow-100 dark:bg-yellow-900/20 *:border-dark-accent hover:bg-row-hover';   // amarillo suave: no llegó

    if (isNoData) {
      return [
        rowClassName,
        <>
          <td align='center'>{'-'}</td>
          <td align='center'>{'-'}</td>
          <td align='center' className='font-semibold'>
            {row['Cadena'] || '-'}
          </td>
          <td align='center'>{'-'}</td>
          <td align='center'>{'-'}</td>
          <td align='center'>{'-'}</td>
        </>,
      ];
    }

    const styleCode = row.LastStyleCode ?? row.StyleCode?.styleCode ?? '-';
    // Format article the same way as "Actual" tab: articulo.punto (e.g. 2621.02)
    const sc = row.StyleCode;
    const articulo = sc && typeof sc.articulo !== 'string' && sc.articulo
      ? sc.punto && sc.punto !== '00'
        ? Number(`${sc.articulo}.${sc.punto}`)
        : sc.articulo
      : (row.Articulo || '-');

    return [
      rowClassName,
      <>
        <td align='center' className='font-semibold'>
          <Typography
            className='relative justify-center w-full'
            startDecorator={
              <ExpandRowBtn
                isOpen={opened === row.MachCode}
                handleClick={handleClick}
              />
            }
            sx={{
              '.MuiTypography-startDecorator': {
                m: 0,
                position: 'absolute',
                left: 0,
              },
            }}
          >
            {row.MachCode}
          </Typography>
        </td>
        <td align='center'>{row.Sala || '-'}</td>
        <td align='center' className='font-semibold'>
          {styleCode}
        </td>
        <td align='center'>{articulo}</td>
        <td align='center'>
          <Chip variant='soft' color={row.targetMet ? 'success' : 'warning'} size='sm'>
            {row.targetMet ? 'Sí' : 'No'}
          </Chip>
        </td>
        <td align='center'>
          {row.DateRec
            ? dayjs.tz(row.DateRec).format('DD/MM/YYYY HH:mm:ss')
            : '-'}
        </td>
      </>,
    ];
  }

  return (
    <Box>
      <Stack
        direction='row'
        className='sticky z-10 items-end justify-between gap-4 top-0 bg-[var(--joy-palette-background-body)] py-4'
      >
        <Stack direction='row' gap={2} alignItems='center'>
          <RefreshBtn handleRefresh={fetchDisponibles} />
          <Typography level='h3' component='h1'>
            Máquinas Disponibles
          </Typography>
        </Stack>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          Máquinas con State=8 que llegaron al target de producción
        </Typography>
      </Stack>

      <DatesContext
        value={{
          startDate: dayjs.tz(),
          fromMonthStart: true,
          endDate: null,
        }}
      >
        <EnhancedTable
          cols={cols}
          rows={data}
          pdfRows={data}
          renderRow={renderRow}
          initOrder='asc'
          initOrderBy='MachCode'
          headerTop='top-[68px]'
          footer={[
            ' ',          // Cadena (col 2)
            ' ',          // Artículo (col 3)
            ' ',          // Target Producido (col 4)
            `${data.filter(r => !r._noData).length} disponibles`, // Último Registro (col 5)
          ]}
          uniqueIds={['MachCode']}
        />
      </DatesContext>
    </Box>
  );
}
