import HomeOutlined from '@mui/icons-material/HomeOutlined';
import CompareArrowsOutlined from '@mui/icons-material/CompareArrowsOutlined';
import FactoryOutlined from '@mui/icons-material/FactoryOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import PrecisionManufacturingOutlined from '@mui/icons-material/PrecisionManufacturingOutlined';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import ChangeCircleOutlined from '@mui/icons-material/ChangeCircleOutlined';
import SignalWifiOffOutlined from '@mui/icons-material/SignalWifiOffOutlined';
import ColorLensOutlined from '@mui/icons-material/ColorLensOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import InventoryOutlined from '@mui/icons-material/InventoryOutlined';
import ElectricBoltOutlined from '@mui/icons-material/ElectricBoltOutlined';
import QrCodeOutlined from '@mui/icons-material/QrCodeOutlined';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListSubheader from '@mui/joy/ListSubheader';
import { NavLink, useNavigate, useLocation } from 'react-router';
import ListDivider from '@mui/joy/ListDivider';
import Badge from '@mui/joy/Badge';
import { useEffect, useState } from 'react';
import { useConfig } from '../ConfigContext.jsx';
import Switch from '@mui/joy/Switch';
import { useColorScheme } from '@mui/joy/styles';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';

export default function NavBar({ room, setRoom }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { apiUrl } = useConfig();
  const [hasOfflineAlerts, setHasOfflineAlerts] = useState(false);
  const [hasGruposAlerts, setHasGruposAlerts] = useState(false);

  useEffect(() => {
    if (!apiUrl) return;

    const checkAlerts = () => {
      // 1. Offline Alerts Check
      fetch(`${apiUrl}/offline`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((incomingData) => {
          if (!Array.isArray(incomingData)) return;
          const currentMachines = incomingData.map(row => row['Máquina']).filter(Boolean);

           let previousMachines = [];
          try {
            const savedPrev = localStorage.getItem('previousMachines');
            previousMachines = savedPrev ? JSON.parse(savedPrev) : [];
            if (!Array.isArray(previousMachines)) previousMachines = [];
          } catch (e) {}
 
          const newOffline = currentMachines.filter(m => 
            !previousMachines.some(pm => String(pm).trim() === String(m).trim())
          );
 
          let alertMachines = [];
          try {
            const savedAlerts = localStorage.getItem('alertMachines');
            alertMachines = savedAlerts ? JSON.parse(savedAlerts) : [];
            if (!Array.isArray(alertMachines)) alertMachines = [];
          } catch (e) {}
 
          // Remove any alerts for machines that are no longer offline (went online)
          let updatedAlerts = alertMachines.filter(m => 
            currentMachines.some(cm => String(cm).trim() === String(m).trim())
          );
 
          let hasChanges = alertMachines.length !== updatedAlerts.length;
 
          if (newOffline.length > 0) {
            const uniqueNew = newOffline.filter(m => 
              !updatedAlerts.some(ua => String(ua).trim() === String(m).trim())
            );
            if (uniqueNew.length > 0) {
              updatedAlerts = [...updatedAlerts, ...uniqueNew];
              hasChanges = true;
            }
          }
 
          if (hasChanges) {
            localStorage.setItem('alertMachines', JSON.stringify(updatedAlerts));
            setHasOfflineAlerts(updatedAlerts.length > 0);
          } else {
            setHasOfflineAlerts(alertMachines.length > 0);
          }

          localStorage.setItem('previousMachines', JSON.stringify(currentMachines));
        })
        .catch((e) => {
          try {
            const saved = localStorage.getItem('alertMachines');
            const alerts = saved ? JSON.parse(saved) : [];
            setHasOfflineAlerts(Array.isArray(alerts) && alerts.length > 0);
          } catch (err) {}
        });

      // 2. Grupos Alerts Check
      fetch(`${apiUrl}/grupos`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((incomingData) => {
          if (!Array.isArray(incomingData)) return;

          let previousGroups = {};
          try {
            const saved = localStorage.getItem('previousGroups');
            previousGroups = saved ? JSON.parse(saved) : {};
          } catch (e) {}

          let acknowledgedGroups = [];
          try {
            const saved = localStorage.getItem('acknowledgedGroups');
            acknowledgedGroups = saved ? JSON.parse(saved) : [];
            if (!Array.isArray(acknowledgedGroups)) acknowledgedGroups = [];
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
          const currentGroups = {};

          incomingData.forEach((group) => {
            const style = group.style;
            const currentMachines = group.maquinas;
            currentGroups[style] = currentMachines;

            const cantidad = currentMachines.length;
            const cantidadAnterior = trackedGroupsLength[style] || 0;

            let isRelevant = false;
            if (group.allTargetsZero || group.targetMet) {
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
                alertStyles.push(style);
                const groupRoom = group.room === 'ALGODÓN' ? 'HOMBRE' : group.room;
                if (groupRoom === room) {
                  hasAlert = true;
                }
              }
            }
          });

          if (ackChanged) {
            localStorage.setItem('acknowledgedGroups', JSON.stringify(currentAck));
          }

          setHasGruposAlerts(hasAlert);
          localStorage.setItem('activeGroupAlerts', JSON.stringify(alertStyles));
          localStorage.setItem('currentGroups', JSON.stringify(currentGroups));
        })
        .catch((e) => {});
    };

    checkAlerts();
    window.addEventListener('groups-refresh', checkAlerts);

    const interval = setInterval(checkAlerts, 15000); // Check every 15 seconds
    return () => {
      clearInterval(interval);
      window.removeEventListener('groups-refresh', checkAlerts);
    };
  }, [apiUrl, location.pathname, room]);

  const navItems = [
    {
      title: 'Inicio',
      items: [
        {
          to: '/',
          icon: <HomeOutlined />,
          label: 'Inicio',
        },
      ],
    },
    {
      title: 'Programada',
      items: [
        {
          to: '/programada/actual',
          icon: <TableChartOutlined />,
          label: 'Actual',
        },
        {
          to: '/programada/anteriores',
          icon: <HistoryOutlined />,
          label: 'Anteriores',
        },
        {
          to: '/programada/comparar',
          icon: <CompareArrowsOutlined />,
          label: 'Comparar',
        },
      ],
    },
    {
      title: 'Herramientas',
      items: [
        {
          to: '/maquinas',
          icon: <PrecisionManufacturingOutlined />,
          label: 'Máquinas',
        },
        {
          to: '/cambios',
          icon: <ChangeCircleOutlined />,
          label: 'Cambios',
        },
        {
          to: '/produccion',
          icon: <FactoryOutlined />,
          label: 'Producción',
        },
        {
          to: '/electronica',
          icon: <ElectricBoltOutlined />,
          label: 'Electrónica',
        },
      ],
    },
    {
      title: 'Nuevo',
      items: [
        {
          to: '/offline',
          icon: <SignalWifiOffOutlined />,
          label: 'Offline',
        },
        {
          to: '/distribucion',
          icon: <ColorLensOutlined />,
          label: 'Distribución',
        },
        {
          to: '/produccion-maquinas',
          icon: <BarChartOutlined />,
          label: 'Producción y Saldo',
        },
        {
          to: '/disponibles',
          icon: <InventoryOutlined />,
          label: 'Disponibles',
        },
        {
          to: '/codigos-color',
          icon: <QrCodeOutlined />,
          label: 'Colores',
        },
      ],
    },
  ];


  const { mode, setMode } = useColorScheme();

  return (
    <Box
      component='nav'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        width: '100%',
        backgroundColor: 'background.level1',
        borderRight: '1px solid',
        borderColor: 'divider',
        p: 1,
        '& .MuiListItemButton-root': {
          borderRadius: '8px',
          mx: 0.5,
          my: 0.25,
          color: 'text.secondary',
          '&:hover': {
            backgroundColor: 'background.level2',
            color: 'text.primary',
          },
          '&.Mui-selected': {
            backgroundColor: 'background.level2',
            color: 'text.primary',
            fontWeight: 'bold',
          },
        },
      }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List>
          {/* select room */}
          <ListItem className='w-full px-2'>
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                bgcolor: 'background.level2',
                borderRadius: '20px',
                p: '3px',
                position: 'relative',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {/* Sliding Background */}
              {(room === 'SEAMLESS' || room === 'HOMBRE') && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '3px',
                    bottom: '3px',
                    left: '3px',
                    width: 'calc(50% - 3px)',
                    bgcolor: 'background.surface',
                    borderRadius: '18px',
                    boxShadow: 'sm',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: room === 'SEAMLESS' ? 'translateX(100%)' : 'translateX(0)',
                  }}
                />
              )}
              <Box
                component="div"
                onClick={() => {
                  localStorage.setItem('lastTejeduriaRoom', 'HOMBRE');
                  setRoom('HOMBRE');
                }}
                sx={{
                  flex: 1,
                  textAlign: 'center',
                  py: 0.75,
                  fontSize: 'xs',
                  fontWeight: room === 'HOMBRE' ? 'bold' : 'normal',
                  cursor: 'pointer',
                  zIndex: 1,
                  color: room === 'HOMBRE' ? 'text.primary' : 'text.secondary',
                  transition: 'color 0.2s, font-weight 0.2s',
                  userSelect: 'none',
                }}
              >
                Algodón
              </Box>
              <Box
                component="div"
                onClick={() => {
                  localStorage.setItem('lastTejeduriaRoom', 'SEAMLESS');
                  setRoom('SEAMLESS');
                }}
                sx={{
                  flex: 1,
                  textAlign: 'center',
                  py: 0.75,
                  fontSize: 'xs',
                  fontWeight: room === 'SEAMLESS' ? 'bold' : 'normal',
                  cursor: 'pointer',
                  zIndex: 1,
                  color: room === 'SEAMLESS' ? 'text.primary' : 'text.secondary',
                  transition: 'color 0.2s, font-weight 0.2s',
                  userSelect: 'none',
                }}
              >
                Seamless
              </Box>
            </Box>
          </ListItem>

          <ListDivider />

          {/* Pages */}
          {navItems.map((group) => (
            <ListItem key={group.title} nested>
              {group.title !== 'Inicio' && (
                <ListSubheader className='font-bold' sx={{ color: 'text.secondary', mt: 1 }}>{group.title}</ListSubheader>
              )}
              <List>
                {group.items.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    style={{ textDecoration: 'none' }}
                    onClick={(e) => {
                      if (item.onClick) {
                        item.onClick(e);
                      }
                    }}
                  >
                    {({ isActive }) => {
                      let animationClass = '';
                      const isItemActive = isActive;

                      if (!isItemActive) {
                        if (item.to === '/offline' && hasOfflineAlerts) {
                          animationClass = 'animate-pulse-breathing-yellow';
                        } else if (item.to === '/programada/actual' && hasGruposAlerts) {
                          animationClass = 'animate-pulse-breathing-yellow';
                        }
                      }

                      return (
                        <ListItem>
                          <ListItemButton selected={isItemActive} className={animationClass}>
                            {item.icon}
                            {item.label}
                          </ListItemButton>
                        </ListItem>
                      );
                    }}
                  </NavLink>
                ))}
              </List>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Dark Mode switch at the bottom */}
      <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography level="body-xs" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Modo Oscuro</Typography>
        <Switch
          color={mode === 'dark' ? 'primary' : 'neutral'}
          checked={mode === 'dark'}
          onChange={(event) => {
            setMode(event.target.checked ? 'dark' : 'light');
          }}
          startDecorator={
            mode === 'dark' ? (
              <DarkModeOutlined sx={{ color: 'warning.400', fontSize: '18px' }} />
            ) : (
              <LightModeOutlined sx={{ color: 'neutral.400', fontSize: '18px' }} />
            )
          }
        />
      </Box>
    </Box>
  );
}
