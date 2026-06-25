import { useEffect, useState } from 'react';
import EnhancedTable from './EnhancedTable.jsx';
import { DatesContext } from '../../Contexts.js';
import dayjs from 'dayjs';
import {
  calcIdealTime,
  calcRealTime,
  getDuration,
  getDurationUnix,
  getMachState,
  getWorkEff,
  isParada,
} from '../../utils/maquinasUtils.js';
import { useConfig } from '../../ConfigContext.jsx';
import { useOutletContext } from 'react-router';
import Typography from '@mui/joy/Typography';
import ExpandRowBtn from './ExpandRowBtn.jsx';
import localizedNum from '../../utils/numFormat.js';

let apiUrl;
export default function MaquinasTable({ machines, pdfRows }) {
  apiUrl = useConfig().apiUrl;
  const { room } = useOutletContext();

  const [currEff, setCurrEff] = useState(null);

  useEffect(() => {
    let ignored = false;

    fetch(`${apiUrl}/${room}/stats/currentEfficiency`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignored) {
          setCurrEff(data);
        }
      })
      .catch((err) =>
        console.error('[CLIENT] Error fetching /stats/currentEff:', err)
      );

    return () => {
      ignored = true;
    };
  }, []);

  const cols = [
    {
      id: 'MachCode',
      label: 'Máquina',
      align: 'center',
      width: 'w-[9%]',
    },
    room !== 'HOMBRE'
      ? {
          id: 'styleCode',
          label: 'Cadena',
          align: 'center',
          pdfRender: (row) =>
            isParada(row) ? 'PARADA' : row.StyleCode.styleCode,
          sortFn: (a, b, order) => {
            let aStyleCode = a.StyleCode.styleCode;
            let bStyleCode = b.StyleCode.styleCode;

            if (isParada(a)) aStyleCode = 'PARADA';
            if (isParada(b)) bStyleCode = 'PARADA';

            if (aStyleCode < bStyleCode) return 1;
            if (aStyleCode > bStyleCode) return -1;
            return 0;
          },
        }
      : {
          id: 'articulo',
          label: 'Artículo',
          width: 'w-[9%]',
          pdfRender: (row) =>
            isParada(row)
              ? 'PARADA'
              : Number(`${row.StyleCode.articulo}.${row.StyleCode.punto}`),
          sortFn(a, b, order) {
            let aArticulo = Number(
              `${a.StyleCode.articulo}.${a.StyleCode.punto}`
            );
            let bArticulo = Number(
              `${b.StyleCode.articulo}.${b.StyleCode.punto}`
            );

            if (isParada(a)) aArticulo = null;
            if (isParada(b)) bArticulo = null;

            if (!aArticulo) aArticulo = order === 'asc' ? Infinity : -Infinity;
            if (!bArticulo) bArticulo = order === 'asc' ? Infinity : -Infinity;

            return bArticulo - aArticulo;
          },
        },
    ,
    room === 'HOMBRE'
      ? {
          id: 'talle',
          label: 'Talle',
          align: 'center',
          width: 'w-[6%]',
          pdfRender: (row) => (isParada(row) ? '' : row.StyleCode.talle),
        }
      : null,
    {
      id: 'Pieces',
      label: 'Prendas',
      align: 'right',
      width: 'w-[8%]',
      pdfRender: (row) => (isParada(row) ? '' : localizedNum(row.Pieces)),
      sortFn: (a, b, order) => {
        let aPieces = a.Pieces;
        let bPieces = b.Pieces;

        if (isParada(a)) aPieces = null;
        if (isParada(b)) bPieces = null;

        if (!aPieces) aPieces = order === 'asc' ? Infinity : -Infinity;
        if (!bPieces) bPieces = order === 'asc' ? Infinity : -Infinity;

        return bPieces - aPieces;
      },
    },
    {
      id: 'TargetOrder',
      label: 'Target',
      align: 'right',
      width: 'w-[8%]',
      pdfRender: (row) => (isParada(row) ? '' : localizedNum(row.TargetOrder)),
      sortFn: (a, b, order) => {
        let aTargetOrder = a.TargetOrder;
        let bTargetOrder = b.TargetOrder;

        if (isParada(a)) aTargetOrder = null;
        if (isParada(b)) bTargetOrder = null;

        if (!aTargetOrder)
          aTargetOrder = order === 'asc' ? Infinity : -Infinity;
        if (!bTargetOrder)
          bTargetOrder = order === 'asc' ? Infinity : -Infinity;

        return bTargetOrder - aTargetOrder;
      },
    },
    {
      id: 'idealTime',
      label: 'Tiempo al 100%',
      align: 'center',
      pdfRender: (row) => getDuration(calcIdealTime(row)),
      sortFn: (a, b, order) => {
        let aIdealTime = getDurationUnix(calcIdealTime(a));
        let bIdealTime = getDurationUnix(calcIdealTime(b));

        if (!aIdealTime) aIdealTime = order === 'asc' ? Infinity : -Infinity;
        if (!bIdealTime) bIdealTime = order === 'asc' ? Infinity : -Infinity;

        return bIdealTime - aIdealTime;
      },
    },
    {
      id: 'realTime',
      label: 'Tiempo Real',
      align: 'center',
      pdfRender: (row) => getDuration(calcRealTime(row)),
      sortFn: (a, b, order) => {
        let aRealTime = getDurationUnix(calcRealTime(a));
        let bRealTime = getDurationUnix(calcRealTime(b));

        if (!aRealTime) aRealTime = order === 'asc' ? Infinity : -Infinity;
        if (!bRealTime) bRealTime = order === 'asc' ? Infinity : -Infinity;

        return bRealTime - aRealTime;
      },
    },
    {
      id: 'WorkEfficiency',
      label: 'Eff. %',
      align: 'right',
      width: 'w-[6%]',
      pdfRender: (row) => getWorkEff(row) && `${getWorkEff(row)}%`,
      sortFn: (a, b, order) => {
        let aWorkEff = getWorkEff(a);
        let bWorkEff = getWorkEff(b);

        if (!aWorkEff) aWorkEff = order === 'asc' ? Infinity : -Infinity;
        if (!bWorkEff) bWorkEff = order === 'asc' ? Infinity : -Infinity;

        return bWorkEff - aWorkEff;
      },
    },
    {
      id: 'State',
      label: 'Estado',
      align: 'center',
      pdfRender: (row) => getMachState(row).text,
      sortFn: (a, b, order) => {
        const orderMap = {
          8: 0, // PRODUCCION
          6: 1, // ELECTRONICO
          7: 2, // MECANICO
          11: 3, // MUESTRA
          9: 4, // FALTA HILADO
          10: 5, // FALTA REPUESTO
          13: 6, // TURBINA
          12: 7, // CAMBIO ARTICULO
          5: 9, // TARGET
          4: 8, // F1
          3: 11, // STOP BUTTON
          2: 10, // AUTOMATIC STOP
          1: 12, // RUN
          0: 13, // POWER OFF
          56: 14, // OFFLINE
          65535: 15, // DESINCRONIZADA
        };
        return orderMap[b.State] - orderMap[a.State];
      },
    },
  ];

  function renderRow(row, i, opened, handleClick) {
    let machState = getMachState(row);

    return [
      machState.rowColor,
      <>
        <td align='center' className='font-semibold'>
          <Typography
            className='relative justify-center w-full'
            startDecorator={
              <ExpandRowBtn isOpen={opened === row.MachCode} handleClick={handleClick} />
            }
            sx={{
              '.MuiTypography-startDecorator': {
                m: 0,
                position: 'absolute',
                left: 0,
              },
            }}
          >
            {row.MachCode}
          </Typography>
        </td>
        {room !== 'HOMBRE' ? (
          <td align='center' className='font-semibold'>
            {isParada(row) ? 'PARADA' : row.StyleCode.styleCode}
          </td>
        ) : (
          <td className='font-semibold'>
            {isParada(row)
              ? 'PARADA'
              : Number(`${row.StyleCode.articulo}.${row.StyleCode.punto}`)}
          </td>
        )}
        {room === 'HOMBRE' && (
          <td align='center' className='font-semibold'>
            {isParada(row) ? null : row.StyleCode.talle}
          </td>
        )}
        <td align='right'>{isParada(row) ? null : localizedNum(row.Pieces)}</td>
        <td align='right'>
          {isParada(row) ? null : localizedNum(row.TargetOrder)}
        </td>
        <td align='center'>{getDuration(calcIdealTime(row))}</td>
        <td align='center'>{getDuration(calcRealTime(row))}</td>
        <td align='right'>{getWorkEff(row) && `${getWorkEff(row)}%`}</td>
        <td align='center'>{machState.text}</td>
      </>,
    ];
  }

  return (
    <DatesContext
      value={{ startDate: dayjs.tz(), fromMonthStart: true, endDate: null }}
    >
      <EnhancedTable
        cols={cols}
        rows={machines}
        pdfRows={pdfRows}
        renderRow={renderRow}
        initOrder='asc'
        initOrderBy='MachCode'
        headerTop='top-[94px]'
        footer={[
          room === 'HOMBRE', // Talle
          true, // Prendas
          true, // Target
          `Tejiendo: ${machines.filter((m) => m.State === 0).length}`, // Tiempo al 100%
          `Paradas: ${machines.filter((m) => m.State !== 0).length}`, // Tiempo Actual
          `${currEff?.total ? `${currEff.total}%` : '...'}`, // Eff. %
          `${machines.length} máquinas`, // Estado
        ]}
        uniqueIds={['MachCode']}
      />
    </DatesContext>
  );
}
