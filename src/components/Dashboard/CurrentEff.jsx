import { BarChart } from '@mui/x-charts';
import { useEffect, useState } from 'react';
import { useConfig } from '../../ConfigContext.jsx';
import ChartContent from './ChartContent.jsx';
import ChartHeader from './ChartHeader.jsx';
import { colors } from '../../utils/chartUtils.js';
import Divider from '@mui/joy/Divider';
import Stack from '@mui/joy/Stack';
import dayjs from 'dayjs';
import { useOutletContext } from 'react-router';

let apiUrl;
export default function CurrentEff({ yesterdayEff }) {
  apiUrl = useConfig().apiUrl;
  const { room } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState({ total: 0, groups: [] });
  const [prevRoom, setPrevRoom] = useState(room);
  if (room !== prevRoom) {
    setPrevRoom(room);
    setLoading(true);
  }

  useEffect(() => {
    let ignored = false;
    let interval;

    fetchEff();
    // fetch every 30 seconds
    interval = setInterval(fetchEff, 30000);

    return () => {
      ignored = true;
      clearInterval(interval);
    };

    function fetchEff() {
      fetch(`${apiUrl}/${room}/stats/currentEfficiency`)
        .then((res) => res.json())
        .then((data) => {
          if (!ignored) {
            setDataset(data);
            setLoading(false);
          }
        })
        .catch((err) =>
          console.error('[CLIENT] Error fetching /stats/currentEff:', err)
        );
    }
  }, [apiUrl, room]);

  return (
    <ChartContent loading={loading} direction='row' gap={8}>
      <Stack direction='column' className='justify-between'>
        <ChartHeader
          title='Eficiencia Actual'
          value={`${dataset.total}%`}
          interval={'Total'}
        />
        {!loading && yesterdayEff.WorkEfficiency && (
          <>
            <Divider />
            <ChartHeader
              title='Eficiencia Prom. Ayer'
              value={`${yesterdayEff.WorkEfficiency}%`}
              interval={`${dayjs
                .tz(yesterdayEff.ProdDate)
                .locale('es')
                .format('ddd DD/MM')}`}
            />
          </>
        )}
      </Stack>
      <BarChart
        loading={loading}
        dataset={dataset.groups}
        borderRadius={8}
        xAxis={[{ dataKey: 'GroupCode', scaleType: 'band' }]}
        yAxis={[
          {
            valueFormatter: (value) => `${value}%`,
            min: 25,
            max: 100,
            scaleType: 'linear',
            tickInterval: [0, 50, 60, 70, 85, 100],
            colorMap: {
              type: 'piecewise',
              thresholds: [80, 85],
              colors: [colors.red, colors.yellow, colors.green],
            },
          },
        ]}
        // dataKey: for y-axis
        // label: for tooltip
        // valueFormatter: for tooltip
        series={[
          {
            dataKey: 'GroupEff',
            label: 'Eficiencia',
            valueFormatter: (value) => `${value}%`,
          },
        ]}
        margin={{ left: 0, right: 0, top: 20, bottom: 0 }}
        grid={{ horizontal: true }}
        slotProps={{ legend: { hidden: true } }}
      />
    </ChartContent>
  );
}
