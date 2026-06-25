import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { StyledEngineProvider } from '@mui/material/styles';
import GlobalStyles from '@mui/joy/GlobalStyles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/es';
import { ConfigProvider } from './ConfigContext.jsx';
import { HashRouter, Route, Routes } from 'react-router';
import Home from './containers/Home.jsx';
import Produccion from './containers/Produccion.jsx';
import Programada from './containers/Programada.jsx';
import ProgComparar from './containers/ProgComparar.jsx';
import ProgAnteriores from './containers/ProgAnteriores.jsx';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Maquinas from './containers/Maquinas.jsx';
import {
  useTheme as useJoyTheme,
  extendTheme,
  CssVarsProvider as JoyCssVarsProvider,
} from '@mui/joy/styles';
import {
  createTheme,
  ThemeProvider,
  THEME_ID as MATERIAL_THEME_ID,
} from '@mui/material/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import Dashboard from './containers/Dashboard.jsx';
import { getChartsCustomizations } from './theme/charts.js';
import Cambios from './containers/Cambios.jsx';
import Offline from './containers/Offline.jsx';
import Distribucion from './containers/Distribucion.jsx';
import ProduccionMaquinas from './containers/ProduccionMaquinas.jsx';
import Disponibles from './containers/Disponibles.jsx';
import CodigosColor from './containers/CodigosColor.jsx';


dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/Buenos_Aires');

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

const config = {
  apiUrl: process.env.EXPRESS_URL,
  sqlDateFormat: process.env.SQL_DATE_FORMAT,
};

root.render(
  <AppProviders>
    <App />
  </AppProviders>
);

function AppProviders({ children }) {
  let joyTheme = useJoyTheme();

  const materialTheme = createTheme({
    typography: { fontFamily: joyTheme.vars.fontFamily },
    components: getChartsCustomizations(joyTheme),
  });

  joyTheme = extendTheme({
    colorSchemes: {
      light: {
        palette: {
          background: {
            body: '#f4f6f8',
          },
        },
      },
      dark: {
        palette: {
          background: {
            body: '#0d1117', // GitHub dark mode main background
            surface: '#161b22', // GitHub dark mode card background
            level1: '#21262d', // GitHub dark background level 1 (sidebar etc)
            level2: '#30363d', // GitHub dark background level 2
          },
          text: {
            primary: '#c9d1d9', // GitHub dark text primary
            secondary: '#8b949e', // GitHub dark text secondary
          },
          divider: '#30363d', // GitHub dark mode border color
        },
      },
    },
    components: {
      // The component identifier always start with `Joy${ComponentName}`.
      JoyCheckbox: {
        styleOverrides: {
          input: {
            // theme.vars.* return the CSS variables.
            position: 'relative',
          },
        },
      },
      JoySkeleton: {
        defaultProps: {
          animation: 'wave',
        },
      },
    },
  });

  return (
    <StyledEngineProvider enableCssLayer>
      <ThemeProvider theme={{ [MATERIAL_THEME_ID]: materialTheme }}>
        {/* For tailwind */}
        <GlobalStyles styles='@layer theme, base, mui, components, utilities;' />
        <JoyCssVarsProvider theme={joyTheme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='es'>
            <ConfigProvider config={config}>{children}</ConfigProvider>
          </LocalizationProvider>
        </JoyCssVarsProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path='/' element={<Home />}>
          <Route index element={<Dashboard />} />
          <Route path='programada'>
            <Route path='actual' element={<Programada />} />
            <Route path='anteriores' element={<ProgAnteriores />} />
            <Route path='comparar' element={<ProgComparar />} />
          </Route>
          <Route path='maquinas' element={<Maquinas />} />
          <Route path='electronica' element={<Maquinas />} />
          <Route path='cambios' element={<Cambios />} />
          <Route path='produccion' element={<Produccion />} />
          <Route path='offline' element={<Offline />} />
          <Route path='distribucion' element={<Distribucion />} />
          <Route path='produccion-maquinas' element={<ProduccionMaquinas />} />
          <Route path='disponibles' element={<Disponibles />} />
          <Route path='codigos-color' element={<CodigosColor />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
