import CloseOutlined from '@mui/icons-material/CloseOutlined';
import RefreshOutlined from '@mui/icons-material/RefreshOutlined';
import IconButton from '@mui/joy/IconButton';
import { useState } from 'react';

export default function RefreshBtn({
  handleRefresh,
  dangerousRefresh = false,
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = (e) => {
    if (!dangerousRefresh) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);
    }
    if (handleRefresh) {
      handleRefresh(e);
    }
  };

  return !dangerousRefresh ? (
    <IconButton color='primary' variant='soft' onClick={handleClick}>
      <RefreshOutlined className={isAnimating ? 'animate-spin-2s' : ''} />
    </IconButton>
  ) : (
    <IconButton color='danger' variant='soft' onClick={handleRefresh}>
      <CloseOutlined />
    </IconButton>
  );
}
