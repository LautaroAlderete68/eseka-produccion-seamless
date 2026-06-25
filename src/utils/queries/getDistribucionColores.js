const sql = require('mssql');

const getDistribucionColores = async (pool) => {
  return pool.request().query(`
    ;WITH cte AS (
        SELECT
            apc.Articulo,
            ap.Color AS ColorBase,
            ap.Hex,
            ap.WhiteText,
            ROW_NUMBER() OVER (
                PARTITION BY apc.Articulo, ap.Color
                ORDER BY apc.Talle
            ) AS rn
        FROM APP_COLOR_CODES apc
        JOIN APP_COLORES ap ON ap.Id = apc.Color
    )
    SELECT
        Articulo,
        ColorBase,
        Hex,
        WhiteText
    FROM cte
    WHERE rn = 1 AND Hex IS NOT NULL
    ORDER BY Articulo, ColorBase;
  `);
};

module.exports = getDistribucionColores;
