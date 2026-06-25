import CrisisAlertOutlined from '@mui/icons-material/CrisisAlertOutlined';
import ArrowCircleDownOutlined from '@mui/icons-material/ArrowCircleDownOutlined';
import FlagCircleOutlined from '@mui/icons-material/FlagCircleOutlined';
import HelpOutline from '@mui/icons-material/HelpOutline';
import SyncProblemOutlined from '@mui/icons-material/SyncProblemOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Recommend from '@mui/icons-material/Recommend';
import FrontHand from '@mui/icons-material/FrontHand';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { roundUpEven } from '../../utils/progTableUtils';
import { useOutletContext } from 'react-router';
import localizedNum from '../../utils/numFormat';

export default function TargetCol({ row, faltaUnidades }) {
  const { room } = useOutletContext();
  const iconFontSize = 'small';

  const TargetData = ({ target, icon }) => (
    <Typography
      className='justify-end'
      endDecorator={icon}
      sx={{
        '& .MuiTypography-endDecorator': {
          m: 0,
          ml: 0.5,
          '& svg': { fontSize: '1.375rem' },
        },
      }}
    >
      {target}
    </Typography>
  );

  if (row.Machines.length <= 1) {
    // if one machine, just add pieces to remaining
    // if no machines, just show remaining
    const machPieces = row.Machines[0]?.Pieces;
    const machTarget = roundUpEven(faltaUnidades + (machPieces || 0));

    if (machPieces) {
      // if producing
      if (row.Producido === 0) {
        // Download production record
        return (
          <TargetData
            target={localizedNum(row.Target)}
            icon={<ArrowCircleDownOutlined fontSize={iconFontSize} sx={{ color: 'var(--icon-color-warning)' }} />}
          />
        );
      } else if (machTarget - row.Target > 2) {
        // Reset counter
        return (
          <TargetData
            target={localizedNum(machTarget)}
            icon={<SyncProblemOutlined fontSize={iconFontSize} sx={{ color: 'var(--icon-color-danger)' }} />}
          />
        );
      } else if (
        faltaUnidades > 0 &&
        machTarget < row.Target && // means articulo is incomplete
        row.Machines[0].TargetOrder === 0
      ) {
        // verify counter
        return (
          <TargetData
            target={localizedNum(machTarget)}
            icon={<HelpOutline fontSize={iconFontSize} sx={{ color: 'var(--icon-color-warning)' }} />}
          />
        );
      } else if (
        row.Machines[0].TargetOrder !== 0 &&
        Math.abs(machTarget - row.Machines[0].TargetOrder) > 2
      ) {
        // Target is different from expected
        return (
          <TargetData
            target={
              <Stack component='span' direction='column'>
                <Typography>{localizedNum(machTarget)}</Typography>
                <Typography>
                  (M: {localizedNum(row.Machines[0].TargetOrder)})
                </Typography>
              </Stack>
            }
            icon={<CrisisAlertOutlined fontSize={iconFontSize} sx={{ color: 'var(--icon-color-warning)' }} />}
          />
        );
      } else if (row.Machines[0].TargetOrder === 0 && faltaUnidades <= 0) {
        // target met, stop machine (Llegó. Parar máq.)
        return (
          <TargetData
            target=""
            icon={
              <Stack direction="row" spacing={0.5} alignItems="center">
                <FrontHand fontSize={iconFontSize} sx={{ color: 'var(--icon-color-danger)' }} />
                <ErrorOutline fontSize={iconFontSize} sx={{ color: 'var(--icon-color-danger)' }} />
              </Stack>
            }
          />
        );
      } else if (row.Machines[0].TargetOrder === 0) {
        // no target
        return (
          <TargetData
            target={localizedNum(machTarget)}
            icon={<FlagCircleOutlined fontSize={iconFontSize} sx={{ color: 'var(--icon-color-success)' }} />}
          />
        );
      }
    } else if (faltaUnidades <= 0) {
      // target met, not producing (Llegó)
      return (
        <TargetData
          target=""
          icon={<Recommend fontSize={iconFontSize} sx={{ color: 'white' }} />}
        />
      );
    }

    return localizedNum(machTarget);
  } else {
    return row.Machines.map((m) => {
      // if multiple machines, calculate target per machine
      // divide remaining pieces by number of machines
      let machineTarget = roundUpEven(
        m.Pieces +
          (row.Producido === 0 ? row.Target : faltaUnidades) /
            row.Machines.length
      );

      return (
        <TargetData
          key={m.MachCode}
          target={`${m.MachCode} -> ${localizedNum(machineTarget)}`}
          icon={
            row.Producido === 0 ? (
              <ArrowCircleDownOutlined fontSize='inherit' sx={{ color: 'var(--icon-color-warning)' }} />
            ) : m.TargetOrder === 0 ? (
              <HelpOutline fontSize='inherit' sx={{ color: 'var(--icon-color-warning)' }} />
            ) : null
          }
        />
      );
    });
  }
}
