const sql = require('mssql');

const getGruposTargets = async (pool) => {
  return pool.request().query(`
    SELECT 
        pm.StyleCode,
        MAX(pm.TargetPieces) AS TargetPieces,
        SUM(pm.Pieces) AS TotalPieces
    FROM [dbNautilus].[dbo].[PRODUCTIONS_MONITOR] pm
    WHERE MONTH(pm.DateRec) = MONTH(GETDATE()) 
      AND YEAR(pm.DateRec) = YEAR(GETDATE())
    GROUP BY pm.StyleCode;
  `);
};

module.exports = getGruposTargets;
