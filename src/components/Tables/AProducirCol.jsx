import { useContext, useEffect, useRef, useState } from 'react';
import { useConfig } from '../../ConfigContext.jsx';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import Typography from '@mui/joy/Typography';
import { ToastsContext } from '../../Contexts.js';
import { aProducirStr } from '../../utils/progTableUtils.js';
import { useOutletContext } from 'react-router';

let apiUrl;

// If an articulo has a NULL color distr, docenas will be null.
// This lets the user input the docenas value and update the programada.
export default function AProducirCol({
  row,
  startDate,
  setProgColor,
  setFilteredProgColor,
  live,
}) {
  apiUrl = useConfig().apiUrl;
  const { room } = useOutletContext();
  const { addToast } = useContext(ToastsContext);
  const [editProducir, setEditProducir] = useState(false);
  const [docenas, setDocenas] = useState();
  const inputRef = useRef(null);

  useEffect(() => {
    let timeoutId;
    if (editProducir) {
      timeoutId = setTimeout(() => {
        inputRef.current.focus();
      }, 10);
    }

    return () => clearTimeout(timeoutId);
  }, [editProducir]);

  async function handleProducirEdit(e) {
    e.preventDefault();

    try {
      const docRes = await fetch(`${apiUrl}/programada/updateDocenas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programadaId: row.Programada,
          colorDistrId: row.ColorDistr,
          articulo: row.Articulo,
          talle: row.Talle,
          color: row.Color,
          docenas,
        }),
      });

      const docData = await docRes.json();
      addToast({
        type: docRes.status === 500 ? 'danger' : 'success',
        message: docData.message,
      });

      // update programada view
      const params = new URLSearchParams({
        startDate,
      }).toString();
      const res = await fetch(`${apiUrl}/${room}/programada?${params}`);
      const data = await res.json();

      setProgColor(data);
      setFilteredProgColor(data);
      setEditProducir(false);
    } catch (err) {
      console.error('[CLIENT] Error fetching /programada/updateDocenas:', err);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleProducirEdit(e);
    }
  };

  return !editProducir ? (
    <span>
      {(() => {
        if (!row.Docenas && row.Docenas !== 0) {
          return live && <EditOutlined onClick={() => setEditProducir(true)} />;
        } else {
          return (
            <Typography
              className='justify-end'
              startDecorator={
                live &&
                row.Porcentaje === null && (
                  <EditOutlined
                    className='invisible group-hover/prod:visible'
                    onClick={() => setEditProducir(true)}
                  />
                )
              }
            >
              {aProducirStr(row)}
            </Typography>
          );
        }
      })()}
    </span>
  ) : (
    <form onSubmit={handleProducirEdit} className='grid grid-cols-2 gap-1'>
      <Input
        type='number'
        slotProps={{
          input: { ref: inputRef, min: 0, sx: { textAlign: 'right' } },
        }}
        onChange={(e) => setDocenas(e.target.value)}
        className='col-span-2'
        required
      />
      <Button color='danger' onClick={() => setEditProducir(false)}>
        <CloseOutlined />
      </Button>
      <Button type='submit' onKeyDown={(e) => handleKeyDown(e)}>
        <CheckOutlined />
      </Button>
    </form>
  );
}
