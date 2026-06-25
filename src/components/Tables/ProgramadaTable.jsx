import { useEffect, useMemo, useState } from 'react';
import { useConfig } from '../../ConfigContext.jsx';
import Typography from '@mui/joy/Typography';
import TargetCol from './TargetCol.jsx';
import {
  aProducirStr,
  calcAProducir,
  calcFaltaUnidades,
  calcProducido,
  colorStr,
  faltaStr,
  footerFormat,
  producidoStr,
  roundUpEven,
} from '../../utils/progTableUtils.js';
import AProducirCol from './AProducirCol.jsx';
import EnhancedTable from './EnhancedTable.jsx';
import ArticuloCol from './ArticuloCol.jsx';
import { DatesContext } from '../../Contexts.js';
import ProgLegend from './ProgLegend.jsx';
import EditArtBtn from './EditArtBtn.jsx';
import { Link, useOutletContext, useLocation } from 'react-router';
import { getDuration, getDurationUnix } from '../../utils/maquinasUtils.js';
import localizedNum from '../../utils/numFormat.js';
import Stack from '@mui/joy/Stack';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import IconButton from '@mui/joy/IconButton';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import Recommend from '@mui/icons-material/Recommend';

let apiUrl;

function matchStyleAlert(alertStyle, rowArticulo) {
  if (!alertStyle || !rowArticulo) return false;
  
  const cleanAlert = String(alertStyle).trim().toUpperCase();
  const cleanRow = String(rowArticulo).trim().toUpperCase().replace(',', '.');
  
  if (cleanAlert === cleanRow) return true;

  const rowParts = cleanRow.split('.');
  const rowBase = parseInt(rowParts[0], 10);
  const rowDecimal = rowParts[1] || '';

  const alertMatch = cleanAlert.match(/^\d+/);
  if (!alertMatch) return false;
  
  const alertDigits = alertMatch[0];
  const alertBase = alertDigits.length >= 5 
    ? parseInt(alertDigits.substring(0, 5), 10) 
    : parseInt(alertDigits, 10);

  if (alertBase !== rowBase) return false;

  if (rowDecimal !== '') {
    const lastChar = cleanAlert.substring(cleanAlert.length - 1);
    return rowDecimal === lastChar;
  }

  return true;
}

export default function ProgramadaTable({
  startDate,
  progColor,
  setProgColor,
  filteredProgColor,
  setFilteredProgColor,
  live = true,
}) {
  apiUrl = useConfig().apiUrl;
  const { room, docena, porcExtra } = useOutletContext();
  const location = useLocation();
  const [activeGroupAlerts, setActiveGroupAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('activeGroupAlerts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [previousGroups, setPreviousGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('previousGroups');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [currentGroups, setCurrentGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('currentGroups');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    const checkStorage = () => {
      try {
        const savedAlerts = localStorage.getItem('activeGroupAlerts');
        const parsedAlerts = savedAlerts ? JSON.parse(savedAlerts) : [];
        setActiveGroupAlerts(parsedAlerts);

        const savedPrev = localStorage.getItem('previousGroups');
        const parsedPrev = savedPrev ? JSON.parse(savedPrev) : {};
        setPreviousGroups(parsedPrev);

        const savedCurr = localStorage.getItem('currentGroups');
        const parsedCurr = savedCurr ? JSON.parse(savedCurr) : {};
        setCurrentGroups(parsedCurr);
      } catch (e) {}
    };

    window.addEventListener('groups-refresh', checkStorage);

    const intervalId = setInterval(checkStorage, 5000);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('groups-refresh', checkStorage);
    };
  }, []);

  const acknowledgeGroup = async (styleCode) => {
    try {
      const res = await fetch(`${apiUrl}/grupos?_t=${Date.now()}`);
      if (!res.ok) return;
      const groupsData = await res.json();
      
      const styleStr = String(styleCode).trim();
      const group = groupsData.find(g => matchStyleAlert(g.style, styleStr));
      
      if (group) {
        const savedAck = localStorage.getItem('acknowledgedGroups');
        let acknowledgedGroups = savedAck ? JSON.parse(savedAck) : [];
        if (!Array.isArray(acknowledgedGroups)) acknowledgedGroups = [];
        
        const savedPrev = localStorage.getItem('previousGroups');
        let previousGroups = savedPrev ? JSON.parse(savedPrev) : {};
        
        if (!acknowledgedGroups.some(ack => String(ack).trim() === String(group.style).trim())) {
          acknowledgedGroups.push(group.style);
        }
        
        previousGroups[group.style] = group.maquinas;
        
        localStorage.setItem('acknowledgedGroups', JSON.stringify(acknowledgedGroups));
        localStorage.setItem('previousGroups', JSON.stringify(previousGroups));
        
        const savedAlerts = localStorage.getItem('activeGroupAlerts');
        const currentAlerts = savedAlerts ? JSON.parse(savedAlerts) : [];
        const newAlerts = currentAlerts.filter(s => String(s).trim() !== String(group.style).trim());
        localStorage.setItem('activeGroupAlerts', JSON.stringify(newAlerts));
        
        setActiveGroupAlerts(newAlerts);
      }
    } catch (e) {
      console.error('[CLIENT] Error acknowledging group:', e);
    }
  };

  const acknowledgeAllGroups = async () => {
    try {
      const res = await fetch(`${apiUrl}/grupos?_t=${Date.now()}`);
      if (!res.ok) return;
      const groupsData = await res.json();
      
      const savedAck = localStorage.getItem('acknowledgedGroups');
      let acknowledgedGroups = savedAck ? JSON.parse(savedAck) : [];
      if (!Array.isArray(acknowledgedGroups)) acknowledgedGroups = [];
      
      const savedPrev = localStorage.getItem('previousGroups');
      let previousGroups = savedPrev ? JSON.parse(savedPrev) : {};
      
      groupsData.forEach(group => {
        if (!acknowledgedGroups.some(ack => String(ack).trim() === String(group.style).trim())) {
          acknowledgedGroups.push(group.style);
        }
        previousGroups[group.style] = group.maquinas;
      });
      
      localStorage.setItem('acknowledgedGroups', JSON.stringify(acknowledgedGroups));
      localStorage.setItem('previousGroups', JSON.stringify(previousGroups));
      localStorage.setItem('activeGroupAlerts', JSON.stringify([]));
      
      setActiveGroupAlerts([]);
    } catch (e) {
      console.error('[CLIENT] Error acknowledging all groups:', e);
    }
  };

  const currentRoomAlertsCount = useMemo(() => {
    return activeGroupAlerts.filter(alertStyle => 
      progColor.some(row => matchStyleAlert(alertStyle, row.Articulo))
    ).length;
  }, [activeGroupAlerts, progColor]);

  useEffect(() => {
    let ignore = false;
    // fetch and repeat every minute
    function fetchProgColor() {
      if (startDate) {
        const params = new URLSearchParams({
          startDate,
          _t: Date.now(),
        }).toString();
        fetch(`${apiUrl}/${room}/programada?${params}`)
          .then((res) => res.json())
          .then((data) => {
            if (!ignore) {
              setProgColor(data);
              localStorage.setItem(`progColor-${room}`, JSON.stringify(data));
            }
          })
          .catch((err) =>
            console.error(`[CLIENT] Error fetching /${room}/programada:`, err)
          );
      } else if (startDate === null) {
        // dummy item to avoid infinite loading
        setProgColor([
          {
            Articulo: '',
            Talle: null,
            Color: '',
            ColorId: null,
            Porcentaje: null,
            Docenas: null,
            Producido: null,
            Target: null,
            Machines: [],
          },
        ]);
      }
    }

    if (live) {
      fetchProgColor();
      // update every minute
      const intervalId = setInterval(fetchProgColor, 60000);

      return () => {
        clearInterval(intervalId);
        ignore = true;
      };
    }
  }, [startDate, setProgColor, live, room]);

  const cols = [
    {
      id: 'Articulo',
      label: 'Artículo',
      align: 'right',
      labelWidth: 'min-w-16',
      pdfAlign: 'left',
      pdfRender: (row) => `${row.Articulo}${row.Tipo ? row.Tipo : ''}`,
    },
    {
      id: 'Talle',
      label: 'Talle',
      align: 'center',
      width: 'w-[7%]',
    },
    {
      id: 'Color',
      label: 'Color',
      width: 'w-[19%]',
      pdfRender: (row) => colorStr(row),
    },
    {
      id: 'Docenas',
      label: 'A Producir',
      align: 'right',
      pdfValue: (row) => calcAProducir(row), // for footer calc
      pdfRender: (row) => aProducirStr(row), // for rendering
    },
    {
      id: 'Producido',
      label: 'Producido',
      align: 'right',
      pdfValue: (row) => calcProducido(row, docena, porcExtra),
      pdfRender: (row) => producidoStr(row, docena, porcExtra),
    },
    {
      id: 'falta',
      label: 'Falta',
      align: 'right',
      pdfValue: (row) =>
        calcAProducir(row) - calcProducido(row, docena, porcExtra),
      pdfRender: (row) => faltaStr(row, docena, porcExtra),
      sortFn: (a, b, order) => {
        const faltaCalc = (row, order) => {
          const falta = row.Docenas - row.Producido / docena / porcExtra;
          // send to bottom if falta is negative
          if (falta <= 0) {
            return order === 'asc' ? Number.POSITIVE_INFINITY : 0;
          }
          return falta;
        };

        const aFalta = faltaCalc(a, order);
        const bFalta = faltaCalc(b, order);
        return bFalta - aFalta;
      },
    },
    room === 'SEAMLESS'
      ? {
          id: 'faltaUnidades',
          label: 'Falta (un)',
          align: 'right',
          pdfRender: (row) => localizedNum(row.Target - row.Producido),
          sortFn: (a, b, order) => {
            const faltaCalc = (row, order) => {
              const faltaUn = row.Target - row.Producido;
              // send to bottom if falta is negative
              if (faltaUn <= 0) {
                return order === 'asc' ? Infinity : 0;
              }
              return faltaUn;
            };

            const aFaltaUn = faltaCalc(a, order);
            const bFaltaUn = faltaCalc(b, order);
            return bFaltaUn - aFaltaUn;
          },
        }
      : live
      ? {
          id: 'idealTime',
          label: 'Tiempo Min.',
          align: 'center',
          width: 'w-[12%]',
          pdfRender: (row) => {
            if (!live) return '';

            const idealTime = calcIdealTime(row);
            switch (idealTime) {
              case 0:
                return '';
              case -1:
                return 'LLEGÓ';
              default:
                return getDuration(idealTime);
            }
          },
          sortFn: (a, b, order) => {
            if (!live) return 0;

            const aIdealTime = calcIdealTime(a);
            const bIdealTime = calcIdealTime(b);

            // articulos not in production to bottom always
            // doing this first guarantees producing items remain at the
            // beginning
            if (!aIdealTime && a.Machines.length === 0)
              return order === 'asc' ? -Infinity : Infinity;
            if (!bIdealTime && b.Machines.length === 0)
              return order === 'asc' ? Infinity : -Infinity;

            // if ideal time is 0 and is producing, place at top always
            if (aIdealTime === 0 && a.Machines.length > 0)
              return order === 'asc' ? 1 : -1;
            if (bIdealTime === 0 && b.Machines.length > 0)
              return order === 'asc' ? -1 : 1;

            // always place LLEGÓ at the top when asc
            // place at bottom when descending
            if (aIdealTime === -1) return order === 'asc' ? 1 : 1;
            if (bIdealTime === -1) return order === 'asc' ? -1 : -1;

            // if not LLEGÓ, sort by ideal time duration
            let aDuration = getDurationUnix(aIdealTime);
            let bDuration = getDurationUnix(bIdealTime);

            return bDuration - aDuration;
          },
        }
      : {
          id: 'faltaUnidades',
          label: 'Falta (un)',
          align: 'right',
          pdfRender: (row) => localizedNum(row.Target - row.Producido),
          sortFn: (a, b, order) => {
            const faltaCalc = (row, order) => {
              const faltaUn = row.Target - row.Producido;
              // send to bottom if falta is negative
              if (faltaUn <= 0) {
                return order === 'asc' ? Infinity : 0;
              }
              return faltaUn;
            };

            const aFaltaUn = faltaCalc(a, order);
            const bFaltaUn = faltaCalc(b, order);
            return bFaltaUn - aFaltaUn;
          },
        },
    (live || room === 'SEAMLESS') && {
      id: 'target',
      label: 'Target (un)',
      align: 'right',
      width: 'w-[11%]',
      pdfRender: (row) => {
        const faltaUnidades = calcFaltaUnidades(row);
        if (faltaUnidades <= 0) return 'LLEGÓ';

        let target;

        if (row.Producido === 0 || row.Machines.length > 1) target = row.Target;

        if (row.Machines.length <= 1)
          target = roundUpEven(faltaUnidades + (row.Machines[0]?.Pieces || 0));

        return localizedNum(target);
      },
      sortFn: (a, b, order) => {
        const targetCalc = (row, order) => {
          const faltaUn = row.Target - row.Producido;
          // send to bottom if target was met
          if (faltaUn <= 0) {
            return order === 'asc' ? Number.POSITIVE_INFINITY : 0;
          }

          return row.Producido === 0
            ? row.Target
            : roundUpEven(
                faltaUn +
                  row.Machines.reduce(
                    (acc, mach) => acc + (mach.Pieces || 0),
                    0
                  )
              );
        };

        const aTarget = targetCalc(a, order);
        const bTarget = targetCalc(b, order);
        return bTarget - aTarget;
      },
    },
    live && {
      id: 'machines',
      label: 'Máquinas',
      width: 'w-[11%]',
      align: room === 'HOMBRE' ? 'center' : null, // left
      pdfAlign: 'center',
      pdfRender: (row) => {
        if (row.Machines.length <= 3)
          return row.Machines.map((m) => m.MachCode).join(', ');
        else return `${row.Machines.length} mqs.`;
      },
      sortFn: (a, b, order) => {
        // machines is sorted, so compare only first machine if multiple
        let aMachine = a.Machines[0]?.MachCode;
        let bMachine = b.Machines[0]?.MachCode;

        // // send articulos with no machines to the bottom depending on order
        if (!aMachine) aMachine = order === 'asc' ? Infinity : -Infinity;
        if (!bMachine) bMachine = order === 'asc' ? Infinity : -Infinity;

        return bMachine - aMachine;
      },
    },
  ];

  function renderRow(row, i, opened, handleClick) {
    const faltaUnidades = calcFaltaUnidades(row);

    const isGroupAlertActive = activeGroupAlerts.some(alertStyle => matchStyleAlert(alertStyle, row.Articulo));

    let machinesList;
    if (isGroupAlertActive) {
      const matchedPrevKey = Object.keys(previousGroups).find(k => matchStyleAlert(k, row.Articulo));
      const prevMachines = matchedPrevKey 
        ? (previousGroups[matchedPrevKey] || []).map(m => String(m).trim())
        : [];

      const currentMachineCodes = row.Machines.map(m => String(m.MachCode).trim());

      const addedMachines = currentMachineCodes.filter(m => !prevMachines.includes(m));
      const removedMachines = prevMachines.filter(m => !currentMachineCodes.includes(m));

       const activeList = row.Machines.map((m) => {
        const isAdded = addedMachines.includes(String(m.MachCode).trim());
        return (
          <Typography
            key={m.MachCode}
            sx={{
              color: isAdded ? 'var(--icon-color-success)' : 'inherit',
              fontWeight: isAdded ? 'bold' : 'normal',
            }}
          >
            {isAdded ? `${m.MachCode} +` : m.MachCode} {room === 'SEAMLESS' ? `(P: ${localizedNum(m.Pieces)})` : ''}
          </Typography>
        );
      });

      const removedList = removedMachines.map((machCode) => {
        return (
          <Typography
            key={`removed-${machCode}`}
            sx={{
              color: 'var(--icon-color-danger)',
              fontWeight: 'bold',
            }}
          >
            {machCode} -
          </Typography>
        );
      });

      machinesList = [...activeList, ...removedList];
    } else {
      machinesList = row.Machines.map((m) => {
        return (
          <Typography key={m.MachCode}>{`${m.MachCode} ${
            room === 'SEAMLESS' ? `(P: ${localizedNum(m.Pieces)})` : ''
          }`}</Typography>
        );
      });
    }

    let rowClassName = 'bg-todo';
    let pulseClass = 'animate-pulse-todo';
    if (!row.Docenas && row.Docenas !== 0) {
      rowClassName = ''; // NO TIENE DISTR, FALTA ASIGNAR
      pulseClass = 'animate-pulse-default';
    } else if (row.Machines.length > 0) {
      rowClassName = 'bg-making'; // TEJIENDO
      pulseClass = 'animate-pulse-making';
    } else if (faltaUnidades <= 0) {
      rowClassName = 'bg-done'; // LLEGÓ
      pulseClass = 'animate-pulse-done';
    } else if (row.Machines.length === 0 && faltaUnidades <= 24) {
      rowClassName = 'bg-almost-done'; // CASI LLEGÓ - Menos de dos docena
      pulseClass = 'animate-pulse-almost-done';
    } else if (row.Machines.length === 0 && faltaUnidades < row.Target) {
      rowClassName = 'bg-incomplete'; // INCOMPLETO
      pulseClass = 'animate-pulse-incomplete';
    }

    if (isGroupAlertActive) {
      rowClassName = `${rowClassName} ${pulseClass} font-semibold`;
    }

    rowClassName = `${rowClassName} *:border-dark-accent hover:bg-row-hover`;

    return [
      startDate !== null ? rowClassName : 'hover:bg-transparent',
      // Render each cell in the row
      startDate !== null ? (
        <>
          {/* Articulo */}
          <ArticuloCol
            row={row}
            isOpen={opened === `${row.Articulo}-${row.Talle}-${row.ColorId}`}
            handleRowClick={handleClick}
            rowColor={rowClassName}
          />
          {/* Talle */}
          <td className='font-semibold text-center'>{row.Talle}</td>
          {/* Color + Porcentaje */}
          <td
            className='font-semibold border-x group/color'
            style={{
              backgroundColor: row.Hex,
              color: row.Hex ? (row.WhiteText ? 'white' : 'black') : 'inherit',
            }}
          >
            <Typography
              className='relative w-fit'
              endDecorator={
                live && (
                  <EditArtBtn
                    articulo={row.Articulo}
                    tipo={row.Tipo}
                    talle={row.Talle}
                  />
                )
              }
            >
              {colorStr(row)}
            </Typography>
          </td>
          {/* A Producir */}
          <td className='text-right group/prod'>
            <AProducirCol
              row={row}
              startDate={startDate}
              setProgColor={setProgColor}
              setFilteredProgColor={setFilteredProgColor}
              live={live}
            />
          </td>
          {/* Producido */}
          <td className='text-right'>{producidoStr(row, docena, porcExtra)}</td>
          {/* Falta */}
          <td className='text-right'>{faltaStr(row, docena, porcExtra)}</td>
          {/* Falta (un.) */}
          {room === 'SEAMLESS' ? (
            <td className='text-right'>{localizedNum(faltaUnidades)}</td>
          ) : live ? (
            <td className='text-center'>
              {calcIdealTime(row) === -1 ? (
                'Llegó'
              ) : (
                getDuration(calcIdealTime(row))
              )}
            </td>
          ) : (
            <td className='text-right'>{localizedNum(faltaUnidades)}</td>
          )}
          {/* Target (un.) or Tiempo al 100% */}
          {(live || room === 'SEAMLESS') && (
            <td className='text-right'>
              <TargetCol row={row} faltaUnidades={faltaUnidades} />
            </td>
          )}
          {/* Maquinas */}
          {live && (
            <td className={room === 'HOMBRE' ? 'text-center' : ''}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent={room === 'HOMBRE' ? 'center' : 'flex-start'}
                spacing={1}
                sx={{ pl: room === 'HOMBRE' ? 0 : 1 }}
              >
                <Box>{machinesList}</Box>
                {isGroupAlertActive && (
                  <IconButton
                    size="md"
                    variant="plain"
                    onClick={(e) => {
                      e.stopPropagation();
                      acknowledgeGroup(row.Articulo);
                    }}
                    sx={{
                      '--IconButton-size': '32px',
                      color: 'var(--icon-color-success)',
                      '&:hover': {
                        backgroundColor: 'var(--joy-palette-success-softBg)',
                      },
                    }}
                    title="Marcar grupo como revisado"
                  >
                    <CheckCircleOutlined sx={{ fontSize: '24px' }} />
                  </IconButton>
                )}
              </Stack>
            </td>
          )}
        </>
      ) : (
        <>
          <td colSpan={cols.length} className='**:text-center'>
            <Stack direction='column' className='gap-4'>
              <Typography className='font-semibold'>
                No hay programada para el mes actual.
              </Typography>
              <Typography>
                Puede ver lo que se está produciendo actualmente en{' '}
                <Link
                  to='/produccion'
                  className='font-semibold underline text-primary'
                >
                  Producción
                </Link>
                .
              </Typography>
              <Typography>
                Vaya a{' '}
                <Link
                  to='/programada/anteriores'
                  className='font-semibold underline text-primary'
                >
                  Anteriores
                </Link>{' '}
                para ver las programadas pasadas.
              </Typography>
            </Stack>
          </td>
        </>
      ),
    ];
  }

  // Memoized totals for footer
  const totalAProducir = useMemo(() => {
    let progToUse =
      filteredProgColor.length > 0 ? filteredProgColor : progColor;
    return progToUse.reduce((acc, row) => acc + calcAProducir(row), 0);
  }, [progColor, filteredProgColor]);
  const totalProducido = useMemo(() => {
    let progToUse =
      filteredProgColor.length > 0 ? filteredProgColor : progColor;
    return progToUse.reduce(
      (acc, row) => acc + calcProducido(row, docena, porcExtra),
      0
    );
  }, [progColor, filteredProgColor]);
  const totalFalta = useMemo(
    () => totalAProducir - totalProducido,
    [totalAProducir, totalProducido]
  );

  return (
    <DatesContext value={{ startDate, fromMonthStart: true, endDate: null }}>
      <EnhancedTable
        key={live ? 'live' : 'history'}
        cols={cols}
        rows={
          (startDate || live) && progColor && filteredProgColor.length === 0
            ? progColor
            : filteredProgColor
        }
        pdfRows={progColor}
        renderRow={renderRow}
        initOrder='asc'
        initOrderBy={live ? (room === 'SEAMLESS' ? 'machines' : 'idealTime') : 'Articulo'}
        storageKey={`${location.pathname}-${room}`}
        footer={[
          'Total',
          footerFormat(totalAProducir), // Total A Producir
          footerFormat(totalProducido), // Total Producido
          footerFormat(totalFalta), // Total Falta
          !live ? (
            room === 'HOMBRE' ? (
              <ProgLegend live={live} />
            ) : (
              true
            )
          ) : (
            true
          ),
          !live && room === 'SEAMLESS' ? (
            <ProgLegend live={live} />
          ) : !live && room === 'HOMBRE' ? (
            false
          ) : (
            true
          ),
          live && <ProgLegend live={live} />,
        ]}
        headerTop='top-[94px]'
        stripe=''
        checkboxVariant='soft'
      />
    </DatesContext>
  );
}

function calcIdealTime(row) {
  if (row.Machines.length === 0) return 0;

  const faltaUnidades = row.Target - row.Producido;
  if (faltaUnidades <= 0) return -1; // target was reached

  const maxIdealCycle = Math.max(...row.Machines.map((m) => m.IdealCycle));
  if (maxIdealCycle === 0) return 0;

  const seconds = maxIdealCycle * faltaUnidades;
  const secondsPerMach = seconds / row.Machines.length;
  return secondsPerMach;
}
