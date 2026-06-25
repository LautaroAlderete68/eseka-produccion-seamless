import { useEffect, useMemo, useState } from 'react';
import ArtTalleColorInputs from '../Inputs/ArtTalleColorInputs.jsx';
import FilterAltOffOutlined from '@mui/icons-material/FilterAltOffOutlined';
import MachInput from '../Inputs/MachInput.jsx';
import { roundUpEven, calcFaltaUnidades } from '../../utils/progTableUtils.js';
import { useConfig } from '../../ConfigContext.jsx';

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
    const alertSuffix = cleanAlert.match(/\d+$/)?.[0] || '';
    if (alertSuffix === '') return false;
    
    let parsedRowDec = parseInt(rowDecimal, 10);
    const parsedAlertSuffix = parseInt(alertSuffix, 10);
    
    if (rowDecimal === '1' && parsedAlertSuffix === 10) {
      parsedRowDec = 10;
    }
    
    return parsedRowDec === parsedAlertSuffix;
  }

  return true;
}

function getRowTargetStatus(row) {
  const faltaUnidades = calcFaltaUnidades(row);
  if (row.Machines.length <= 1) {
    const machPieces = row.Machines[0]?.Pieces;
    const machTarget = roundUpEven(faltaUnidades + (machPieces || 0));

    if (machPieces) {
      if (row.Producido === 0) {
        return 'needs_download';
      } else if (machTarget - row.Target > 2) {
        return 'reset_counter';
      } else if (
        faltaUnidades > 0 &&
        machTarget < row.Target &&
        row.Machines[0].TargetOrder === 0
      ) {
        return 'verify_counter';
      } else if (
        row.Machines[0].TargetOrder !== 0 &&
        Math.abs(machTarget - row.Machines[0].TargetOrder) > 2
      ) {
        return 'verify_target';
      } else if (row.Machines[0].TargetOrder === 0 && faltaUnidades <= 0) {
        return 'stop_machine';
      } else if (row.Machines[0].TargetOrder === 0) {
        return 'no_target';
      }
    }
  } else {
    if (row.Producido === 0) {
      return 'needs_download';
    } else if (row.Machines.some((m) => m.TargetOrder === 0)) {
      return 'verify_counter';
    }
  }
  return 'normal';
}

export default function ProgSearchForm({
  progColor,
  filteredProgColor,
  setFilteredProgColor,
  live,
}) {
  const { apiUrl } = useConfig();
  const [formData, setFormData] = useState({});
  const [key, setKey] = useState(0);

  const [activeGroupAlerts, setActiveGroupAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem('activeGroupAlerts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const checkStorage = () => {
      try {
        const savedAlerts = localStorage.getItem('activeGroupAlerts');
        const parsedAlerts = savedAlerts ? JSON.parse(savedAlerts) : [];
        setActiveGroupAlerts(parsedAlerts);
      } catch (e) {}
    };

    window.addEventListener('groups-refresh', checkStorage);

    const intervalId = setInterval(checkStorage, 5000);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('groups-refresh', checkStorage);
    };
  }, []);

  const currentRoomAlertsCount = useMemo(() => {
    return activeGroupAlerts.filter(alertStyle => 
      progColor.some(row => matchStyleAlert(alertStyle, row.Articulo) && calcFaltaUnidades(row) > 0)
    ).length;
  }, [activeGroupAlerts, progColor]);

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
      
      window.dispatchEvent(new CustomEvent('groups-refresh'));
    } catch (e) {
      console.error('[CLIENT] Error acknowledging all groups:', e);
    }
  };

  useEffect(() => {
    setFilteredProgColor(
      // if fileds are empty, it shows all rows
      progColor.filter((row) => {
        // if the fields are undefined, they are set as empty strings
        const {
          articulo = '',
          talle = '',
          colorId = '',
          machine = '',
          targetStatus = '',
        } = formData;
        if (
          articulo !== '' &&
          (row.Articulo < Number(articulo) ||
            row.Articulo >= Math.floor(Number(articulo)) + 1)
        )
          // includes puntos when searching for int
          return false;
        if (talle !== '' && row.Talle !== Number(talle)) return false;
        if (colorId !== '' && row.ColorId !== colorId) return false;
        if (machine !== '') {
          if (row.Machines.length === 0) return false;
          return row.Machines.some((m) => m.MachCode === Number(machine));
        }
        if (targetStatus !== '' && getRowTargetStatus(row) !== targetStatus) return false;
        return true;
      })
    );
  }, [formData, progColor, setFilteredProgColor]);
  // having progColor in the dep array ensures live data

  return (
    <form
      key={key}
      onReset={() => {
        setFormData({});
        setKey((prev) => prev + 1); // force re-render for ColorSelect
      }}
    >
      <ArtTalleColorInputs
        formData={formData}
        setFormData={setFormData}
        currentRoomAlertsCount={currentRoomAlertsCount}
        onAcknowledgeAllGroups={acknowledgeAllGroups}
        btnProps={{
          type: 'reset',
          icon: <FilterAltOffOutlined />,
          color: 'danger',
          variant: 'soft',
        }}
        inheritedColors={Array.from(
          new Map(
            filteredProgColor.map((row) => [
              row.ColorId,
              { Color: row.Color, Id: row.ColorId },
            ])
          ).values()
        )}
      >
        {live && <MachInput formData={formData} setFormData={setFormData} />}
      </ArtTalleColorInputs>
    </form>
  );
}
