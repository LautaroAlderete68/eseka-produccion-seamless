const sql = require('mssql');

const updateStyleCode = async (pool, articulo, color, talle, styleCode) => {
  return pool
    .request()
    .input('articulo', sql.Numeric(7, 2), articulo)
    .input('color', sql.SmallInt, color)
    .input('talle', sql.TinyInt, talle)
    .input('styleCode', sql.Char(8), styleCode)
    .query(`
      UPDATE APP_COLOR_CODES
      SET StyleCode = @styleCode
      WHERE Articulo = @articulo AND Color = @color AND Talle = @talle
    `);
};

module.exports = updateStyleCode;
