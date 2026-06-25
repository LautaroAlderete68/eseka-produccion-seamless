const sql = require('mssql');

const getGruposMachines = async (pool) => {
  return pool.request().query(`
    SELECT StyleCode, MachCode, RoomCode, TargetOrder
    FROM [dbNautilus].[dbo].[MACHINES]
    WHERE LTRIM(RTRIM(StyleCode)) <> ''
      AND MachCode >= 301
      AND State <> 8 AND State <> 56 AND State <> 11;
  `);
};

module.exports = getGruposMachines;
