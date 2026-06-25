const sql = require('mssql');

const getOfflineMachines = async (pool) => {
  return pool.request().query(`
    WITH cte AS (
        SELECT 
            MACHINES.RoomCode AS Room,
            MACHINES.MachCode AS [Máquina],
            pm.TargetPieces AS Target,
            pm.OrderPieces AS OrderPieces,
            pm.DateRec AS [Último Registro],
            ROW_NUMBER() OVER (
                PARTITION BY pm.MachCode 
                ORDER BY pm.DateRec DESC
            ) AS rn
        FROM [dbNautilus].[dbo].[MACHINES] MACHINES
        JOIN [dbNautilus].[dbo].[PRODUCTIONS_MONITOR] pm 
            ON pm.MachCode = MACHINES.MachCode
        WHERE MACHINES.State = 56
        AND pm.MachCode > 300
        AND pm.Pieces > 0
        AND pm.DateRec >= DATEADD(DAY, -10, GETDATE())
    )
    SELECT 
        Room,
        [Máquina],
        Target,
        OrderPieces,
        [Último Registro]
    FROM cte
    WHERE rn = 1
    ORDER BY [Máquina];
  `);
};

module.exports = getOfflineMachines;
