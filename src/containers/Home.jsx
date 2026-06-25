import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { useEffect, useState } from 'react';
import { useConfig } from '../ConfigContext.jsx';
import ModalWrapper from '../components/ModalWrapper.jsx';
import NewColorCodeForm from '../components/Forms/NewColorCodeForm.jsx';
import { Outlet, useNavigate } from 'react-router';
import NavBar from '../components/NavBar.jsx';
import Toast from '../components/Toast.jsx';
import { ToastsContext } from '../Contexts.js';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '../components/ErrorFallback.jsx';
import { playAlertSound } from '../utils/playAlertSound.js';

let apiUrl;

export default function Home() {
  apiUrl = useConfig().apiUrl;
  const navigate = useNavigate();
  // SEAMLESS, HOMBRE (ALG)
  const [room, setRoom] = useState(
    () => localStorage.getItem('lastRoom') || 'SEAMLESS'
  );

  const [isModalOpen, setIsModalOpen] = useState(true);

  const [newColorCodes, setNewColorCodes] = useState(() =>
    JSON.parse(localStorage.getItem('newColorCodes') || '[]')
  );

  const newColorCode =
    newColorCodes.length > 0 ? newColorCodes[newColorCodes.length - 1] : null;

  // using localStorage so toasts persist through refresh
  const [toasts, setToasts] = useState(() =>
    JSON.parse(localStorage.getItem('toasts') || '[]')
  );

  function addColorCodes(newCodes) {
    const currCodes = JSON.parse(localStorage.getItem('newColorCodes') || '[]');
    // Make sure codes in localStorage are unique. Otherwise, the same
    // codes will be added every hour
    const uniqueNewCodes = newCodes.filter(
      (newCode) =>
        !currCodes.some(
          (curr) => curr.StyleCode.styleCode === newCode.StyleCode.styleCode
        )
    );

    const updatedCodes = [...currCodes, ...uniqueNewCodes];
    localStorage.setItem('newColorCodes', JSON.stringify(updatedCodes));
    setNewColorCodes(updatedCodes);
    if (updatedCodes.length > 0) setIsModalOpen(true);
  }

  const addToast = (toast) => {
    setToasts((prev) => {
      // If we're in ELECTRONICA and this is an electronico toast,
      // check for duplicates by machCode
      if (room === 'ELECTRONICA' && toast?.machCode !== null) {
        const exists = prev.some((t) => t.machCode === toast.machCode);
        if (exists) {
          return prev; // skip duplicate
        }
      }

      const newToast = {
        ...toast,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };

      const updated = [...prev, newToast];
      localStorage.setItem('toasts', JSON.stringify(updated));
      return updated;
    });
  };

  const removeToast = (id) => {
    setToasts((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      localStorage.setItem('toasts', JSON.stringify(updated));
      return updated;
    });
  };

  // check for newColorCodes on load and then every half-hour
  // fetch for both rooms
  useEffect(() => {
    let ignore = false;

    async function fetchNewColorCodes() {
      try {
        const res1 = await fetch(`${apiUrl}/SEAMLESS/machines/newColorCodes`);
        const newCodes1 = await res1.json();
        if (!ignore) {
          // Whenever you update localStorage, also update state:
          addColorCodes(newCodes1);
        }
      } catch (err) {
        console.error(
          `[CLIENT] Error fetching /SEAMLESS/machines/newColorCodes:`,
          err
        );
      }

      try {
        const res2 = await fetch(`${apiUrl}/HOMBRE/machines/newColorCodes`);
        const newCodes2 = await res2.json();
        if (!ignore) {
          // Whenever you update localStorage, also update state:
          addColorCodes(newCodes2);
        }
      } catch (err) {
        console.error(
          `[CLIENT] Error fetching /HOMBRE/machines/newColorCodes:`,
          err
        );
      }
    }

    // fetch and repeat every half-hour
    fetchNewColorCodes();

    const intervalId = setInterval(() => {
      fetchNewColorCodes();
    }, 0.5 * 3600 * 1000); // update every half-hour

    return () => {
      clearInterval(intervalId);
      ignore = true;
    };
  }, []);

  // update lastRoom on room change without page reload
  useEffect(() => {
    const lastRoom = localStorage.getItem('lastRoom');
    if (lastRoom !== room) {
      localStorage.setItem('lastRoom', room);
    }
    if (room === 'ELECTRONICA') {
      navigate('/maquinas');
    }
  }, [room]);

  // for alert notifications like NServer down
  window.electronAPI.onPlayAlertSound(() => {
    playAlertSound();
  });

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ToastsContext value={{ addToast, removeToast }}>
        <Stack
          direction='row'
          className='items-stretch justify-start size-full'
        >
          <aside className='fixed top-0 bottom-0 left-0 z-20 w-48 h-screen'>
            <NavBar room={room} setRoom={setRoom} />
          </aside>

          <Box className='w-full px-4 ml-48'>
            <Outlet
              context={{
                addColorCodes,
                room,
                docena: room === 'SEAMLESS' ? 12 : 24,
                porcExtra: room === 'SEAMLESS' ? 1.01 : 1.02,
              }}
            />
          </Box>
        </Stack>

        {/* Modal for new Color Codes */}
        {newColorCode && (
          <ModalWrapper
            title={
              <Typography>
                Agregar código de color&nbsp;&nbsp;
                <Typography variant='solid' color='primary'>
                  {newColorCode.StyleCode.styleCode}
                </Typography>
              </Typography>
            }
            content={
              <Typography>
                Se encontró el código&nbsp;
                <Typography variant='soft'>
                  {newColorCode.StyleCode.color}
                </Typography>
                &nbsp;para el art.&nbsp;
                <Typography variant='soft'>
                  {newColorCode.StyleCode.articulo}
                  {newColorCode.StyleCode.punto
                    ? `.${newColorCode.StyleCode.punto}`
                    : ''}
                </Typography>
                &nbsp;talle&nbsp;
                <Typography variant='soft'>
                  {/* StyleCode.talle will be 1 if UNICO, but 8 in StyleCode.styleCode */}
                  {parseInt(
                    newColorCode.StyleCode.styleCode.substring(5, 6)
                  ) === 8
                    ? 'ÚNICO'
                    : newColorCode.StyleCode.talle}
                </Typography>
                &nbsp;en la máq.&nbsp;
                <Typography variant='soft'>{newColorCode.MachCode}</Typography>.
                Por favor, víncule el color correspondiente.
              </Typography>
            }
            contentClassName='w-xs'
            isOpen={isModalOpen}
            handleClose={() => setIsModalOpen(false)}
          >
            <NewColorCodeForm
              newColorCode={newColorCode}
              setNewColorCodes={setNewColorCodes}
            />
          </ModalWrapper>
        )}

        {toasts.length > 0 && (
          <Stack
            direction='column'
            className='fixed bottom-2 right-2 z-[var(--joy-zIndex-snackbar)] gap-2'
          >
            {toasts.map((toast) => (
              <Toast key={toast.id} toast={toast} removeToast={removeToast} />
            ))}
          </Stack>
        )}
      </ToastsContext>
    </ErrorBoundary>
  );
}
