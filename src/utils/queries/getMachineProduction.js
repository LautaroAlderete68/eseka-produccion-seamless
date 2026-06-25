const sql = require('mssql');

const getMachineProduction = async (pool, maquinas) => {
  if (!Array.isArray(maquinas) || maquinas.length === 0) {
    return { recordset: [] };
  }

  const request = pool.request();
  const placeholders = maquinas.map((num, index) => {
    const paramName = `mach_${index}`;
    request.input(paramName, sql.Int, num);
    return `@${paramName}`;
  }).join(', ');

  const query = `
    SELECT TOP (200) DateRec, Pieces, StyleCode, MachCode
    FROM PRODUCTIONS_MONITOR
    WHERE MachCode IN (${placeholders})
    ORDER BY DateRec DESC
  `;

  return request.query(query);
};

module.exports = getMachineProduction;
