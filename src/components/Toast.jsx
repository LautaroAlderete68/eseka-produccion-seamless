import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import IconButton from '@mui/joy/IconButton';
import Snackbar from '@mui/joy/Snackbar';
import { useState } from 'react';

export default function Toast({ toast, removeToast }) {
  const [open, setOpen] = useState(true);
  const startDecorator =
    toast.type === 'success' ? <CheckCircleOutlined /> : <ErrorOutline />;

  const closeToast = (id) => {
    setOpen(false);
    removeToast(id);
  };

  return (
    <Snackbar
      color={toast.type}
      variant='soft'
      size='sm'
      autoHideDuration={toast.duration !== undefined ? toast.duration : 5000}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      open={open}
      className='static ml-auto w-fit'
      onClose={(event, reason) => {
        if (reason === 'clickaway') {
          return;
        }

        closeToast(toast.id);
      }}
      startDecorator={startDecorator}
      endDecorator={
        <IconButton
          size='sm'
          variant='soft'
          color={toast.type}
          onClick={() => closeToast(toast.id)}
        >
          <CloseOutlined />
        </IconButton>
      }
    >
      {toast.message}
    </Snackbar>
  );
}
