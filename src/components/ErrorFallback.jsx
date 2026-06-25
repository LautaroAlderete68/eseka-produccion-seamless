import ErrorOutline from '@mui/icons-material/ErrorOutline';
import SvgIcon from '@mui/joy/SvgIcon';
import Button from '@mui/joy/Button';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Link } from 'react-router';

export default function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <Stack direction='column' className='justify-center w-screen h-screen'>
      <Stack direction='column' className='items-center gap-4'>
        <SvgIcon color='danger' fontSize='xl4'>
          <ErrorOutline />
        </SvgIcon>
        <Typography level='h1'>Hubo un error</Typography>
        <Typography>
          Por favor, informe al sector de Nautilus y vuelva a intentar.
        </Typography>
        {error && (
          <Stack sx={{ p: 2, bgcolor: 'background.level2', borderRadius: 'md', maxWidth: '80%', overflowX: 'auto', mt: 2 }}>
            <Typography color="danger" fontWeight="bold" level="body-md">
              {error.toString()}
            </Typography>
            <pre style={{ fontSize: '11px', textAlign: 'left', marginTop: '8px', color: 'gray' }}>
              {error.stack}
            </pre>
          </Stack>
        )}
        {/* <Button>
      </Button> */}
        <Link to='/'>
          <Button onClick={resetErrorBoundary}>Volver</Button>
        </Link>
      </Stack>
    </Stack>
  );
}
