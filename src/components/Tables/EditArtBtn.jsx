import EditOutlined from '@mui/icons-material/EditOutlined';
import { useState } from 'react';
import EditArticuloForm from '../Forms/EditArticuloForm.jsx';
import ModalWrapper from '../ModalWrapper.jsx';
import { useConfig } from '../../ConfigContext.jsx';

export default function EditArtBtn({ articulo, tipo, talle }) {
  const apiUrl = useConfig().apiUrl;
  const [openForm, setOpenForm] = useState(false);
  const [articuloData, setArticuloData] = useState({});

  async function handleClick() {
    try {
      const res = await fetch(
        `${apiUrl}/articulo/${articulo}/${talle}/currentColorDistr`
      );
      const data = await res.json();

      const colorDistr = [];
      data.forEach((row) => {
        colorDistr.push({
          color: row.Color,
          porcentaje: row.Porcentaje,
        });
      });
      setArticuloData({ articulo, tipo, talle, colorDistr });
      setOpenForm(true);
    } catch (err) {
      console.error(
        `[CLIENT] Error fetching /articulo/${articulo}/${talle}/currentColorDistr:`,
        err
      );
    }
  }

  return (
    <>
      <EditOutlined
        size='small'
        onClick={handleClick}
        className='absolute top-0 left-[100%] invisible group-hover/color:visible'
      />

      {openForm && (
        <ModalWrapper
          title={`Editar art. ${articulo} T${talle}`}
          content='Para editar otros datos, pida las modificaciones a la programada y carguela de nuevo.'
          handleClose={() => setOpenForm(false)}
          contentClassName='w-sm'
        >
          <EditArticuloForm articuloData={articuloData} />
        </ModalWrapper>
      )}
    </>
  );
}
