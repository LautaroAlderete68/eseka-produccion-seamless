import Checkbox from '@mui/joy/Checkbox';
import Table from '@mui/joy/Table';
import EnhancedHead from './EnhancedHead.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import ExpandedRow from './ExpandedRow.jsx';
import EnhancedFooter from './EnhancedFooter.jsx';
import TableSkeleton from './TableSkeleton.jsx';
import { useLocation } from 'react-router';

const getHeaderTopOffset = (str) => {
  if (!str) return '0px';
  const match = str.match(/top-\[(\d+px)\]/);
  return match ? match[1] : '0px';
};

/**
 * SortedSelectedTable
 * Renders a table with sortable columns and selectable rows.
 */
export default function EnhancedTable({
  cols,
  rows,
  pdfRows,
  renderRow,
  initOrder,
  initOrderBy,
  footer,
  stripe = 'even',
  className = '',
  headerTop = '',
  checkboxVariant = 'outlined',
  uniqueIds = ['Articulo', 'Talle', 'ColorId'],
  selected: selectedProp,
  setSelected: setSelectedProp,
  storageKey: storageKeyProp,
}) {
  const location = useLocation();
  const storageKey = storageKeyProp || location.pathname;
  // State for current sort order ('asc' or 'desc')
  const [order, setOrder] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.order) return parsed.order;
      } catch (e) {}
    }
    return initOrder;
  });
  // State for current column to sort by
  const [orderBy, setOrderBy] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.orderBy) return parsed.orderBy;
      } catch (e) {}
    }
    return initOrderBy;
  });

  const [prevStorageKey, setPrevStorageKey] = useState(storageKey);
  if (storageKey !== prevStorageKey) {
    setPrevStorageKey(storageKey);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.order && parsed.orderBy) {
          setOrder(parsed.order);
          setOrderBy(parsed.orderBy);
        } else {
          setOrder(initOrder);
          setOrderBy(initOrderBy);
        }
      } catch (e) {
        setOrder(initOrder);
        setOrderBy(initOrderBy);
      }
    } else {
      setOrder(initOrder);
      setOrderBy(initOrderBy);
    }
  }
  
  // State for currently selected rows (either passed as prop or local)
  const [localSelected, setLocalSelected] = useState([]);
  const selected = selectedProp !== undefined ? selectedProp : localSelected;
  const setSelected = setSelectedProp !== undefined ? setSelectedProp : setLocalSelected;
  // State for currently opened rows
  const [opened, setOpened] = useState(null);
  // loading state
  const loading = rows.length === 0;

  const filteredCols = cols.filter(Boolean);

  const uniqueId = (row) => uniqueIds.map((id) => row[id]).join('-');

  // Save sort on change
  useEffect(() => {
    if (orderBy) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ order, orderBy })
      );
    }
  }, [order, orderBy, storageKey]);

  const [sortedRows, sortedPdfRows] = useMemo(() => {
    return [
      [...rows].sort(getComparator(order, orderBy, filteredCols)),
      [...pdfRows].sort(getComparator(order, orderBy, filteredCols)),
    ];
  }, [rows, order, orderBy]);

  /**
   * Handles sorting when a column header is clicked.
   * If the same column is clicked, toggles between ascending and descending.
   * @param {Event} event - The click event.
   * @param {string} property - The column property to sort by.
   */
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  /**
   * Handles the "select all" checkbox in the table header.
   * Selects all rows if checked, or clears selection if unchecked.
   * @param {Event} event - The change event from the checkbox.
   */
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      // Select all rows
      const newSelected = rows.map((row) => uniqueId(row));
      setSelected(newSelected);
      return;
    }
    // Deselect all
    setSelected([]);
  };

  /**
   * Handles clicking on a row to perform function.
   * Adds or removes the row from the array.
   */
  const handleClickMany = (row, arr, setArr) => {
    const arrIdx = arr.indexOf(uniqueId(row));
    let newArr = [];
    if (arrIdx === -1) {
      // Not in arr yet, add to arr
      newArr = newArr.concat(arr, uniqueId(row));
    } else if (arrIdx === 0) {
      // First item, remove it
      newArr = newArr.concat(arr.slice(1));
    } else if (arrIdx === arr.length - 1) {
      // Last item, remove it
      newArr = newArr.concat(arr.slice(0, -1));
    } else if (arrIdx > 0) {
      // Middle item, remove it
      newArr = newArr.concat(arr.slice(0, arrIdx), arr.slice(arrIdx + 1));
    }
    setArr(newArr);
  };

  const handleClickSingle = (row, val, setVal) => {
    if (val === uniqueId(row)) setVal(null);
    else setVal(uniqueId(row));
  };

  return (
    <Table
      aria-label='simple table'
      stripe={stripe}
      variant='outlined'
      hoverRow
      stickyHeader
      className={`rounded-md ${className}`}
      sx={{
        '--TableCell-selectedBackground': (theme) =>
          theme.vars.palette.primary.softHoverBg,
        '--TableRow-stripeBackground': (theme) =>
          theme.vars.palette.background.level1,
        '& th': {
          top: getHeaderTopOffset(headerTop),
        }
      }}
    >
      {/* Table header with sorting and select-all functionality */}
      <EnhancedHead
        cols={filteredCols}
        order={order}
        orderBy={orderBy}
        numSelected={selected.length}
        onSelectAllClick={handleSelectAllClick}
        onRequestSort={handleRequestSort}
        rowCount={rows.length}
        headerTop={headerTop}
      />

      <tbody>
        {loading ? (
          <TableSkeleton numCols={filteredCols.length + 1} />
        ) : (
          // Sort rows before rendering
          sortedRows.map((row, i) => {
            const isItemSelected = selected.includes(uniqueId(row));
            const [rowClassName, renderedRow] = renderRow(row, i, opened, () =>
              handleClickSingle(row, opened, setOpened)
            );

            return (
              <React.Fragment key={i}>
                <tr
                  key={i}
                  className={`group/row ${rowClassName}`}
                  // Apply custom background if selected
                  style={
                    isItemSelected
                      ? {
                          '--TableCell-dataBackground':
                            'var(--TableCell-selectedBackground)',
                          '--TableCell-headBackground':
                            'var(--TableCell-selectedBackground)',
                        }
                      : {}
                  }
                >
                  {/* Selection checkbox for the row */}
                  <td
                    role='checkbox'
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    className='w-10'
                    onClick={() => handleClickMany(row, selected, setSelected)}
                  >
                    <Checkbox
                      checked={isItemSelected}
                      variant={isItemSelected ? 'solid' : checkboxVariant}
                      sx={{ verticalAlign: 'top' }}
                    />
                  </td>

                  {/* Row data cells */}
                  {renderedRow}
                </tr>
                {opened === uniqueId(row) && (
                  <ExpandedRow
                    row={row}
                    numCols={filteredCols.length + 1} // +1 for checkbox
                  />
                )}
              </React.Fragment>
            );
          })
        )}
      </tbody>

      <EnhancedFooter
        cols={filteredCols}
        rows={sortedPdfRows}
        footer={footer}
        selected={selected}
        uniqueId={uniqueId}
      />
    </Table>
  );
}

/**
 * getComparator
 * Returns a comparator function for sorting based on order and property.
 * @param {'asc'|'desc'} order - Sort order.
 * @param {string} orderBy - Property to sort by.
 * @returns {Function} Comparator function.
 */
function getComparator(order, orderBy, cols) {
  const col = cols.find((c) => c.id === orderBy); // get the column
  const sortFn = col && col.sortFn; // get the sort function
  return (a, b) => {
    let comparator;
    if (sortFn) {
      comparator = sortFn(a, b, order);
    } else {
      comparator = descendingComparator(a, b, orderBy);
    }
    return order === 'desc' ? comparator : -comparator;
  };
}

/**
 * descendingComparator
 * Compares two objects for descending order based on a property.
 * @param {Object} a - First object.
 * @param {Object} b - Second object.
 * @param {string} orderBy - Property to compare.
 * @returns {number} -1 if b < a, 1 if b > a, 0 if equal.
 */
function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}
