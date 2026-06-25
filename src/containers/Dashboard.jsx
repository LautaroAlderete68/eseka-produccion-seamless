import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import DailyProduction from '../components/Dashboard/DailyProduction.jsx';
import TotalProduced from '../components/Dashboard/TotalProduced.jsx';
import { useEffect, useMemo, useState } from 'react';
import { useConfig } from '../ConfigContext.jsx';
import CurrentEff from '../components/Dashboard/CurrentEff.jsx';
import DailyEff from '../components/Dashboard/DailyEff.jsx';
import MonthSaldo from '../components/Dashboard/MonthSaldo.jsx';
import TotalEstimate from '../components/Dashboard/TotalEstimate.jsx';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import DateEstimate from '../components/Dashboard/DateEstimate.jsx';
import RequiredProd from '../components/Dashboard/RequiredProd.jsx';
import { useOutletContext } from 'react-router';
import { calcAProducir, calcProducido } from '../utils/progTableUtils.js';
import localizedNum from '../utils/numFormat.js';

dayjs.extend(isSameOrBefore);

function PowerBiGauge({ title, value, target, unit = "Docenas", loading }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const remaining = target > value ? target - value : 0;

  const r = 80;
  const strokeWidth = 14;
  const circumference = Math.PI * r; // 251.32
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 2 }}>
        <Typography level="title-md" sx={{ color: 'text.primary' }}>{title}</Typography>
        <Typography level="body-md" sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>Cargando medidor...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', p: 1 }}>
      <Typography level="title-lg" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
        {title}
      </Typography>
      
      <Box sx={{ position: 'relative', width: 300, height: 180 }}>
        <svg width="300" height="180" viewBox="0 0 200 120">
          {/* Background Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--joy-palette-neutral-200)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Progress Arc */}
          {pct > 0 && (
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="var(--joy-palette-primary-500)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          )}

          {/* Min label inside SVG to prevent overlay issues */}
          <text
            x="20"
            y="118"
            textAnchor="middle"
            fill="var(--joy-palette-neutral-500)"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            fontWeight="500"
          >
            0
          </text>

          {/* Target label inside SVG to prevent overlay issues */}
          <text
            x="180"
            y="118"
            textAnchor="end"
            fill="var(--joy-palette-danger-600)"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            fontWeight="bold"
          >
            {localizedNum(Math.round(target || 0))}
          </text>
        </svg>

        {/* Value and Percentage Centered at the Bottom */}
        <Box sx={{
          position: 'absolute',
          bottom: 28,
          left: 0,
          right: 0,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <Typography level="h2" sx={{ fontWeight: '800', lineHeight: 1, color: 'text.primary' }}>
            {Math.round(pct)}%
          </Typography>
        </Box>
      </Box>

      {/* Info details */}
      <Stack direction="row" spacing={3} sx={{ mt: 2, width: '100%', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography level="body-xs" color="neutral">Producido</Typography>
          <Typography level="title-sm" color="primary" sx={{ fontWeight: 'bold' }}>
            {localizedNum(Math.round(value || 0))} {unit}
          </Typography>
        </Box>
        <Box sx={{ width: '1px', backgroundColor: 'var(--joy-palette-neutral-300)', alignSelf: 'stretch' }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography level="body-xs" color="neutral">Falta</Typography>
          <Typography level="title-sm" color={remaining > 0 ? "warning" : "success"} sx={{ fontWeight: 'bold' }}>
            {remaining > 0 ? `${localizedNum(Math.round(remaining))} ${unit}` : '¡Meta cumplida!'}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function Dashboard() {
  const { apiUrl } = useConfig();
  const { room } = useOutletContext();
  const [dailyProd, setDailyProd] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [progTotal, setProgTotal] = useState(null);
  const [yesterdayEff, setYesterdayEff] = useState({});
  const now = dayjs.tz();

  const [prevRoom, setPrevRoom] = useState(room);
  if (room !== prevRoom) {
    setPrevRoom(room);
    setDailyProd([]);
    setProgTotal(null);
  }

  const [seamlessData, setSeamlessData] = useState({ produced: 0, target: 0, loading: true });
  const [algodonData, setAlgodonData] = useState({ produced: 0, target: 0, loading: true });

  useEffect(() => {
    let ignore = false;

    const fetchGaugeStats = async (r, setter) => {
      try {
        const dateRes = await fetch(`${apiUrl}/${r}/programada/actualDate`);
        if (!dateRes.ok) throw new Error();
        const dateData = await dateRes.json();
        
        let target = 0;
        let produced = 0;
        const now = dayjs.tz();
        const month = now.month() + 1;
        const year = now.year();

        if (dateData && dateData.length > 0 && dateData[0].Month === month && dateData[0].Year === year) {
          const startDate = dateData[0].Date;
          const params = new URLSearchParams({ startDate, _t: Date.now() }).toString();
          const progRes = await fetch(`${apiUrl}/${r}/programada?${params}`);
          if (progRes.ok) {
            const progData = await progRes.json();
            const docena = r === 'SEAMLESS' ? 12 : 24;
            const porcExtra = r === 'SEAMLESS' ? 1.01 : 1.02;

            target = Array.isArray(progData) ? progData.reduce((acc, row) => acc + calcAProducir(row), 0) : 0;
            produced = Array.isArray(progData) ? progData.reduce((acc, row) => acc + calcProducido(row, docena, porcExtra), 0) : 0;
          }
        }

        if (!ignore) {
          setter({ produced, target, loading: false });
        }
      } catch (e) {
        console.error(`[DASHBOARD GAUGE] Error fetching stats for ${r}:`, e);
        if (!ignore) {
          setter(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchGaugeStats('SEAMLESS', setSeamlessData);
    fetchGaugeStats('HOMBRE', setAlgodonData);

    return () => {
      ignore = true;
    };
  }, [apiUrl]);

  useEffect(() => {
    let ignore = false;
    let timeoutId;

    fetch(`${apiUrl}/${room}/stats/dailyProduction`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          setDailyProd(
            data.length !== 0 ? data : [{ ProdDate: null, Docenas: null }]
          );
        }
      })
      .catch((err) =>
        console.error('[CLIENT] Error fetching /stats/dailyProduction:', err)
      );

    fetch(`https://api.argentinadatos.com/v1/feriados/${now.year()}`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter(
          (d) =>
            dayjs.tz(d.fecha).month() === now.month() && d.tipo !== 'puente'
        );
        const flat = filtered.map((d) => d.fecha);

        if (!ignore) {
          setHolidays(flat);
        }
      })
      .catch((err) => console.error('[CLIENT] Error fetching holidays:', err));

    fetch(`${apiUrl}/${room}/programada/actualDate`)
      .then((res) => res.json())
      .then((data) => {
        const month = now.month() + 1; // month is 0-indexed in dayjs
        const year = now.year();

        if (!ignore) {
          // if fetched date is not current month and year, set start date null
          if (data[0].Month !== month || data[0].Year !== year) setProgTotal(0);
          else {
            fetch(`${apiUrl}/${room}/programada/total/${data[0].Date}`)
              .then((res) => res.json())
              .then((data) => {
                if (!ignore) {
                  setProgTotal(data[0].Total);
                }
              })
              .catch((err) =>
                console.error('[CLIENT] Error fetching /programada/total:', err)
              );
          }
        }
      })
      .catch((err) =>
        console.error('[CLIENT] Error fetching /programada/actualDate:', err)
      );

    // on initial render, calculate time remaining until next 6:00:02 AM
    // to reload data in case page remains open indefinitely
    const currDate = dayjs.tz();
    let nextDate = currDate.hour(6).minute(0).second(2);
    if (nextDate.isBefore(currDate)) {
      nextDate = nextDate.add(1, 'day');
    }
    const timeRemaining = nextDate.diff(currDate);
    timeoutId = setTimeout(() => window.location.reload(), timeRemaining);

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [apiUrl, room]);

  const totalProduced = useMemo(() => {
    return dailyProd.reduce((acc, row) => acc + row.Docenas, 0);
  }, [dailyProd]);

  const dailyAverage = useMemo(() => {
    if (!dailyProd || dailyProd.length === 0) return 0;
    const total = dailyProd.reduce((sum, item) => sum + item.Docenas, 0);
    return Math.round(total / dailyProd.length);
  }, [dailyProd]);

  const monthEnd = now.endOf('month');
  // Count non-holiday weekdays left including today
  let workdaysLeft = 0;
  let current = now.clone();
  while (current.isSameOrBefore(monthEnd, 'day')) {
    const day = current.day(); // 0: Sunday, 1: Monday, ..., 6: Saturday
    const currFmt = current.format('YYYY-MM-DD');
    const isHoliday = holidays.includes(currFmt);
    if (day >= 1 && day <= 5 && !isHoliday) workdaysLeft++;
    current = current.add(1, 'day');
  }

  const estimate = totalProduced + dailyAverage * workdaysLeft;
  const progress =
    progTotal === 0 ? 0 : Math.round((estimate / progTotal) * 100);

  return (
    <Box className='grid w-full grid-cols-4 gap-4 py-4 pb-12 *:flex-none'>
      {/* Top */}
      <Card>
        <TotalProduced
          dataset={dailyProd}
          totalProduced={totalProduced}
          progress={progress}
          loading={dailyProd.length === 0}
        />
      </Card>
      <Card>
        <TotalEstimate
          estimate={estimate}
          progTotal={progTotal}
          progress={progress}
          loading={
            dailyProd.length === 0 || progTotal === null //|| holidays.length === 0
          }
        />
      </Card>
      <Card>
        <DateEstimate
          totalProduced={totalProduced}
          dailyAverage={dailyAverage}
          progTotal={progTotal}
          holidays={holidays}
          loading={
            dailyProd.length === 0 || progTotal === null //|| holidays.length === 0
          }
        />
      </Card>
      <Card>
        <RequiredProd
          progTotal={progTotal}
          totalProduced={totalProduced}
          workdaysLeft={workdaysLeft}
          loading={
            dailyProd.length === 0 || progTotal === null //|| holidays.length === 0
          }
        />
      </Card>
      {/* Center */}
      <Card>
        <DailyEff setYesterdayEff={setYesterdayEff} />
      </Card>
      <Card className='col-span-2'>
        <CurrentEff yesterdayEff={yesterdayEff} />
      </Card>
      <Card>
        <MonthSaldo />
      </Card>
      {/* Bottom */}
      <Card className='col-span-3'>
        <DailyProduction
          dataset={dailyProd.slice(-10)}
          dailyAverage={dailyAverage}
          loading={dailyProd.length === 0}
        />
      </Card>
      <Card className='col-span-1'>
        {room === 'SEAMLESS' ? (
          <PowerBiGauge
            title="Medidor de producción"
            value={seamlessData.produced}
            target={seamlessData.target}
            loading={seamlessData.loading}
          />
        ) : (
          <PowerBiGauge
            title="Medidor de producción"
            value={algodonData.produced}
            target={algodonData.target}
            loading={algodonData.loading}
          />
        )}
      </Card>
    </Box>
  );
}
