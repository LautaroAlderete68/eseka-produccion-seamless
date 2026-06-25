import { useOutletContext } from 'react-router';
import { useConfig } from '../ConfigContext.jsx';
import { useEffect, useState } from 'react';
import EnhancedTable from '../components/Tables/EnhancedTable.jsx';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import RefreshBtn from '../components/RefreshBtn.jsx';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import Chip from '@mui/joy/Chip';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import { DatesContext } from '../Contexts.js';
import dayjs from 'dayjs';
import ExpandRowBtn from '../components/Tables/ExpandRowBtn.jsx';

let apiUrl;

export default function Offline() {
  ({ apiUrl } = useConfig());
  const { room } = useOutletContext();
  const [data, setData] = useState([]);
  const [alertMachines, setAlertMachines] = useState(() => {
    try {
      const saved = localStorage.getItem('alertMachines');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    fetchOffline();
    const interval = setInterval(fetchOffline, 30000); // auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, [alertMachines]);

  function fetchOffline() {
    fetch(`${apiUrl}/offline`)
      .then((res) => {
        if (!res.ok) throw new Error('HTTP error ' + res.status);
        return res.json();
      })
      .then((incomingData) => {
        if (!Array.isArray(incomingData)) {
          throw new Error('Data is not an array');
        }

        // Calculate new offline machines
        const currentMachines = incomingData.map(row => row['Máquina']).filter(Boolean);
        
        let previousMachines = [];
        try {
          const savedPrev = localStorage.getItem('previousMachines');
          previousMachines = savedPrev ? JSON.parse(savedPrev) : [];
          if (!Array.isArray(previousMachines)) previousMachines = [];
        } catch (e) {
          previousMachines = [];
        }
        
        // Find machines that are in current offline list but weren't in previous offline list
        const newOffline = currentMachines.filter(m => !previousMachines.includes(m));
        
        let latestAlerts = [];
        try {
          const savedAlerts = localStorage.getItem('alertMachines');
          latestAlerts = savedAlerts ? JSON.parse(savedAlerts) : [];
          if (!Array.isArray(latestAlerts)) latestAlerts = [];
        } catch (e) {}

        let updatedAlerts = [...latestAlerts];
        let hasNewAlerts = false;
        
        if (newOffline.length > 0) {
          // Add new ones to alerts list
          const uniqueNewAlerts = newOffline.filter(m => !updatedAlerts.includes(m));
          if (uniqueNewAlerts.length > 0) {
            updatedAlerts = [...updatedAlerts, ...uniqueNewAlerts];
            hasNewAlerts = true;
          }
        }
        
        if (hasNewAlerts || alertMachines.length !== updatedAlerts.length) {
          setAlertMachines(updatedAlerts);
          localStorage.setItem('alertMachines', JSON.stringify(updatedAlerts));
        }
        
        localStorage.setItem('previousMachines', JSON.stringify(currentMachines));

        if (incomingData.length === 0) {
          setData([
            {
              'Room': '',
              'Máquina': 'No hay máquinas offline',
              'Target': 0,
              'OrderPieces': 0,
              'Último Registro': null
            }
          ]);
        } else {
          setData(incomingData);
        }
      })
      .catch((err) => {
        console.error('[CLIENT] Error fetching /offline:', err);
        setData([
          {
            'Room': '',
            'Máquina': 'Error al conectar con el servidor',
            'Target': 0,
            'OrderPieces': 0,
            'Último Registro': null
          }
        ]);
      });
  }

  function handleTodoRevisado() {
    setAlertMachines([]);
    localStorage.setItem('alertMachines', JSON.stringify([]));
  }

  const cols = [
    {
      id: 'Room',
      label: 'Sala',
      align: 'center',
      width: 'w-[25%]',
    },
    {
      id: 'Máquina',
      label: 'Máquina',
      align: 'center',
      width: 'w-[25%]',
    },
    {
      id: 'Llegó Target',
      label: '¿Llegó al target?',
      align: 'center',
      width: 'w-[25%]',
    },
    {
      id: 'Último Registro',
      label: 'Último Registro',
      align: 'center',
      width: 'w-[25%]',
    },
  ];

  function renderRow(row, i, opened, handleClick) {
    const isAlert = alertMachines.includes(row['Máquina']);
    const isNoData = row['Máquina'] === 'No hay máquinas offline' || row['Máquina'] === 'Error al conectar con el servidor';
    
    // Highlight alert rows with a premium yellow/amber background (matching 'alert_rows' in python)
    const rowClassName = isNoData 
      ? '*:border-dark-accent bg-neutral-50 italic text-neutral-500'
      : isAlert 
        ? 'bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 *:border-dark-accent font-semibold' 
        : '*:border-dark-accent hover:bg-row-hover';

    return [
      rowClassName,
      <>
        <td align='center'>
          <Typography
            className='relative justify-center w-full'
            startDecorator={
              !isNoData && (
                <ExpandRowBtn
                  isOpen={opened === row['Máquina']}
                  handleClick={handleClick}
                />
              )
            }
            sx={{
              '.MuiTypography-startDecorator': {
                m: 0,
                position: 'absolute',
                left: 0,
              },
            }}
          >
            {row['Room'] || '-'}
          </Typography>
        </td>
        <td align='center' className='font-semibold'>
          {row['Máquina']}
        </td>
        <td align='center'>
          {isNoData ? '-' : (() => {
            const target = row.Target ?? row.target ?? 0;
            const orderPieces = row.OrderPieces ?? row.orderPieces ?? 0;
            const didNotReach = target > 0 && orderPieces < target;
            return (
              <Chip
                variant='soft'
                color={didNotReach ? 'danger' : 'success'}
                size='sm'
              >
                {didNotReach ? 'No' : 'Sí'}
              </Chip>
            );
          })()}
        </td>
        <td align='center'>
          {row['Último Registro'] ? dayjs.tz(row['Último Registro']).format('DD/MM/YYYY HH:mm:ss') : '-'}
        </td>
      </>
    ];
  }

  return (
    <Box>
      <Stack
        direction='row'
        className='sticky z-10 items-end justify-between gap-4 top-0 bg-[var(--joy-palette-background-body)] py-4'
      >
        <Stack direction='row' gap={2} alignItems='center'>
          <RefreshBtn handleRefresh={fetchOffline} />
          <Typography level="h3" component="h1">Máquinas Offline</Typography>
        </Stack>

        <Button
          variant="solid"
          color="warning"
          startDecorator={<CheckCircleOutlined />}
          onClick={handleTodoRevisado}
          disabled={alertMachines.length === 0}
        >
          TODO REVISADO
        </Button>
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
          initOrderBy='Máquina'
          headerTop='top-[68px]'
          footer={[true, true]}
          uniqueIds={['Máquina']}
        />
      </DatesContext>
    </Box>
  );
}
