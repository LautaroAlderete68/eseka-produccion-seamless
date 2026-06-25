const sql = require('mssql');

/**
 * Returns machines with State = 8 (STOP PRODUCCIÓN) joined with their
 * last production record from PRODUCTIONS_MONITOR.
 * Optionally filtered by room.
 */
const getDisponiblesMachines = async (pool, room) => {
  const roomFilter = room && room !== 'ELECTRONICA'
    ? `AND MACHINES.RoomCode = '${room}'`
    : '';

  return pool.request().query(`
    WITH cte AS (
        SELECT
            MACHINES.RoomCode     AS RoomCode,
            MACHINES.MachCode     AS MachCode,
            MACHINES.StyleCode    AS StyleCodeRaw,
            MACHINES.State        AS State,
            pm.StyleCode          AS LastStyleCode,
            pm.TargetPieces       AS Target,
            pm.OrderPieces        AS OrderPieces,
            pm.DateRec            AS DateRec,
            ROW_NUMBER() OVER (
                PARTITION BY pm.MachCode
                ORDER BY pm.DateRec DESC
            ) AS rn
        FROM [dbNautilus].[dbo].[MACHINES] MACHINES
        JOIN [dbNautilus].[dbo].[PRODUCTIONS_MONITOR] pm
            ON pm.MachCode = MACHINES.MachCode
        WHERE MACHINES.State = 8
        ${roomFilter}
        AND pm.MachCode > 300
        AND pm.Pieces > 0
        AND pm.DateRec >= DATEADD(DAY, -30, GETDATE())
    )
    SELECT
        RoomCode,
        MachCode,
        StyleCodeRaw,
        State,
        LastStyleCode,
        Target,
        OrderPieces,
        DateRec
    FROM cte
    WHERE rn = 1
    ORDER BY MachCode;
  `);
};

module.exports = getDisponiblesMachines;
