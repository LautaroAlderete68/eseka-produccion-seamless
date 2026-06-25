import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import IconButton from '@mui/joy/IconButton';
import Input from '@mui/joy/Input';
import Option from '@mui/joy/Option';
import Stack from '@mui/joy/Stack';
import Tooltip from '@mui/joy/Tooltip';
import Button from '@mui/joy/Button';
import ColorSelect from './ColorSelect.jsx';
import SelectClearable from './SelectClearable.jsx';
import { useState } from 'react';
import { useOutletContext } from 'react-router';
import ArrowCircleDownOutlined from '@mui/icons-material/ArrowCircleDownOutlined';
import SyncProblemOutlined from '@mui/icons-material/SyncProblemOutlined';
import HelpOutline from '@mui/icons-material/HelpOutline';
import CrisisAlertOutlined from '@mui/icons-material/CrisisAlertOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import FlagCircleOutlined from '@mui/icons-material/FlagCircleOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';

export default function ArtColorTalleInputs({
  formData,
  setFormData,
  btnProps,
  inheritedColors,
  currentRoomAlertsCount = 0,
  onAcknowledgeAllGroups,
  live,
  children,
}) {
  const { room } = useOutletContext();
  const [selectVal, setSelectVal] = useState(null);
  const [selectOpen, setSelectOpen] = useState(false);

  const statusFilters = [
    {
      key: 'needs_download',
      label: 'Necesita descarga',
      icon: <ArrowCircleDownOutlined sx={{ fontSize: '1.25rem' }} />,
      color: 'warning',
    },
    {
      key: 'reset_counter',
      label: 'Reset counter',
      icon: <SyncProblemOutlined sx={{ fontSize: '1.25rem' }} />,
      color: 'danger',
    },
    {
      key: 'verify_counter',
      label: 'Verificar counter',
      icon: <HelpOutline sx={{ fontSize: '1.25rem' }} />,
      color: 'warning',
    },
    {
      key: 'verify_target',
      label: 'Verificar target máq.',
      icon: <CrisisAlertOutlined sx={{ fontSize: '1.25rem' }} />,
      color: 'warning',
    },
    {
      key: 'stop_machine',
      label: 'Parar máq.',
      icon: <ErrorOutline sx={{ fontSize: '1.25rem' }} />,
      color: 'danger',
    },
    {
      key: 'no_target',
      label: 'Sin target',
      icon: <FlagCircleOutlined sx={{ fontSize: '1.25rem' }} />,
      color: 'success',
    },
  ];

  const handleStatusClick = (statusKey) => {
    if (formData.targetStatus === statusKey) {
      const { targetStatus, ...rest } = formData;
      setFormData(rest);
    } else {
      setFormData({ ...formData, targetStatus: statusKey });
    }
  };

  return (
    <Stack direction='row' className='items-end gap-4'>
      {currentRoomAlertsCount > 0 && (
        <FormControl>
          <FormLabel sx={{ opacity: 0, userSelect: 'none' }}>Revisar</FormLabel>
          <Button
            size="sm"
            variant="soft"
            onClick={onAcknowledgeAllGroups}
            startDecorator={<CheckCircleOutlined sx={{ color: 'var(--icon-color-success)', fontSize: '18px' }} />}
            sx={{
              height: '38px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              color: 'var(--icon-color-success)',
              backgroundColor: 'var(--joy-palette-success-softBg)',
              '&:hover': {
                backgroundColor: 'var(--joy-palette-success-softHoverBg)',
              }
            }}
          >
            grupos revisados ({currentRoomAlertsCount})
          </Button>
        </FormControl>
      )}

      {live && (
        <FormControl>
          <FormLabel>Estado</FormLabel>
          <Stack
            direction='row'
            spacing={0.5}
            className='h-[38px] items-center border border-[var(--joy-palette-divider)] rounded-[var(--joy-radius-sm)] px-1.5 bg-[var(--joy-palette-background-surface)]'
          >
            {statusFilters.map((f) => {
              const isSelected = formData.targetStatus === f.key;
              const iconColor = isSelected
                ? f.key === 'no_target'
                  ? 'var(--icon-color-success)'
                  : f.key === 'stop_machine' || f.key === 'reset_counter'
                  ? 'var(--icon-color-danger)'
                  : 'var(--icon-color-warning)'
                : 'var(--joy-palette-text-secondary)';

              return (
                <Tooltip key={f.key} title={f.label} variant='outlined' size='sm'>
                  <IconButton
                    size='sm'
                    variant={isSelected ? 'soft' : 'plain'}
                    color={isSelected ? f.color : 'neutral'}
                    onClick={() => handleStatusClick(f.key)}
                    sx={{
                      '& svg': {
                        color: iconColor,
                      },
                    }}
                  >
                    {f.icon}
                  </IconButton>
                </Tooltip>
              );
            })}
          </Stack>
        </FormControl>
      )}

      <FormControl>
        <FormLabel>Artículo</FormLabel>
        <Input
          slotProps={{
            input: { type: 'number', min: 0.0, max: 99999.99, step: 0.01 },
          }}
          onChange={(e) =>
            setFormData({ ...formData, articulo: e.target.value })
          }
          placeholder='Buscar...'
          className='w-32'
        />
      </FormControl>

      <FormControl>
        <FormLabel>Talle</FormLabel>
        <SelectClearable
          value={selectVal}
          setValue={setSelectVal}
          listboxOpen={selectOpen}
          onListboxOpenChange={setSelectOpen}
          setFormData={(val) => setFormData({ ...formData, talle: val })}
          placeholder='0-7'
          className='min-w-20'
        >
          {['0', '1', '2', '3', '4', '5', '6', '7'].map((val) => (
            <Option key={val} value={val} label={val}>
              {val}
            </Option>
          ))}
        </SelectClearable>
      </FormControl>

      <ColorSelect
        onChange={(color) => setFormData({ ...formData, colorId: color })}
        inheritedColors={inheritedColors}
      />

      {children}

      <IconButton
        color={btnProps.color}
        variant={btnProps.variant}
        type={btnProps.type}
        onKeyDown={btnProps.onKeyDown}
        disabled={Object.values(formData).every(
          (val) => val === undefined || val === ''
        )}
      >
        {btnProps.icon}
      </IconButton>
    </Stack>
  );
}
