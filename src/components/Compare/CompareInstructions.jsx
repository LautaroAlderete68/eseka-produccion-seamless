import KeyboardArrowDownOutlined from '@mui/icons-material/KeyboardArrowDownOutlined';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import Card from '@mui/joy/Card';
import IconButton from '@mui/joy/IconButton';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import Typography from '@mui/joy/Typography';
import { useState } from 'react';

export default function CompareInstructions() {
  const [openInstr, setOpenInstr] = useState(false);

  return (
    <Card variant='soft' color='neutral' className='p-2 pl-8'>
      <List
        sx={{
          '--List-insetStart': '32px',
          '--ListItem-paddingY': '0px',
          '--ListItem-paddingRight': '16px',
          '--ListItem-paddingLeft': '21px',
          '--ListItem-startActionWidth': '0px',
          '--ListItem-startActionTranslateX': '-50%',
        }}
      >
        <ListItem
          nested
          className='justify-center'
          startAction={
            <IconButton
              variant='plain'
              color='neutral'
              onClick={() => setOpenInstr(!openInstr)}
            >
              <KeyboardArrowDownOutlined
                sx={{
                  transition: '0.2s',
                  // Rotate icon depending on sort order
                  transform: openInstr ? 'rotate(0deg)' : 'rotate(-90deg)',
                }}
              />
            </IconButton>
          }
        >
          <Typography level='title-lg'>Instrucciones</Typography>
        </ListItem>
        {openInstr && (
          <List marker='decimal' size='sm'>
            <ListItem>
              <Typography>Cargue el PDF de la programada actual.</Typography>
            </ListItem>
            <ListItem>
              <Typography>
                Oprima{' '}
                <Typography
                  variant='solid'
                  color='primary'
                  className='font-bold'
                >
                  Comparar
                </Typography>{' '}
                para ver los cambios.
              </Typography>
            </ListItem>
            <ListItem>
              <Typography>
                Para cargar los cambios, oprima{' '}
                <Typography
                  variant='solid'
                  color='primary'
                  className='font-bold'
                >
                  Cargar cambios
                </Typography>
              </Typography>
            </ListItem>
            <ListItem>
              <Typography>
                Para cargar programada nueva del mes, oprima{' '}
                <Typography variant='solid' color='danger'>
                  <RestartAltOutlined className='pb-1' />
                </Typography>{' '}
                para resetear y luego{' '}
                <Typography
                  variant='solid'
                  color='primary'
                  className='font-bold'
                >
                  Cargar todo
                </Typography>
              </Typography>
            </ListItem>
          </List>
        )}
      </List>
    </Card>
  );
}
