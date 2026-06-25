const sql = require('mssql');

const getMachineDefects = async (pool, maquinas) => {
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
    SELECT DateRec, Times, MachCode
    FROM DEFECTS_MONITOR
    WHERE MachCode IN (${placeholders})
  `;

  return request.query(query);
};

module.exports = getMachineDefects;
