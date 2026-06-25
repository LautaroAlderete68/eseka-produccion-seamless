import { useOutletContext } from 'react-router';
import { useConfig } from '../ConfigContext.jsx';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { DatesContext } from '../Contexts.js';
import EnhancedTable from '../components/Tables/EnhancedTable.jsx';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import RefreshBtn from '../components/RefreshBtn.jsx';
import { StyledDatePicker } from '../components/Inputs/StyledPickers.jsx';
import ExpandRowBtn from '../components/Tables/ExpandRowBtn.jsx';
import Typography from '@mui/joy/Typography';
import localizedNum from '../utils/numFormat.js';

let apiUrl, sqlDateFormat;

export default function Cambios() {
  ({ apiUrl, sqlDateFormat } = useConfig());
  const { room } = useOutletContext();
  const [startDate, setStartDate] = useState(
    dayjs.tz().hour(6).minute(0).second(0)
  );
  const [data, setData] = useState([]);
  const [url, setUrl] = useState();

  useEffect(() => {
    let ignore = false;
    if (startDate) {
      if (!ignore) fetchCambios();
    }

    return () => {
      ignore = true;
    };
  }, [startDate]);

  const cols = [
    {
      id: 'Shift',
      label: 'Turno',
      align: 'center',
      width: 'w-[9%]',
    },
    {
      id: 'MachCode',
      label: 'Máquina',
      align: 'center',
      width: 'w-[9%]',
    },
    {
      id: 'Articulo',
      label: 'Artículo',
      width: 'w-[9%]',
      pdfRender: (row) => `${row.Articulo}${row.Tipo ? row.Tipo : ''}`,
    },
    {
      id: 'Talle',
      label: 'Talle',
      align: 'center',
      width: 'w-[9%]',
    },
    {
      id: 'Color',
      label: 'Color',
    },
    {
      id: 'Unidades',
      label: 'Unidades',
      align: 'right',
      pdfValue: (row) => calcProducido(row),
      pdfRender: (row) => unidadesStr(row),
    },
    {
      id: 'DateRec',
      label: 'Fecha',
      align: 'center',
      pdfRender: (row) => dayjs.tz(row.DateRec).format('DD/MM HH:mm'),
    },
  ];

  function fetchCambios() {
    const params = new URLSearchParams({
      room,
      startDate: startDate.format(sqlDateFormat),
    }).toString();
    fetch(`${apiUrl}/cambios?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setData(
          data.length === 0
            ? [
                {
                  Shift: null,
                  MachCode: null,
                  Articulo: 'No se encontraron cambios',
                  Talle: null,
                  Color: null,
                  Unidades: null,
                  Fecha: null,
                },
              ]
            : data
        );
      })
      .catch((err) => console.error('[CLIENT] Error fetching /cambios:', err));
  }

  function renderRow(row, i, opened, handleClick) {
    let rowClassName = '';
    if (row.Shift === 1) rowClassName = 'bg-turno-1';
    else if (row.Shift === 2) rowClassName = 'bg-turno-2';
    else if (row.Shift === 3) rowClassName = 'bg-turno-3';

    rowClassName = `${rowClassName} *:border-dark-accent hover:bg-row-hover`;

    return [
      rowClassName, // rowClassName
      <>
        {/* Turno */}
        <td align='center' className='font-semibold'>
          <Typography
            className='relative justify-center w-full'
            startDecorator={
              <ExpandRowBtn isOpen={opened === `${row.Shift}-${row.MachCode}`} handleClick={handleClick} />
            }
            sx={{
              '.MuiTypography-startDecorator': {
                m: 0,
                position: 'absolute',
                left: 0,
              },
            }}
          >
            {row.Shift}
          </Typography>
        </td>
        {/* Máquina */}
        <td align='center' className='font-semibold'>
          {row.MachCode}
        </td>
        {/* Artículo */}
        <td className='font-semibold'>{`${row.Articulo}${
          row.Tipo ? row.Tipo : ''
        }`}</td>
        {/* Talle */}
        <td align='center' className='font-semibold'>
          {row.Talle}
        </td>
        {/* Color */}
        <td
          className='font-semibold border-x'
          style={{
            backgroundColor: row.Hex,
            color: row.Hex ? (row.WhiteText ? 'white' : 'black') : 'inherit',
          }}
        >
          {row.Color}
        </td>
        {/* Unidades */}
        <td align='right'>{unidadesStr(row)}</td>
        {/* Fecha */}
        <td align='center'>{dayjs.tz(row.DateRec).format('DD/MM HH:mm')}</td>
      </>,
    ];
  }

  const countChangesPerShift = useMemo(() => {
    return data.reduce((acc, row) => {
      const shift = row.Shift;
      acc[shift] = (acc[shift] || 0) + 1;
      return acc;
    }, {});
  }, [data]);

  return (
    <Box>
      <Stack
        direction='row'
        className='sticky z-10 items-end gap-4 top-0 bg-[var(--joy-palette-background-body)] py-4'
      >
        <RefreshBtn handleRefresh={fetchCambios} />

        <StyledDatePicker
          label='Fecha'
          value={startDate}
          onChange={(newDate) => setStartDate(newDate)}
          disableFuture
        />
      </Stack>

      <DatesContext
        value={{
          startDate,
          fromMonthStart: false,
          endDate: startDate.add(1, 'day'),
        }}
      >
        <EnhancedTable
          cols={cols}
          rows={data}
          pdfRows={data}
          renderRow={renderRow}
          initOrder='asc'
          initOrderBy='Shift'
          headerTop='top-[94px]'
          footer={[
            `TURNO 1: ${countChangesPerShift[1] || 0}`,
            `TURNO 2: ${countChangesPerShift[2] || 0}`,
            `TURNO 3: ${countChangesPerShift[3] || 0}`,
            true,
            true,
          ]}
          checkboxVariant='soft'
          uniqueIds={['Shift', 'MachCode']}
        />
      </DatesContext>
    </Box>
  );
}

function calcProducido(row) {
  return row.Tipo === null
    ? row.Unidades
    : row.Tipo === '#'
    ? row.Unidades * 2
    : row.Unidades / 2;
}

function unidadesStr(row) {
  const producido = localizedNum(calcProducido(row));
  return row.Tipo === null
    ? producido
    : `${producido} (${localizedNum(row.Unidades)})`;
}
