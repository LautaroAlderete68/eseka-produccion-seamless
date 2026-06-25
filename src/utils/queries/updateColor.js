const sql = require('mssql');

const updateColor = async (pool, id, hex, whiteText) => {
  return pool
    .request()
    .input('id', sql.SmallInt, id)
    .input('hex', sql.VarChar(7), hex)
    .input('whiteText', sql.Bit, whiteText ? 1 : 0)
    .query(`
      UPDATE APP_COLORES
      SET Hex = @hex, WhiteText = @whiteText
      WHERE Id = @id
    `);
};

module.exports = updateColor;
