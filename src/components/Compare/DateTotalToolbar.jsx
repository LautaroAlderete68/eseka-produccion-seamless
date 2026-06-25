import IconButton from '@mui/joy/IconButton';
import Stack from '@mui/joy/Stack';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import RefreshBtn from '../RefreshBtn.jsx';
import { StyledDatePicker } from '../Inputs/StyledPickers.jsx';
import ProgTotal from '../ProgTotal.jsx';
import dayjs from 'dayjs';

export default function DateTotalToolbar({
  newTargets,
  startDate,
  setStartDate,
  diff,
  setIsResetting,
  setCurrTotal,
  currTotal,
}) {
  return (
    <Stack direction='row' className='items-end gap-4'>
      <Stack direction='row' className='items-end gap-2'>
        <RefreshBtn
          handleRefresh={() => window.location.reload()}
          dangerousRefresh={!!newTargets}
        />
        <StyledDatePicker
          label='Fecha de inicio'
          value={startDate ? dayjs.tz(startDate) : null}
          onChange={(newValue) => {
            if (newValue) {
              setStartDate(newValue.format(sqlDateFormat));
              // fetchCurrTotal() runs on startDate change
            }
          }}
          disabled
          className='max-w-[150px]'
        />

        <IconButton
          color='danger'
          variant='solid'
          disabled={
            !(
              diff &&
              !(
                diff.added.length === 0 &&
                diff.modified.length === 0 &&
                diff.deleted.length === 0
              )
            ) || startDate === null
          }
          onClick={() => {
            setIsResetting(true);
            setStartDate(null);
            setCurrTotal(0); // to trigger a re-render
          }}
        >
          <RestartAltOutlined />
        </IconButton>
      </Stack>

      <ProgTotal startDate={startDate} currTotal={currTotal} />
    </Stack>
  );
}
