import PrintOutlined from '@mui/icons-material/PrintOutlined';
import IconButton from '@mui/joy/IconButton';
import { useConfig } from '../../ConfigContext.jsx';
import { useLocation, useOutletContext } from 'react-router';
import { useContext, useState } from 'react';
import { DatesContext, ToastsContext } from '../../Contexts.js';
import { buildPdfPayload } from '../../utils/pdfPayload.js';
import dayjs from 'dayjs';

export default function EnhancedFooter({
  footer,
  cols,
  rows,
  selected,
  uniqueId,
}) {
  const { apiUrl } = useConfig();
  const { pathname } = useLocation();
  const { addToast } = useContext(ToastsContext);
  const { startDate, endDate } = useContext(DatesContext);
  const { room, docena, porcExtra } = useOutletContext();

  const [loading, setLoading] = useState(false);

  const getPDFOpts = () => {
    switch (pathname) {
      case '/programada/anteriores':
        return {
          title: `Programada del ${dayjs
            .tz(startDate)
            .startOf('month')
            .format('DD/MM/YYYY')}`,
          fileName: `Programada_${dayjs
            .tz(startDate)
            .startOf('month')
            .format('DD-MM-YYYYTHH.mm.ss')}`,
          appendDateToTitle: false,
          footerCols: ['Docenas', 'Producido', 'falta'],
        };
      case '/produccion':
        return {
          title: `Producción del ${dayjs
            .tz(startDate)
            .format('DD/MM/YYYY HH:mm')} al ${dayjs
            .tz(endDate)
            .format('DD/MM/YYYY HH:mm')}`,
          fileName: `Produccion_${dayjs
            .tz(startDate)
            .format('DD-MM-YYYYTHH.mm.ss')}_${dayjs
            .tz(endDate)
            .format('DD-MM-YYYYTHH.mm.ss')}`,
          orientation: 'portrait',
          appendDateToTitle: false,
          footerCols: ['Unidades', 'Docenas'],
        };
      case '/maquinas':
        return {
          title: 'Máquinas',
          fileName: `Maquinas_${dayjs.tz().format('DD-MM-YYYYTHH.mm.ss')}`,
        };
      case '/cambios':
        return {
          title: `Cambios del ${dayjs.tz(startDate).format('DD/MM/YYYY')}`,
          orientation: 'portrait',
          appendDateToTitle: false,
          fileName: `Cambios_${dayjs
            .tz(startDate)
            .format('DD-MM-YYYYTHH.mm.ss')}`,
        };
      default:
        return {
          title: 'Programada Actual',
          fileName: `Programada-Actual_${dayjs
            .tz()
            .format('DD-MM-YYYYTHH.mm.ss')}`,
          footerCols: ['Docenas', 'Producido', 'falta'],
          addToProgramada: room === 'HOMBRE',
        };
    }
  };

  function getSelectedRows(rows, selected) {
    return rows.filter((row) => selected.includes(uniqueId(row)));
  }

  const handlePDFExport = async () => {
    setLoading(true);
    try {
      const selectedRows = getSelectedRows(rows, selected);
      // Build a safe, serializable payload
      const {
        columns,
        rows: parsedRows,
        footer,
        footnote,
      } = await buildPdfPayload(
        cols,
        selectedRows,
        getPDFOpts().footerCols,
        getPDFOpts().addToProgramada,
        [room, startDate, docena, porcExtra]
      );

      const res = await fetch(`${apiUrl}/export/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columns,
          rows: parsedRows,
          footer: getPDFOpts().footerCols ? footer : null,
          footnote: getPDFOpts().addToProgramada ? footnote : null,
          ...getPDFOpts(),
        }),
      });

      const data = await res.json();
      addToast({
        type: res.status === 500 ? 'danger' : 'success',
        message: data.message,
      });

      if (res.ok) {
        await window.electronAPI.openPath(data.filePath);
      }
    } catch (err) {
      console.error('[CLIENT] Error exporting PDF:', err);
      addToast({
        type: 'danger',
        message: 'No se pudo exportar el PDF correctamente.',
      });
    }

    setLoading(false);
  };

  return (
    <tfoot className='sticky bottom-0 z-10 font-semibold [&_td]:h-[50px]'>
      <tr>
        {/* Selected */}
        <td
          colSpan={2}
          className='text-[var(--joy-palette-text-tertiary)] font-normal'
        >
          {selected.length > 0 && `${selected.length} seleccionadas`}
        </td>
        <td className='text-center'>
          {selected.length > 0 && (
            <IconButton
              loading={loading}
              variant='soft'
              onClick={handlePDFExport}
            >
              <PrintOutlined className='text-(--joy-palette-primary-500)' />
            </IconButton>
          )}
        </td>
        {footer.filter(Boolean).map((foot, i) => (
          <td
            key={i}
            align={foot === 'Total' ? 'right' : cols[i + 2].align || 'left'}
          >
            {foot}
          </td>
        ))}
      </tr>
    </tfoot>
  );
}
