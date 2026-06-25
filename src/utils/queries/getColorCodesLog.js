const sql = require('mssql');

const getColorCodesLog = async (pool) => {
  return pool.request().query(`
    SELECT TOP (200)
      accl.Articulo,
      accl.Talle,
      accl.Code,
      accl.Color AS ColorID,
      c.Color,
      c.Hex,
      c.WhiteText,
      accl.StyleCode,
      accl.FechaInsert AS [FechaVinculacion]
    FROM APP_COLOR_CODES_LOG accl
    JOIN APP_COLORES c
        ON c.Id = accl.Color  
    ORDER BY accl.FechaInsert DESC;
  `);
};

module.exports = getColorCodesLog;
