import Skeleton from '@mui/joy/Skeleton';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import { useEffect, useState } from 'react';
import { useConfig } from '../ConfigContext.jsx';
import { useOutletContext } from 'react-router';
import localizedNum from '../utils/numFormat.js';

let apiUrl;

export default function ProgTotal({ startDate, currTotal = undefined, targetTotal = undefined }) {
  apiUrl = useConfig().apiUrl;
  const { room } = useOutletContext();
  const [total, setTotal] = useState(currTotal);

  // get current programada total on load
  useEffect(() => {
    let ignore = false;

    if (currTotal !== undefined) {
      if (!ignore) setTotal(currTotal);
    } else if (startDate) {
      // fetch total of current programada
      fetch(`${apiUrl}/${room}/programada/total/${startDate}?_t=${Date.now()}`)
        .then((res) => res.json())
        .then((data) => {
          if (!ignore) setTotal(data[0].Total);
        })
        .catch((err) =>
          console.error('[CLIENT] Error fetching /programada/total:', err)
        );
    }

    return () => {
      ignore = true;
    };
  }, [startDate, currTotal]);

  const hasMatch = targetTotal !== undefined && total !== undefined && Math.round(total) === Math.round(targetTotal);

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ display: 'inline-flex' }}>
      <Typography
        level='body-lg'
        className={!total && startDate && 'flex items-end gap-1'}
      >
        Total actual:{' '}
        {total !== undefined ? (
          localizedNum(total)
        ) : startDate ? (
          <Skeleton
            variant='text'
            level='body-lg'
            width={70}
            className='inline-block pb-1'
          />
        ) : (
          0
        )}
      </Typography>
      {targetTotal !== undefined && total !== undefined && (
        hasMatch ? (
          <CheckCircleOutlined sx={{ fontSize: '20px', color: 'var(--icon-color-success)' }} />
        ) : (
          <CancelOutlined sx={{ fontSize: '20px', color: 'var(--icon-color-danger)' }} />
        )
      )}
    </Stack>
  );
}
