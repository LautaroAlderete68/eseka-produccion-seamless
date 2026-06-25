import { useConfig } from '../ConfigContext.jsx';
import { useEffect, useState } from 'react';
import EnhancedTable from '../components/Tables/EnhancedTable.jsx';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Input from '@mui/joy/Input';
import RefreshBtn from '../components/RefreshBtn.jsx';
import Typography from '@mui/joy/Typography';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import { DatesContext } from '../Contexts.js';
import dayjs from 'dayjs';

let apiUrl;

export default function Distribucion() {
  ({ apiUrl } = useConfig());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDistribucion();
  }, []);

  function fetchDistribucion() {
    setLoading(true);
    fetch(`${apiUrl}/distribucion`)
      .then((res) => {
        if (!res.ok) throw new Error('HTTP error ' + res.status);
        return res.json();
      })
      .then((incomingData) => {
        if (incomingData.length === 0) {
          setData([
            {
              Articulo: 'No hay datos de distribución',
              ColorBase: '',
              TeñirA: '',
              Hex: null,
              WhiteText: 0
            }
          ]);
        } else {
          setData(incomingData);
        }
      })
      .catch((err) => {
        console.error('[CLIENT] Error fetching /distribucion:', err);
        setData([
          {
            Articulo: 'Error al conectar con el servidor',
            ColorBase: '',
            TeñirA: '',
            Hex: null,
            WhiteText: 0
          }
        ]);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  // Filter data based on search term
  const filteredData = data.filter((row) => {
    if (!searchTerm.trim()) return true;
    return String(row.Articulo || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const cols = [
    {
      id: 'Articulo',
      label: 'Artículo',
      align: 'center',
      width: 'w-[30%]',
    },
    {
      id: 'TeñirA',
      label: 'Color a teñir',
      align: 'center',
      width: 'w-[45%]',
    },
    {
      id: 'ColorBase',
      label: 'Color base',
      align: 'center',
      width: 'w-[25%]',
    },
  ];

  function renderRow(row, i, opened, handleClick) {
    const isNoData = row.Articulo === 'No hay datos de distribución' || row.Articulo === 'Error al conectar con el servidor';
    
    const rowClassName = isNoData 
      ? '*:border-dark-accent bg-neutral-50 italic text-neutral-500' 
      : '*:border-dark-accent hover:bg-row-hover';

    const cellStyle = (!isNoData && row.Hex) ? {
      backgroundColor: row.Hex,
      color: row.WhiteText ? '#FFFFFF' : '#000000',
      fontWeight: '600'
    } : {};

    return [
      rowClassName,
      <>
        <td align='center' className='font-semibold'>
          {row.Articulo}
        </td>
        <td align='center' style={cellStyle}>
          {row.TeñirA || '-'}
        </td>
        <td align='center' style={cellStyle}>
          {row.ColorBase || '-'}
        </td>
      </>
    ];
  }

  return (
    <Box>
      <Stack
        direction='row'
        className='sticky z-10 items-end justify-between gap-4 top-0 bg-[var(--joy-palette-background-body)] py-4'
      >
        <Stack direction='row' gap={2} alignItems='center'>
          <RefreshBtn handleRefresh={fetchDistribucion} loading={loading} />
          <Typography level="h3" component="h1">Distribución de Colores</Typography>
        </Stack>

        <Input
          placeholder="Buscar Artículo..."
          startDecorator={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 240 }}
        />
      </Stack>

      <DatesContext
        value={{
          startDate: dayjs.tz(),
          endDate: dayjs.tz(),
        }}
      >
        <EnhancedTable
          cols={cols}
          rows={filteredData}
          pdfRows={filteredData}
          renderRow={renderRow}
          initOrder='asc'
          initOrderBy='Articulo'
          headerTop='top-[68px]'
          footer={[true]}
          uniqueIds={['Articulo', 'ColorBase']}
        />
      </DatesContext>
    </Box>
  );
}
