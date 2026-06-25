import Box from '@mui/joy/Box';
import Checkbox from '@mui/joy/Checkbox';
import Link from '@mui/joy/Link';
import ArrowDownwardOutlined from '@mui/icons-material/ArrowDownwardOutlined';
import { visuallyHidden } from '@mui/utils';

/**
 * EnhancedTableHead renders the table header row with sortable columns and a select-all checkbox.
 *
 * Props:
 * - cols: Array of objects describing each column (id, label, numeric).
 * - onSelectAllClick: Handler for the select-all checkbox.
 * - order: Current sort order ('asc' or 'desc').
 * - orderBy: ID of the column currently sorted.
 * - numSelected: Number of selected rows.
 * - rowCount: Total number of rows.
 * - onRequestSort: Handler to request sorting by a column.
 */
export default function EnhancedHead({
  cols,
  order,
  orderBy,
  onSelectAllClick,
  numSelected,
  rowCount,
  onRequestSort,
  headerTop = '',
}) {
  /**
   * Returns a function that handles sorting when a column header is clicked.
   * @param {string} property - The column ID to sort by.
   * @returns {function} - Event handler for sorting.
   */
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <thead className={`sticky z-10 ${headerTop}`}>
      <tr>
        <th className='w-10'>
          {/* 
            Checkbox for selecting all rows.
            - indeterminate: true if some but not all rows are selected.
            - checked: true if all rows are selected.
            - onChange: triggers onSelectAllClick handler.
          */}
          <Checkbox
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            sx={{ verticalAlign: 'sub' }}
          />
        </th>

        {/* Render a header cell for each column */}
        {cols.map((col) => {
          const alignment = `text-${col.align || 'left'}`;
          // Determine if this column is currently sorted
          const active = orderBy === col.id;
          return (
            <th
              key={col.id}
              aria-sort={
                active
                  ? { asc: 'ascending', desc: 'descending' }[order]
                  : undefined
              }
              className={`${col.width || ''} ${alignment}`}
            >
              {/* 
                Link acts as a button to trigger sorting.
                - onClick: triggers sorting for this column.
                - startDecorator/endDecorator: shows sort icon before/after label depending on column type.
              */}
              <Link
                underline='none'
                color='neutral'
                textColor={active ? 'primary.plainColor' : undefined}
                className={col.labelWidth || ''}
                component='button'
                onClick={order && orderBy && createSortHandler(col.id)}
                startDecorator={
                  col.align && (
                    <ArrowDownwardOutlined
                      fontSize='small'
                      sx={[active ? { opacity: 1 } : { opacity: 0 }]}
                    />
                  )
                }
                endDecorator={
                  !col.align && (
                    <ArrowDownwardOutlined
                      fontSize='small'
                      sx={[active ? { opacity: 1 } : { opacity: 0 }]}
                    />
                  )
                }
                sx={{
                  '& .MuiLink-startDecorator': {
                    margin: 0,
                    position: 'absolute',
                    right: '100%',
                  },
                  '& .MuiLink-endDecorator': {
                    margin: 0,
                    position: 'absolute',
                    left: '100%',
                  },
                  '& svg': {
                    transition: '0.2s',
                    // Rotate icon depending on sort order
                    transform:
                      active && order === 'desc'
                        ? 'rotate(0deg)'
                        : 'rotate(180deg)',
                  },
                  // On hover, make icon visible
                  '&:hover': { '& svg': { opacity: 1 } },
                }}
              >
                {col.label}
                {/* 
                  Visually hidden text for screen readers indicating sort direction.
                  Only rendered if this column is active.
                */}
                {order && orderBy && active ? (
                  <Box component='span' sx={visuallyHidden}>
                    {order === 'desc'
                      ? 'sorted descending'
                      : 'sorted ascending'}
                  </Box>
                ) : null}
              </Link>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
