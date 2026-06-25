const sql = require('mssql');

const searchColorCodes = async (pool, articulo) => {
  return pool
    .request()
    .input('articulo', sql.Int, articulo)
    .query(`
      SELECT TOP (1000) 
        apc.Articulo, 
        apc.Color, 
        apc.Code,
        ap.Color AS ColorDesc, 
        ap.Hex,
        ap.WhiteText,
        apc.Talle, 
        apc.StyleCode
      FROM     APP_COLOR_CODES apc
      JOIN APP_COLORES ap ON ap.Id = apc.color
      WHERE  (apc.Articulo BETWEEN @articulo AND @articulo + 0.99)
      ORDER BY Talle
    `);
};

module.exports = searchColorCodes;
