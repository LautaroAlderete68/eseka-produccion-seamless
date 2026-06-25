import { useConfig } from '../../ConfigContext.jsx';
import { useEffect, useMemo, useState } from 'react';
import {
  dateFormatter,
  colors,
  getIntervalDates,
} from '../../utils/chartUtils.js';
import ChartContent from './ChartContent.jsx';
import ChartHeader from './ChartHeader.jsx';
import SparkLineOverflow from './SparkLineOverflow.jsx';
import { useOutletContext } from 'react-router';

let apiUrl;
export default function DailyEff({ setYesterdayEff }) {
  apiUrl = useConfig().apiUrl;
  const { room } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState([]);
  const { monthStart, yesterday } = getIntervalDates();
  const [prevRoom, setPrevRoom] = useState(room);
  if (room !== prevRoom) {
    setPrevRoom(room);
    setLoading(true);
    setDataset([]);
  }

  useEffect(() => {
    let ignored = false;

    fetch(`${apiUrl}/${room}/stats/dailyEfficiency`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignored) {
          setDataset(data);
          setLoading(false);
          setYesterdayEff(
            data[data.length - 1]
              ? data[data.length - 1]
              : { WorkEfficiency: null, ProdDate: null }
          );
        }
      })
      .catch((err) =>
        console.error('[CLIENT] Error fetching /stats/dailyEfficiency:', err)
      );

    return () => {
      ignored = true;
    };
  }, [apiUrl, room, setYesterdayEff]);

  const avgEff = useMemo(() => {
    if (dataset.length === 0) return 0;
    const total = dataset.reduce((acc, row) => acc + row.WorkEfficiency, 0);
    return Math.round(total / dataset.length);
  }, [dataset]);

  const effColor =
    avgEff >= 85 ? colors.green : avgEff >= 80 ? colors.yellow : colors.red;

  const data = dataset.map((row) => row.WorkEfficiency);
  const dataSettings = {
    data,
    color: effColor,
    xAxis: {
      data: dataset.map((row) => row.ProdDate),
      valueFormatter: dateFormatter,
    },
    yAxis: { min: Math.min(...data) - 5, max: Math.max(...data) + 5 },
  };

  return (
    <ChartContent loading={loading}>
      <ChartHeader
        title='Eficiencia Promedio'
        value={`${avgEff}%`}
        interval={`Del ${monthStart.format('D/M')} al ${yesterday.format(
          'D/M'
        )}`}
      />
      <SparkLineOverflow
        dataSettings={dataSettings}
        color={effColor}
        id='eff'
      />
    </ChartContent>
  );
}
