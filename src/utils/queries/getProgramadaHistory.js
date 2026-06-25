const sql = require('mssql');

const getProgramadaHistory = async (pool, mes, anio, roomCode, articulo = null) => {
  let request = pool.request()
    .input('mes', sql.Int, Number(mes))
    .input('anio', sql.Int, Number(anio))
    .input('roomCode', sql.NVarChar(10), roomCode);

  if (articulo && articulo.trim() !== '') {
    request = request.input('articulo', sql.VarChar(50), `%${articulo.trim()}%`);
  } else {
    request = request.input('articulo', sql.VarChar(50), null);
  }

  return request.query(`
    SELECT TOP 1000 
        main.Fecha,
        main.Articulo,
        main.Talle,
        CASE 
            WHEN main.RoomCode = 'HOMBRE' THEN 'ALGODÓN'
            ELSE main.RoomCode
        END AS RoomCode,
        main.Docenas,
        anterior.Docenas AS [Docenas prev.],
        CASE 
            WHEN anterior.Docenas IS NULL THEN 'Agregado'
            WHEN ISNULL(main.Docenas, -1) <> ISNULL(anterior.Docenas, -1) THEN 'Modificado'
            ELSE ''
        END AS [Estado articulo]
    FROM APP_PROGRAMADA AS main
    OUTER APPLY (
        SELECT TOP 1 sub.Docenas
        FROM APP_PROGRAMADA AS sub
        WHERE sub.Articulo = main.Articulo 
          AND sub.Talle = main.Talle
          AND sub.RoomCode = main.RoomCode
          AND YEAR(sub.Fecha) = @anio
          AND MONTH(sub.Fecha) = @mes
          AND sub.Fecha < main.Fecha
        ORDER BY sub.Fecha DESC
    ) AS anterior
    WHERE 
        YEAR(main.Fecha) = @anio
        AND MONTH(main.Fecha) = @mes
        AND main.RoomCode = @roomCode
        AND (
            anterior.Docenas IS NULL 
            OR ISNULL(main.Docenas, -1) <> ISNULL(anterior.Docenas, -1)
        )
        AND (@articulo IS NULL OR CAST(main.Articulo AS VARCHAR) LIKE @articulo)
    ORDER BY main.Fecha DESC, [Estado articulo];
  `);
};

module.exports = getProgramadaHistory;
