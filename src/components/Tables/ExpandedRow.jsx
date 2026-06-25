import IconButton from '@mui/joy/IconButton';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Switch from '@mui/joy/Switch';
import Table from '@mui/joy/Table';
import Typography from '@mui/joy/Typography';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useConfig } from '../../ConfigContext.jsx';
import dayjs from 'dayjs';
import { DatesContext } from '../../Contexts.js';
import KeyboardArrowLeftOutlined from '@mui/icons-material/KeyboardArrowLeftOutlined';
import KeyboardArrowRightOutlined from '@mui/icons-material/KeyboardArrowRightOutlined';
import TableSkeleton from './TableSkeleton.jsx';
import { useLocation } from 'react-router';
import localizedNum from '../../utils/numFormat.js';

let apiUrl;
export default function ExpandedRow({ numCols, row }) {
  apiUrl = useConfig().apiUrl;
  const { pathname } = useLocation();
  const { startDate, fromMonthStart, endDate } = useContext(DatesContext);
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [checked, setChecked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_LENGTH = 5; // each page will have 5 rows

  const searchBy = useMemo(
    () =>
      pathname === '/maquinas' || pathname === '/cambios' || pathname === '/offline' || pathname === '/disponibles'
        ? { machCode: row.MachCode || row['Máquina'] }
        : { articulo: row.Articulo, talle: row.Talle, color: row.ColorId },
    [pathname, row]
  );

  useEffect(() => {
    const params = new URLSearchParams({
      ...searchBy,
      startDate,
      fromMonthStart,
      endDate,
    });
    fetch(`${apiUrl}/historial?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setHistory(data);
        setFilteredHistory(data.filter((h) => h.Pieces > 0));
        setLoading(false);
      })
      .catch((err) =>
        console.error(
          `[CLIENT] Error fetching /historial for ${JSON.stringify(searchBy)}:`,
          err
        )
      );
  }, [searchBy, startDate, fromMonthStart, endDate]);

  const pageStart = (currPage) => {
    return currPage * PAGE_LENGTH - (PAGE_LENGTH - 1);
  };

  const pageEnd = (currPage) => {
    return currPage * PAGE_LENGTH;
  };

  return (
    <tr>
      <td style={{ height: 0, padding: 0 }} colSpan={numCols}>
        <Sheet
          variant='soft'
          sx={{
            p: 1,
            px: 6,
            boxShadow: 'inset 0 3px 6px 0 rgba(0 0 0 / 0.08)',
          }}
        >
          <Stack direction='row' className='justify-between'>
            <Typography level='body-lg' component='div' className='text-left!'>
              Historial
            </Typography>

            {history.length > 5 && (
              // pagination controls
              <Stack direction='row' className='items-center gap-8'>
                {/* filter zeroes */}
                <Typography
                  level='body-sm'
                  component='label'
                  endDecorator={
                    <Switch
                      sx={{ ml: 0.5 }}
                      size='sm'
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilteredHistory(
                            history.filter((h) => h.Pieces > 0)
                          );
                        } else {
                          setFilteredHistory([]);
                        }

                        setChecked(e.target.checked);
                      }}
                    />
                  }
                >
                  Ocultar registros vacíos
                </Typography>

                <Stack direction='row' className='items-center gap-2'>
                  <Typography level='body-sm' className='text-right!'>
                    {pageStart(page) === history.length
                      ? ''
                      : `${pageStart(page)}-`}
                    {pageEnd(page) < history.length
                      ? pageEnd(page)
                      : history.length}{' '}
                    de {history.length}
                  </Typography>

                  <Stack direction='row' className='items-center'>
                    <IconButton
                      variant='soft'
                      size='sm'
                      onClick={() => {
                        if (page > 1) setPage(page - 1);
                      }}
                    >
                      <KeyboardArrowLeftOutlined />
                    </IconButton>

                    <IconButton
                      variant='soft'
                      size='sm'
                      onClick={() => {
                        if (pageEnd(page) < history.length) setPage(page + 1);
                      }}
                    >
                      <KeyboardArrowRightOutlined />
                    </IconButton>
                  </Stack>
                </Stack>
              </Stack>
            )}
          </Stack>

          <Table
            borderAxis='bothBetween'
            size='sm'
            hoverRow
            aria-label='historial'
            sx={{
              '& tr > *:nth-of-type(1)': {
                textAlign: 'left !important',
              },
              '& tr > *:nth-of-type(n + 2)': {
                textAlign: 'center !important',
              },
              '& tr > *:nth-of-type(n + 5)': { textAlign: 'right !important' },
              '--TableCell-paddingX': '0.5rem',
            }}
          >
            <thead>
              <tr>
                <th className='w-[20%]'>Fecha</th>
                <th className='w-[5%]'>Turno</th>
                <th className='w-[10%]'>Máquina</th>
                <th className=''>Cadena</th>
                <th>Prendas</th>
                <th>Cuenta Prendas</th>
                <th>Target</th>
                <th>Descartes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton numCols={8} numRows={5} />
              ) : (
                (filteredHistory.length > 0 ? filteredHistory : history)
                  .slice(pageStart(page) - 1, pageEnd(page))
                  .map((historyRow) => (
                    <tr key={`${historyRow.MachCode}-${historyRow.DateRec}`}>
                      <td>
                        {dayjs
                          .tz(historyRow.DateRec)
                          .format('DD-MM-YYYY HH:mm:ss')}
                      </td>
                      <td>{historyRow.Shift}</td>
                      <td>{historyRow.MachCode}</td>
                      <td>{historyRow.StyleCode}</td>
                      <td>{localizedNum(historyRow.Pieces)}</td>
                      <td>{localizedNum(historyRow.OrderPieces)}</td>
                      <td>{localizedNum(historyRow.TargetPieces)}</td>
                      <td>{localizedNum(historyRow.Discards)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </Table>
        </Sheet>
      </td>
    </tr>
  );
}
