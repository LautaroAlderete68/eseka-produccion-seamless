import KeyboardArrowDownOutlined from '@mui/icons-material/KeyboardArrowDownOutlined';

export default function ExpandRowBtn({ isOpen, handleClick, ...props }) {
  return (
    <KeyboardArrowDownOutlined
      onClick={handleClick}
      sx={{
        transition: 'transform 0.2s',
        // Rotate icon depending on sort order
        transform: isOpen ? 'rotate(-180deg)' : 'rotate(0deg)',
      }}
      className={`invisible group-hover/row:visible ${props.className}`}
    />
  );
}
