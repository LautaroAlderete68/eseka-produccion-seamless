import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import { useEffect, useMemo, useState } from 'react';
import { useConfig } from '../ConfigContext.jsx';
import ProgramadaTable from '../components/Tables/ProgramadaTable.jsx';
import ProgSearchForm from '../components/Forms/ProgSearchForm.jsx';
import dayjs from 'dayjs';
import { StyledDatePicker } from '../components/Inputs/StyledPickers.jsx';
import ProgTotal from '../components/ProgTotal.jsx';
import RefreshBtn from '../components/RefreshBtn.jsx';
import { useOutletContext } from 'react-router';
import { calcAProducir } from '../utils/progTableUtils.js';

// to avoid useEffect dependency issues
let apiUrl;

export default function Programada() {
  apiUrl = useConfig().apiUrl;
  const { addColorCodes, room } = useOutletContext();
  const [startDate, setStartDate] = useState();
  const [progColor, setProgColor] = useState([]);
  const [filteredProgColor, setFilteredProgColor] = useState([]);

  // Calculate totalAProducir to compare with Total actual
  const totalAProducir = useMemo(() => {
    let progToUse =
      filteredProgColor.length > 0 ? filteredProgColor : progColor;
    return progToUse.reduce((acc, row) => acc + calcAProducir(row), 0);
  }, [progColor, filteredProgColor]);

  const [prevRoom, setPrevRoom] = useState(room);
  if (room !== prevRoom) {
    setPrevRoom(room);
    setStartDate(undefined);
    const cached = localStorage.getItem(`progColor-${room}`);
    let initialData = [];
    if (cached) {
      try {
        initialData = JSON.parse(cached);
      } catch (e) {}
    }
    setProgColor(initialData);
    setFilteredProgColor([]);
  }

  // get current programada total on load
  useEffect(() => {
    let ignore = false;

    if (!startDate) {
      // fetch start date of current programada
      fetch(`${apiUrl}/${room}/programada/actualDate`)
        .then((res) => res.json())
        .then((data) => {
          const now = dayjs.tz();
          const month = now.month() + 1; // month is 0-indexed in dayjs
          const year = now.year();
          if (!ignore) {
            // if fetched date is not current month and year, set start date null
            if (data[0].Month !== month || data[0].Year !== year)
              setStartDate(null);
            else setStartDate(data[0].Date);
          }
        })
        .catch((err) =>
          console.error('[CLIENT] Error fetching /programada/actualDate:', err)
        );
    }

    return () => {
      ignore = true;
    };
  }, [room, startDate]);

  function handleRefresh() {
    if (startDate) {
      const params = new URLSearchParams({
        startDate,
        _t: Date.now(),
      }).toString();
      fetch(`${apiUrl}/${room}/programada?${params}`)
        .then((res) => res.json())
        .then((data) => {
          setProgColor(data);
          localStorage.setItem(`progColor-${room}`, JSON.stringify(data));
        })
        .catch((err) =>
          console.error(`[CLIENT] Error fetching /${room}/programada:`, err)
        );
    }

    // fetch newColorCodes
    fetch(`${apiUrl}/${room}/machines/newColorCodes`)
      .then((res) => res.json())
      .then((newCodes) => {
        addColorCodes(newCodes);
      })
      .catch((err) =>
        console.error(
          `[CLIENT] Error fetching /${room}/machines/newColorCodes:`,
          err
        )
      );

    // fetch grupos to update current groups and check alerts immediately
    fetch(`${apiUrl}/grupos?_t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((incomingData) => {
        if (!Array.isArray(incomingData)) return;

        // Save currentGroups
        const currentGroups = {};
        incomingData.forEach((group) => {
          currentGroups[group.style] = group.maquinas;
        });
        localStorage.setItem('currentGroups', JSON.stringify(currentGroups));

        // Re-evaluate alerts so the navbar badge and row alerts update instantly
        let previousGroups = {};
        try {
          const saved = localStorage.getItem('previousGroups');
          previousGroups = saved ? JSON.parse(saved) : {};
        } catch (e) {}

        let acknowledgedGroups = [];
        try {
          const saved = localStorage.getItem('acknowledgedGroups');
          acknowledgedGroups = saved ? JSON.parse(saved) : [];
        } catch (e) {}

        let trackedGroupsLength = {};
        try {
          const saved = localStorage.getItem('trackedGroupsLength');
          trackedGroupsLength = saved ? JSON.parse(saved) : {};
        } catch (e) {}

        let hasAlert = false;
        let ackChanged = false;
        let currentAck = [...acknowledgedGroups];
        const alertStyles = [];

        incomingData.forEach((group) => {
          const style = group.style;
          const currentMachines = group.maquinas;
          const cantidad = currentMachines.length;
          const cantidadAnterior = trackedGroupsLength[style] || 0;

          let isRelevant = false;
          if (group.allTargetsZero) {
            isRelevant = false;
          } else if (cantidad > 1) {
            isRelevant = true;
          } else if (cantidad === 1 && cantidadAnterior > 1) {
            const isAck = currentAck.some(ack => String(ack).trim() === String(style).trim());
            if (!isAck) {
              isRelevant = true;
            }
          }

          if (isRelevant) {
            const prevMachines = previousGroups[style] || [];

            const machinesChanged =
              currentMachines.length !== prevMachines.length ||
              !currentMachines.every(m => 
                prevMachines.some(pm => String(pm).trim() === String(m).trim())
              );

            if (machinesChanged) {
              const hasAckStyle = currentAck.some(ack => String(ack).trim() === String(style).trim());
              if (hasAckStyle) {
                currentAck = currentAck.filter(s => String(s).trim() !== String(style).trim());
                ackChanged = true;
              }
            }

            const isAck = currentAck.some(ack => String(ack).trim() === String(style).trim());
            if (!isAck && machinesChanged) {
              hasAlert = true;
              alertStyles.push(style);
            }
          }
        });

        if (ackChanged) {
          localStorage.setItem('acknowledgedGroups', JSON.stringify(currentAck));
        }

        localStorage.setItem('activeGroupAlerts', JSON.stringify(alertStyles));
        
        // Notify components to update instantly
        window.dispatchEvent(new CustomEvent('groups-refresh'));
      })
      .catch((err) => console.error('[CLIENT] Error fetching /grupos on refresh:', err));
  }

  return (
    <Box>
      <Stack
        direction='row'
        className='sticky z-10 items-end justify-between gap-4 top-0 bg-[var(--joy-palette-background-body)] py-4'
      >
        <Stack direction='row' className='items-end gap-4'>
          <RefreshBtn handleRefresh={handleRefresh} />

          <StyledDatePicker
            label='Fecha de inicio'
            value={startDate ? dayjs.tz(startDate) : null}
            disabled
          />

          <ProgTotal startDate={startDate} targetTotal={totalAProducir} />
        </Stack>

        <ProgSearchForm
          key={room}
          progColor={progColor}
          filteredProgColor={filteredProgColor}
          setFilteredProgColor={setFilteredProgColor}
          live={true}
        />
      </Stack>

      <ProgramadaTable
        startDate={startDate}
        progColor={progColor}
        setProgColor={setProgColor}
        filteredProgColor={filteredProgColor}
        setFilteredProgColor={setFilteredProgColor}
      />
    </Box>
  );
}
