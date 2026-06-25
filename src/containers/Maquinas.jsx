import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useConfig } from '../ConfigContext.jsx';
import Stack from '@mui/joy/Stack';
import RefreshBtn from '../components/RefreshBtn.jsx';
import MaquinasTable from '../components/Tables/MaquinasTable.jsx';
import MachSearchForm from '../components/Forms/MachSearchForm.jsx';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import Tab, { tabClasses } from '@mui/joy/Tab';
import TabList from '@mui/joy/TabList';
import TabPanel from '@mui/joy/TabPanel';
import Tabs from '@mui/joy/Tabs';
import MapOutlined from '@mui/icons-material/MapOutlined';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import MaquinasMap from '../components/MaquinasMap.jsx';
import { useOutletContext, useLocation } from 'react-router';
import { ToastsContext } from '../Contexts.js';
import dayjs from 'dayjs';
import Switch from '@mui/joy/Switch';
import Typography from '@mui/joy/Typography';
import ElectricBoltOutlined from '@mui/icons-material/ElectricBoltOutlined';
import Warning from '@mui/icons-material/Warning';
import { playAlertSound } from '../utils/playAlertSound.js';
import sendTelegramAlert from '../utils/sendTelegramAlert.js';

let apiUrl;

export default function Maquinas() {
  apiUrl = useConfig().apiUrl;
  const { addToast, removeToast } = useContext(ToastsContext);
  const { room } = useOutletContext();
  const location = useLocation();
  const isElectronica = location.pathname === '/electronica';
  const [machines, setMachines] = useState([]);
  const [filteredMachines, setFilteredMachines] = useState([]);
  const [defaultTab, setDefaultTab] = useState(
    JSON.parse(localStorage.getItem('machTab')) || 0
  );
  const [onlyStopElectronico, setOnlyStopElectronico] = useState(false);

  const getMachines = () => {
    const fetchRoom = isElectronica ? 'ELECTRONICA' : room;
    fetch(`${apiUrl}/${fetchRoom}/machines`)
      .then((res) => res.json())
      .then((data) => {
        let machs = [...data];
        setMachines(machs);
      })
      .catch((err) =>
        console.error(`[CLIENT] Error fetching /${fetchRoom}/machines:`, err)
      );
  };

  // get machines on load and room change
  useEffect(() => {
    let ignore = false;
    if (!ignore) getMachines();
    // update every 30 seconds
    const intervalId = setInterval(() => {
      if (!ignore) getMachines();
    }, 30000);

    return () => {
      ignore = true;
      clearInterval(intervalId);
    };
  }, [room, isElectronica]);

  const displayedMachines = useMemo(() => {
    if (isElectronica && onlyStopElectronico) {
      return machines.filter((m) => m.State === 6);
    }
    return machines;
  }, [machines, isElectronica, onlyStopElectronico]);

  const sortedMachines = useMemo(
    () => [...displayedMachines].sort((a, b) => a.MachCode - b.MachCode),
    [displayedMachines]
  );

  const sortedFiltered = useMemo(
    () => [...filteredMachines].sort((a, b) => a.MachCode - b.MachCode),
    [filteredMachines]
  );

  const electronicoMachs = useMemo(
    () => machines.filter((m) => m.State === 6), // electronico
    [machines]
  );

  const electronicoIds = useMemo(
    () => electronicoMachs.map((m) => m.MachCode),
    [electronicoMachs]
  );

  const lastNotifiedIdsRef = useRef([]);

  // when there is a mach with electronico stop, send toast
  useEffect(() => {
    if (!isElectronica) return;

    let ignore = false;

    const currentIds = electronicoIds;
    const lastIds = lastNotifiedIdsRef.current;

    // Find new machines
    const newIds = currentIds.filter((id) => !lastIds.includes(id));
    // Find removed machines
    const removedIds = lastIds.filter((id) => !currentIds.includes(id));

    // add toast for new machines
    if (newIds.length > 0) {
      newIds.forEach((id) => {
        addToast({
          message: `Máq. ${id} con ELECTRÓNICO`,
          type: 'warning',
          duration: null,
          machCode: id,
        });
      });

      if (!ignore) sendNotification(newIds);
    }
    // Remove toasts for removed machines
    if (removedIds.length > 0) {
      const currentToasts = JSON.parse(localStorage.getItem('toasts') || '[]');
      const removed = currentToasts.filter((t) =>
        removedIds.includes(t.machCode)
      );
      removed.forEach((t) => removeToast(t.id));
    }

    // update ref so we don't notify again until it changes
    lastNotifiedIdsRef.current = currentIds;

    return () => {
      ignore = true;
    };
  }, [isElectronica, electronicoIds]);

  return (
    <Tabs
      aria-label='tabs'
      defaultValue={defaultTab}
      size='sm'
      sx={{ bgcolor: 'transparent' }}
      className='sticky top-0 z-10'
      onChange={(e, value) => {
        localStorage.setItem('machTab', JSON.stringify(value));
        setDefaultTab(value);
      }}
    >
      <Stack
        direction='row'
        className='sticky top-0 z-10 items-end justify-between gap-4 bg-[var(--joy-palette-background-body)] py-4'
      >
        <RefreshBtn handleRefresh={getMachines} />

        <TabList
          disableUnderline
          sx={{
            p: 0.5,
            gap: 0.5,
            borderRadius: 'lg',
            bgcolor: 'background.level1',
            [`& .${tabClasses.root}[aria-selected="true"]`]: {
              boxShadow: 'sm',
              bgcolor: 'background.surface',
            },
          }}
        >
          <Tab disableIndicator>
            <ListItemDecorator>
              <MapOutlined />
            </ListItemDecorator>
            Mapa
          </Tab>
          <Tab disableIndicator>
            <ListItemDecorator>
              <TableChartOutlined />
            </ListItemDecorator>
            Tabla
          </Tab>
        </TabList>

        {isElectronica && (
          <Switch
            checked={onlyStopElectronico}
            onChange={(e) => setOnlyStopElectronico(e.target.checked)}
            startDecorator={
              <ElectricBoltOutlined
                sx={{
                  color: onlyStopElectronico
                    ? 'var(--joy-palette-warning-solidBg)'
                    : 'inherit',
                }}
              />
            }
            endDecorator='Stop Electrónico'
          />
        )}

        {/* search inputs */}
        <MachSearchForm
          machines={displayedMachines}
          setFilteredMachines={setFilteredMachines}
        />
      </Stack>

      {isElectronica && onlyStopElectronico && displayedMachines.length === 0 && (
        <Stack
          direction='row'
          spacing={1.5}
          sx={{
            bgcolor: 'warning.softBg',
            color: 'warning.softColor',
            p: 2,
            mb: 2,
            borderRadius: 'md',
            alignItems: 'center',
            border: '1px solid',
            borderColor: 'warning.border',
          }}
        >
          <Warning sx={{ color: 'warning.solidBg' }} />
          <Typography level='title-sm' sx={{ color: 'warning.softColor' }}>
            No hay ninguna máquina con Stop Electrónico actualmente.
          </Typography>
        </Stack>
      )}

      {/* table and map */}
      <TabPanel value={0} className='p-0'>
        <MaquinasMap
          machines={
            filteredMachines.length > 0 ? sortedFiltered : sortedMachines
          }
          selectedRooms={[true, true, true]}
        />
      </TabPanel>
      <TabPanel value={1} className='p-0'>
        <MaquinasTable
          machines={
            filteredMachines.length > 0 ? filteredMachines : displayedMachines
          }
          pdfRows={displayedMachines}
        />
      </TabPanel>
    </Tabs>
  );
}

function sendNotification(electronicoMachs) {
  const notif = {
    title: 'ELECTRÓNICO',
    body: electronicoMachs
      .map((m) => `Máq. ${m} entró en ELECTRÓNICO`)
      .join('\n'),
    timeoutType: 'never',
  };

  window.electronAPI.notifyElectronico(notif);

  // custom sound
  playAlertSound();

  // send telegram message if in working hours
  const now = dayjs.tz();
  // Monday to Friday
  if (now.day() < 1 || now.day() > 5) return;
  // After 7am and Before 4pm
  if (now.hour() < 7 && now.hour() > 16) return;

  sendTelegramAlert(notif.body + ' ⚠️');
}

// RoomCheckboxes removed
