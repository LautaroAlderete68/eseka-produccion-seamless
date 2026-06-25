import { PieChart } from '@mui/x-charts';
import { useEffect, useState } from 'react';
import { useConfig } from '../../ConfigContext.jsx';
import { styled } from '@mui/joy/styles';
import { useDrawingArea } from '@mui/x-charts/hooks';
import BigNumContent from './BigNumContent.jsx';
import { colors, getIntervalDates } from '../../utils/chartUtils.js';
import { useOutletContext } from 'react-router';
import localizedNum from '../../utils/numFormat.js';

let apiUrl;
export default function MonthSaldo() {
  apiUrl = useConfig().apiUrl;
  const { room } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState({ porc: '0', data: [] });
  const { monthStart, yesterday } = getIntervalDates();
  // for saldo width, since it's so small
  const saldoWidth = 20;

  const [prevRoom, setPrevRoom] = useState(room);
  if (room !== prevRoom) {
    setPrevRoom(room);
    setLoading(true);
    setDataset({ porc: '0', data: [] });
  }

  useEffect(() => {
    let ignored = false;

    fetch(`${apiUrl}/${room}/stats/monthSaldo/`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignored) {
          setDataset(data);
          setLoading(false);
        }
      })
      .catch((err) =>
        console.error('[CLIENT] Error fetching /stats/monthSaldo:', err)
      );

    return () => {
      ignored = true;
    };
  }, [apiUrl, room]);

  return (
    <BigNumContent
      loading={loading}
      title='Saldo Mensual Registrado'
      subtitle={`en las máqs. del ${monthStart.format(
        'D/M'
      )} al ${yesterday.format('D/M')}`}
    >
      <PieChart
        loading={loading}
        series={[
          {
            data: dataset.data.map((item) => ({
              ...item,
              value:
                item.label === 'Saldo' ? item.value * saldoWidth : item.value,
              color:
                item.label === 'Saldo'
                  ? dataset.porc > 1
                    ? colors.red
                    : colors.yellow
                  : colors.gray,
            })),
            valueFormatter: (v) => {
              if (v.label === 'Saldo')
                return localizedNum(v.value / saldoWidth);
              else return localizedNum(v.value);
            },
            highlightScope: { fade: 'global', highlight: 'item' },
            // faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
            innerRadius: '75%',
            paddingAngle: 5,
            cornerRadius: 8,
          },
        ]}
        margin={0}
        hideLegend
        className='w-auto h-full max-w-full'
      >
        <PieCenterLabel>{dataset.porc}%</PieCenterLabel>
      </PieChart>
    </BigNumContent>
  );
}

const StyledText = styled('text')(({ theme }) => ({
  fill: theme.palette.text.primary,
  textAnchor: 'middle',
  dominantBaseline: 'central',
  ...theme.typography.h3,
}));

function PieCenterLabel({ children }) {
  const { width, height, left, top } = useDrawingArea();
  return (
    <StyledText x={left + width / 2} y={top + height / 2}>
      {children}
    </StyledText>
  );
}
