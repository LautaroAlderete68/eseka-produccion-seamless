import CrisisAlertOutlined from '@mui/icons-material/CrisisAlertOutlined';
import ArrowCircleDownOutlined from '@mui/icons-material/ArrowCircleDownOutlined';
import FlagCircleOutlined from '@mui/icons-material/FlagCircleOutlined';
import ListAltOutlined from '@mui/icons-material/ListAltOutlined';
import HelpOutline from '@mui/icons-material/HelpOutline';
import SyncProblemOutlined from '@mui/icons-material/SyncProblemOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Recommend from '@mui/icons-material/Recommend';
import FrontHand from '@mui/icons-material/FrontHand';
import Box from '@mui/joy/Box';
import Dropdown from '@mui/joy/Dropdown';
import ListDivider from '@mui/joy/ListDivider';
import ListItem from '@mui/joy/ListItem';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import Menu from '@mui/joy/Menu';
import MenuButton from '@mui/joy/MenuButton';
import Stack from '@mui/joy/Stack';

export default function ProgLegend({ live }) {
  return (
    <Dropdown>
      <MenuButton
        variant='outlined'
        size='sm'
        startDecorator={<ListAltOutlined />}
        className='font-normal'
      >
        Leyenda
      </MenuButton>
      <Menu size='sm' placement='top-end' sx={{ '& svg': { fontSize: '1.375rem' } }}>
        <ListItem>
          <ListItemDecorator>
            <Box className='size-4 bg-todo rounded-[var(--joy-radius-sm)]' />
          </ListItemDecorator>{' '}
          Aprobado
        </ListItem>
        <ListItem>
          <ListItemDecorator>
            <Box className='size-4 bg-making rounded-[var(--joy-radius-sm)]' />
          </ListItemDecorator>{' '}
          Tejiendo
        </ListItem>
        <ListItem>
          <ListItemDecorator>
            <Box className='size-4 bg-done rounded-[var(--joy-radius-sm)]' />
          </ListItemDecorator>{' '}
          Terminado
        </ListItem>
        <ListItem>
          <ListItemDecorator>
            <Box className='size-4 bg-almost-done rounded-[var(--joy-radius-sm)]' />
          </ListItemDecorator>{' '}
          Casi terminado
        </ListItem>
        <ListItem>
          <ListItemDecorator>
            <Box className='size-4 bg-incomplete rounded-[var(--joy-radius-sm)]' />
          </ListItemDecorator>{' '}
          Incompleto
        </ListItem>
        <ListItem>
          <ListItemDecorator>
            <Box className='size-4 bg-[var(--joy-palette-background-surface)] border border-[var(--joy-palette-divider)] rounded-[var(--joy-radius-sm)]' />
          </ListItemDecorator>{' '}
          Distribución pendiente
        </ListItem>
        {live && (
          <>
            <ListDivider inset='gutter' />
            <ListItem>
              <ListItemDecorator>
                <ArrowCircleDownOutlined fontSize='small' sx={{ color: 'var(--icon-color-warning)' }} />
              </ListItemDecorator>{' '}
              Necesita descarga
            </ListItem>
            <ListItem>
              <ListItemDecorator>
                <SyncProblemOutlined fontSize='small' sx={{ color: 'var(--icon-color-danger)' }} />
              </ListItemDecorator>{' '}
              Reset counter
            </ListItem>
            <ListItem>
              <ListItemDecorator>
                <HelpOutline fontSize='small' sx={{ color: 'var(--icon-color-warning)' }} />
              </ListItemDecorator>{' '}
              Verificar counter
            </ListItem>
            <ListItem>
              <ListItemDecorator>
                <CrisisAlertOutlined fontSize='small' sx={{ color: 'var(--icon-color-warning)' }} />
              </ListItemDecorator>{' '}
              Verificar target máq.
            </ListItem>
            <ListItem>
              <ListItemDecorator>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <FrontHand fontSize='small' sx={{ color: 'var(--icon-color-danger)' }} />
                  <ErrorOutline fontSize='small' sx={{ color: 'var(--icon-color-danger)' }} />
                </Stack>
              </ListItemDecorator>{' '}
              Llegó. Parar máq.
            </ListItem>
            <ListItem>
              <ListItemDecorator>
                <Recommend fontSize='small' sx={{ color: 'white' }} />
              </ListItemDecorator>{' '}
              Llegó
            </ListItem>
            <ListItem>
              <ListItemDecorator>
                <FlagCircleOutlined fontSize='small' sx={{ color: 'var(--icon-color-success)' }} />
              </ListItemDecorator>{' '}
              Sin target
            </ListItem>
          </>
        )}
      </Menu>
    </Dropdown>
  );
}
