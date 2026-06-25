const sql = require('mssql');

const getAppColores = async (pool) => {
  return pool.request().query(`
    SELECT TOP (200) 
      [Id], 
      [Color],
      [Hex],
      [WhiteText]
    FROM [dbNautilus].[dbo].[APP_COLORES]
    ORDER BY Id 
  `);
};

module.exports = getAppColores;
