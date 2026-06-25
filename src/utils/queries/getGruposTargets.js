const sql = require('mssql');

const getGruposTargets = async (pool) => {
  return pool.request().query(`
    SELECT 
        CAST(pc.Articulo AS VARCHAR) AS StyleCode,
        pc.Target AS TargetPieces,
        COALESCE(p.Unidades, 0) AS TotalPieces
    FROM View_Prog_Color AS pc
      LEFT JOIN ProdColor as p
        ON p.Articulo = pc.Articulo 
           AND p.Talle = pc.Talle 
           AND p.ColorId = pc.ColorId
    WHERE pc.Fecha = (
      SELECT MAX(pc2.Fecha)
      FROM View_Prog_Color AS pc2
      WHERE pc2.Articulo = pc.Articulo 
            AND pc2.Talle = pc.Talle
    )
    AND pc.DocProg > 0;
  `);
};

module.exports = getGruposTargets;
