// TODO: api docs
// FIXME - sql injections
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const fs = require('fs');
const path = require('path');
// Utils
const serverLog = require('./utils/serverLog.js');
const processPDF = require('./utils/processPDF.js');
const compareProgramada = require('./utils/compareProgramada.js');
const calculateNewTargets = require('./utils/calculateNewTargets.js');
const parseMachines = require('./utils/parseMachines.js');
const parseStyleCode = require('./utils/parseStyleCode.js');
const exportTablePDF = require('./utils/exportTablePDF.js');
const calcEff = require('./utils/calcEff.js');
// Queries
const queries = require('./utils/queries');
// test data
const testData = require('./utils/test-data');

// Environment
let isPackaged; //= false;
// once main sends a message to server
process.parentPort.once('message', (e) => {
  // If DB_SERVER is defined in the .env, connect to the database even in dev mode
  isPackaged = e.data || !!process.env.DB_SERVER;
  serverLog(`isPackaged (Electron): ${e.data}`);
  serverLog(`Database connection enabled: ${!!process.env.DB_SERVER}`);
  startServer();
});

const app = express();
app.use(cors());
app.use(express.json());

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/Buenos_Aires');

const config = {
  port: 3001,
  db: {
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: false,
      trustServerCertificate: false,
    },
  },
};

// Load equivalencias.json from Scripts folder
const getEquivalencias = () => {
  const paths = [
    path.join(__dirname, '../Scripts/equivalencias.json'),
    path.join(__dirname, 'Scripts/equivalencias.json'),
    'C:\\Users\\lauta\\Desktop\\CODIGO\\ESEKA\\TejeduriaAPP\\APP\\eseka-produccion-seamless\\Scripts\\equivalencias.json'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        return JSON.parse(content);
      } catch (e) {
        serverLog(`[ERROR] Parsing equivalencias at ${p}: ${e}`);
      }
    }
  }
  return {};
};

// Map DateTime to Day and Shift (Turno)
const obtenerDiaYTurno = (dtStr) => {
  const dt = dayjs(dtStr).tz('America/Buenos_Aires');
  const hour = dt.hour();
  const minute = dt.minute();
  const second = dt.second();

  const totalSeconds = hour * 3600 + minute * 60 + second;
  const sixAm = 6 * 3600;
  const twoPm = 14 * 3600;
  const tenPm = 22 * 3600;

  let date;
  let turno;

  if (totalSeconds === sixAm) {
    date = dt.subtract(1, 'day').format('YYYY-MM-DD');
    turno = 3;
  } else if (totalSeconds === twoPm) {
    date = dt.format('YYYY-MM-DD');
    turno = 1;
  } else if (totalSeconds === tenPm) {
    date = dt.format('YYYY-MM-DD');
    turno = 2;
  } else if (totalSeconds > sixAm && totalSeconds < twoPm) {
    date = dt.format('YYYY-MM-DD');
    turno = 1;
  } else if (totalSeconds > twoPm && totalSeconds < tenPm) {
    date = dt.format('YYYY-MM-DD');
    turno = 2;
  } else if (totalSeconds > tenPm) {
    date = dt.format('YYYY-MM-DD');
    turno = 3;
  } else {
    // 00:00 -> 05:59
    date = dt.subtract(1, 'day').format('YYYY-MM-DD');
    turno = 3;
  }

  return { date, turno };
};

const startServer = () => {
  let pool;
  if (isPackaged) {
    (async () => {
      try {
        pool = await sql.connect(config.db);
        serverLog('Connected to database');
        
        // Auto-create APP_ARTICULOS_ESPECIALES table if it doesn't exist
        try {
          await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='APP_ARTICULOS_ESPECIALES' AND xtype='U')
            BEGIN
                CREATE TABLE APP_ARTICULOS_ESPECIALES (
                    ArticuloBase INT PRIMARY KEY
                );
                INSERT INTO APP_ARTICULOS_ESPECIALES (ArticuloBase) VALUES 
                (2398), (2621), (2622), (3352), (3356), (3668), (3354);
            END
          `);
          serverLog('APP_ARTICULOS_ESPECIALES table checked/created successfully');
        } catch (e) {
          serverLog(`[ERROR] Creating APP_ARTICULOS_ESPECIALES table: ${e}`);
        }
      } catch (err) {
        serverLog(`[ERROR] Error connecting to database: ${err}`);
      }
    })();
  }

  app.listen(config.port, () => {
    serverLog(`Listening at http://localhost:${config.port}`);
  });

  app.get('/hello', (req, res) => {
    serverLog('GET /hello');
    res.json({ data: 'Hello from server!' });
  });

  app.get('/articulo/:articulo', async (req, res) => {
    const { articulo } = req.params;
    serverLog(`GET /articulo/${articulo}`);

    if (isPackaged) {
      try {
        const result = await queries.getArticulo(pool, articulo);
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /articulo/${articulo}: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /articulo/:articulo');
      res.json(testData.articulo);
    }
  });

  app.get('/articulo/:articulo/colorDistr', async (req, res) => {
    const { articulo } = req.params;
    serverLog(`GET /articulo/${articulo}/colorDistr`);

    if (isPackaged) {
      try {
        const result = await queries.getArticuloColorDistr(pool, articulo);
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /articulo/${articulo}/colorDistr: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /articulo/:articulo/colorDistr');
      res.json(testData.articuloColorDistr);
    }
  });

  app.get('/articulo/:articulo/colorCodes', async (req, res) => {
    const { articulo } = req.params;
    serverLog(`GET /articulo/${articulo}/colorCodes`);

    if (isPackaged) {
      try {
        const result = await queries.getArticuloColorCodes(pool, articulo);
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /articulo/${articulo}/colorCodes: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /articulo/:articulo/colorCodes');
      res.json(testData.articuloColorCodes);
    }
  });

  app.get('/articulo/:articulo/currentColorDistr', async (req, res) => {
    const { articulo } = req.params;
    serverLog(`GET /articulo/${articulo}/currentColorDistr`);

    if (isPackaged) {
      try {
        const result = await queries.getCurrArtColorDistr(pool, articulo, null);
        res.json(result.recordset);
      } catch (err) {
        serverLog(
          `[ERROR] GET /articulo/${articulo}/currentColorDistr: ${err}`
        );
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog(`Using test data for /articulo/${articulo}/currentColorDistr`);
      res.json(testData.articuloColorDistr);
    }
  });

  app.get('/articulo/:articulo/:talle/currentColorDistr', async (req, res) => {
    const { articulo, talle } = req.params;
    serverLog(`GET /articulo/${articulo}/${talle}/currentColorDistr`);

    if (isPackaged) {
      try {
        const result = await queries.getCurrArtColorDistr(
          pool,
          articulo,
          talle
        );
        res.json(result.recordset);
      } catch (err) {
        serverLog(
          `[ERROR] GET /articulo/${articulo}/${talle}/currentColorDistr: ${err}`
        );
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog(
        `Using test data for /articulo/${articulo}/${talle}/currentColorDistr`
      );
      res.json(testData.articuloColorDistr);
    }
  });

  app.post('/articulo/insert', async (req, res) => {
    serverLog('POST /articulo/insert');
    const data = req.body;

    try {
      await queries.insertArticulo(pool, data.articulo, data.tipo);
      res
        .status(200)
        .json({ message: `Art. ${data.articulo} agregado con éxito.` });
    } catch (err) {
      serverLog(`[ERROR] POST /articulo/insert: ${err}`);
      res.status(500).json({
        message: `No se pudo agregar el art. ${data.articulo}.`,
        error: err.message,
      });
    }
  });

  app.post('/articulo/updateTipo', async (req, res) => {
    serverLog('POST /articulo/updateTipo');
    const { articulo, tipo } = req.body;

    try {
      await queries.updateArticuloTipo(pool, articulo, tipo);
      res
        .status(200)
        .json({ message: `Tipo del art. ${articulo} modificado con éxito.` });
    } catch (err) {
      serverLog(`[ERROR] POST /articulo/updateTipo: ${err}`);
      res.status(500).json({
        message: `No se pudo modificar el tipo del art. ${articulo}.`,
        error: err.message,
      });
    }
  });

  app.get('/cambios', async (req, res) => {
    const { startDate, room } = req.query;
    serverLog(`GET /cambios for ${startDate} ${room}`);

    if (isPackaged) {
      try {
        const result = await queries.getCambios(
          pool,
          dayjs.tz(startDate).format('YYYY-MM-DD'),
          room
        );
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /cambios for ${startDate} ${room}: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /cambios');
      res.json(testData.cambios);
    }
  });

  app.get('/colors', async (req, res) => {
    serverLog('GET /colors');

    if (isPackaged) {
      try {
        const result = await sql.query(
          `SELECT * FROM APP_COLORES ORDER BY Color`
        );
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /colors: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /colors');
      res.json(testData.colors);
    }
  });

  app.post('/colors/insert', async (req, res) => {
    serverLog('POST /colors/insert');
    const data = req.body;

    if (isPackaged) {
      try {
        await queries.insertColor(pool, data);
        const result = await sql.query(
          `SELECT TOP(1) * FROM APP_COLORES ORDER BY Id DESC`
        );
        res.status(201).json({
          message: `Color ${data.color} agregado con éxito.`,
          data: result.recordset,
        });
      } catch (err) {
        serverLog(`[ERROR] POST /colors/insert: ${err}`);
        res.status(500).json({
          message: `No se pudo agregar el color ${data.color}.`,
          error: err.message,
        });
      }
    } else {
      // test data
      serverLog('Using test data for /colors/insert');
      res.json([{ Id: 999, Color: 'TEST COLOR' }]);
    }
  });

  app.post('/colorCodes/insert', async (req, res) => {
    serverLog('POST /colorCodes/insert');
    const data = req.body;

    try {
      await queries.insertColorCodes(pool, data);
      res
        .status(201)
        .json({ message: `Código ${data.styleCode} agregado con éxito.` });
    } catch (err) {
      serverLog(`[ERROR] POST /colorCodes/insert: ${err}`);
      res.status(500).json({
        message: `No se pudo agregar el código ${data.styleCode}.`,
        error: err.message,
      });
    }
  });

  async function insertColorDistrs(pool, data) {
    for (const row of data.colorDistr) {
      await queries.insertDistr(pool, data.articulo, data.talle, row);
      // Wait before next insert
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  app.post('/colorDistr/insert', async (req, res) => {
    serverLog('POST /colorDistr/insert');
    const data = req.body;

    try {
      await insertColorDistrs(pool, data);

      res.status(201).json({
        message: `Distribución para el art. ${data.articulo} T${data.talle} agregada con éxito.`,
      });
    } catch (err) {
      serverLog(`[ERROR] POST /colorDistr/insert: ${err}`);
      res.status(500).json({
        message: `No se pudo agregar la distribución para el art. ${data.articulo} T${data.talle}.`,
        error: err.message,
      });
    }
  });

  app.post('/colorDistr/insertAllTalles', async (req, res) => {
    serverLog('POST /colorDistr/insertAllTalles');
    const { articulo, talles, colorDistr } = req.body;

    try {
      for (const talle of talles) {
        await insertColorDistrs(pool, { articulo, talle, colorDistr });
      }

      res.status(201).json({
        message: `Distribución para el art. ${articulo} agregada con éxito.`,
      });
    } catch (err) {
      serverLog(`[ERROR] POST /colorDistr/insertAllTalles: ${err}`);
      res.status(500).json({
        message: `No se pudo agregar la distribución para el art. ${articulo}.`,
        error: err.message,
      });
    }
  });

  app.get('/articulos-especiales', async (req, res) => {
    serverLog('GET /articulos-especiales');
    if (isPackaged) {
      try {
        const result = await pool.request().query('SELECT ArticuloBase FROM APP_ARTICULOS_ESPECIALES ORDER BY ArticuloBase');
        res.json(result.recordset.map(row => row.ArticuloBase));
      } catch (err) {
        serverLog(`[ERROR] GET /articulos-especiales: ${err}`);
        res.json([2398, 2621, 2622, 3352, 3356, 3668, 3354]);
      }
    } else {
      res.json([2398, 2621, 2622, 3352, 3356, 3668, 3354]);
    }
  });

  app.post('/articulos-especiales', async (req, res) => {
    serverLog('POST /articulos-especiales');
    const { articulo } = req.body;
    if (!articulo || isNaN(parseInt(articulo))) {
      return res.status(400).json({ error: 'Artículo inválido' });
    }
    if (isPackaged) {
      try {
        await pool.request()
          .input('articulo', sql.Int, parseInt(articulo))
          .query('INSERT INTO APP_ARTICULOS_ESPECIALES (ArticuloBase) VALUES (@articulo)');
        res.json({ message: `Artículo ${articulo} agregado con éxito.` });
      } catch (err) {
        serverLog(`[ERROR] POST /articulos-especiales: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      res.json({ message: `Artículo ${articulo} agregado con éxito (modo test).` });
    }
  });

  app.delete('/articulos-especiales/:articulo', async (req, res) => {
    const { articulo } = req.params;
    serverLog(`DELETE /articulos-especiales/${articulo}`);
    if (isPackaged) {
      try {
        await pool.request()
          .input('articulo', sql.Int, parseInt(articulo))
          .query('DELETE FROM APP_ARTICULOS_ESPECIALES WHERE ArticuloBase = @articulo');
        res.json({ message: `Artículo ${articulo} eliminado con éxito.` });
      } catch (err) {
        serverLog(`[ERROR] DELETE /articulos-especiales: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      res.json({ message: `Artículo ${articulo} eliminado con éxito (modo test).` });
    }
  });

  app.post('/export/pdf', async (req, res) => {
    serverLog('POST /export/pdf');

    try {
      const pdf = await exportTablePDF(req.body);
      res
        .status(200)
        .json({ message: `PDF exportado a ${pdf}.`, filePath: pdf });
    } catch (err) {
      serverLog(`[ERROR] POST /export/pdf: ${err}`);
      res
        .status(500)
        .json({ message: 'Error exportando PDF.', error: err.message });
    }
  });

  app.get('/historial', async (req, res) => {
    serverLog(`GET /historial for ${JSON.stringify(req.query)}`);

    if (isPackaged) {
      try {
        const result = await queries.getProductionsMonitor(pool, req.query);
        res.json(result.recordset);
      } catch (err) {
        serverLog(
          `[ERROR] GET /historial for ${JSON.stringify(req.query)}: ${err}`
        );
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /historial');
      res.json(testData.historial);
    }
  });

  // get machines and parse to match with production data
  async function getParsedMachines(
    pool,
    room,
    onlyProducing = false,
    onlyValidCodes = true
  ) {
    let machines = await queries.getMachines(pool, room);
    machines = machines.recordset;
    await parseMachines(pool, machines);

    if (onlyValidCodes)
      machines = machines.filter(
        (m) => typeof m.StyleCode.articulo !== 'string'
      );

    if (onlyProducing) {
      /* Machine states that count for production
       * 0: RUN
       * 2: STOP BUTTON
       * 3: AUTOMATIC STOP
       * 4: TARGET
       * 5: F1
       * 6: ELECTRÓNICO
       * 7: MECANICO
       * 9: HILADO
       * 13: TURBINA
       */
      machines = machines.filter((m) =>
        [0, 2, 3, 4, 5, 6, 7, 9, 13].includes(m.State)
      );
    }

    return machines;
  }

  app.get('/:room/machines', async (req, res) => {
    const { room } = req.params;
    serverLog(`GET /${room}/machines`);

    if (isPackaged) {
      try {
        let machines = [];

        if (room !== 'ELECTRONICA')
          machines = await getParsedMachines(pool, room, false, false);
        else {
          const machsNYL = await getParsedMachines(pool, 'MUJER', false, false);
          const machsALG = await getParsedMachines(
            pool,
            'HOMBRE',
            false,
            false
          );
          const machsSEA = await getParsedMachines(
            pool,
            'SEAMLESS',
            false,
            false
          );
          machines = [...machsNYL, ...machsALG, ...machsSEA];
        }

        res.json(machines);
      } catch (err) {
        serverLog(`[ERROR] GET /${room}/machines: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // use test data
      serverLog(`Using test data for /${room}/machines`);
      res.json(testData.machines);
    }
  });

  app.get('/:room/machines/newColorCodes', async (req, res) => {
    const { room } = req.params;
    serverLog(`GET /${room}/machines/newColorCodes`);

    if (isPackaged) {
      try {
        let machines = await getParsedMachines(pool, room, true);
        machines = Array.from(
          new Map(
            machines
              .filter((m) => m.StyleCode.colorId === null)
              // makes the entries unique by articulo and colorCode
              // 2+ machines can have the same articulo and color
              .map((m) => [
                `${m.StyleCode.articulo}${`.${m.StyleCode.punto}` || ''}_${
                  m.StyleCode.color
                }`,
                m,
              ])
          ).values()
        );
        res.json(machines);
      } catch (err) {
        serverLog(`[ERROR] GET /${room}/machines/newColorCodes: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog(`Using test data for /${room}/machines/newColorCodes`);
      res.json(testData.newColorCodes);
    }
  });

  app.get('/produccion', async (req, res) => {
    serverLog('GET /produccion');
    serverLog(JSON.stringify(req.query));

    if (isPackaged) {
      try {
        const { room, startDate, endDate, actual, articulo, talle, colorId } =
          req.query;
        const result = await queries.runProduccion(
          pool,
          room,
          startDate,
          endDate,
          actual,
          articulo,
          talle,
          colorId
        );
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /produccion: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /produccion');
      res.json(testData.produccion);
    }
  });

  app.get('/offline', async (req, res) => {
    serverLog('GET /offline');

    if (isPackaged) {
      try {
        const result = await queries.getOfflineMachines(pool);
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /offline: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /offline');
      res.json(testData.offline);
    }
  });

  app.get('/color-codes/search', async (req, res) => {
    const { articulo } = req.query;
    serverLog(`GET /color-codes/search?articulo=${articulo}`);

    if (!articulo || isNaN(articulo)) {
      return res.status(400).json({ error: 'Artículo inválido' });
    }

    const articuloNum = parseInt(articulo, 10);

    if (isPackaged) {
      try {
        const result = await queries.searchColorCodes(pool, articuloNum);
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /color-codes/search: ${err}`);
        res.status(500).json({ error: err.message });
      }
      // test data
      serverLog(`Using test data for /color-codes/search`);
      const testResults = [
        { Articulo: articuloNum, Color: 1, Code: '001', ColorDesc: 'Negro', Hex: '#272727', WhiteText: true, Talle: 'M', StyleCode: '9017-M-BK' },
        { Articulo: articuloNum, Color: 2, Code: '002', ColorDesc: 'Azul Marino', Hex: '#083D77', WhiteText: true, Talle: 'L', StyleCode: '9017-L-NV' },
        { Articulo: articuloNum + 0.1, Color: 1, Code: '001', ColorDesc: 'Negro', Hex: '#272727', WhiteText: true, Talle: 'S', StyleCode: '9017-S-BK' },
        { Articulo: articuloNum + 0.2, Color: 3, Code: '003', ColorDesc: 'Blanco', Hex: '#FFFFFF', WhiteText: false, Talle: 'XL', StyleCode: '9017-XL-WT' },
      ];
      res.json(testResults);
    }
  });

  app.get('/color-codes/colores', async (req, res) => {
    serverLog('GET /color-codes/colores');

    if (isPackaged) {
      try {
        const result = await queries.getAppColores(pool);
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /color-codes/colores: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /color-codes/colores');
      const testColores = [
        { Id: 1, Color: 'CRUDO GRIS', Hex: '#BEB1B0', WhiteText: false },
        { Id: 2, Color: 'CRUDO NEGRO', Hex: '#272727', WhiteText: true },
        { Id: 5, Color: 'NEGRO', Hex: '#272727', WhiteText: true },
        { Id: 32, Color: 'GRIS MARINO', Hex: '#BEB1B0', WhiteText: false },
        { Id: 33, Color: 'GRIS MOSTAZA', Hex: '#FDD49B', WhiteText: false },
        { Id: 38, Color: 'GRIS BORDÓ', Hex: '#581845', WhiteText: true },
        { Id: 39, Color: 'GRIS GRIS', Hex: '#BEB1B0', WhiteText: false },
        { Id: 52, Color: 'GRIS NEGRO', Hex: '#272727', WhiteText: true },
        { Id: 53, Color: 'PETRÓLEO', Hex: '#083D77', WhiteText: true },
        { Id: 86, Color: 'VERDE', Hex: '#2E7D32', WhiteText: true },
      ];
      res.json(testColores);
    }
  });

  app.post('/color-codes/update-style', async (req, res) => {
    const { articulo, color, talle, styleCode } = req.body;
    serverLog(`POST /color-codes/update-style - Articulo: ${articulo}, Color: ${color}, Talle: ${talle}, StyleCode: ${styleCode}`);

    if (articulo === undefined || color === undefined || talle === undefined || styleCode === undefined) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    if (isPackaged) {
      try {
        await queries.updateStyleCode(pool, Number(articulo), Number(color), Number(talle), styleCode);
        res.json({ success: true });
      } catch (err) {
        serverLog(`[ERROR] POST /color-codes/update-style: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using mock response for /color-codes/update-style');
      res.json({ success: true });
    }
  });

  app.get('/color-codes/log', async (req, res) => {
    serverLog('GET /color-codes/log');

    if (isPackaged) {
      try {
        const result = await queries.getColorCodesLog(pool);
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /color-codes/log: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /color-codes/log');
      const testLog = [
        { Articulo: 12050, Talle: 1, Code: 'CG', ColorID: 1, Color: 'CRUDO GRIS', Hex: '#BEB1B0', WhiteText: false, StyleCode: '120501CG', FechaVinculacion: new Date('2026-06-23T10:30:00') },
        { Articulo: 12050.45, Talle: 1, Code: 'AG', ColorID: 32, Color: 'GRIS MARINO', Hex: '#3173AF', WhiteText: true, StyleCode: '120501AG', FechaVinculacion: new Date('2026-06-23T11:45:00') },
        { Articulo: 12050.45, Talle: 2, Code: 'NG', ColorID: 52, Color: 'GRIS NEGRO', Hex: '#272727', WhiteText: true, StyleCode: '120502NG', FechaVinculacion: new Date('2026-06-23T12:15:00') },
        { Articulo: 12050.45, Talle: 2, Code: 'PN', ColorID: 53, Color: 'PETRÓLEO', Hex: '#083D77', WhiteText: true, StyleCode: '120502PN', FechaVinculacion: new Date('2026-06-23T13:00:00') },
      ];
      res.json(testLog);
    }
  });

  app.post('/color-codes/update-color', async (req, res) => {
    const { id, hex, whiteText } = req.body;
    serverLog(`POST /color-codes/update-color - Id: ${id}, Hex: ${hex}, WhiteText: ${whiteText}`);

    if (id === undefined || !hex) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    if (isPackaged) {
      try {
        await queries.updateColor(pool, Number(id), hex, !!whiteText);
        res.json({ success: true });
      } catch (err) {
        serverLog(`[ERROR] POST /color-codes/update-color: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using mock response for /color-codes/update-color');
      res.json({ success: true });
    }
  });

  app.get('/disponibles', async (req, res) => {
    serverLog('GET /disponibles');
    const { room } = req.query;

    if (isPackaged) {
      try {
        const machinesResult = await queries.getDisponiblesMachines(pool, room);
        const rawMachines = machinesResult.recordset;

        // Parse each machine's StyleCode so we can match vs programada
        await Promise.all(
          rawMachines.map(async (m) => {
            const parsed = await parseStyleCode(pool, m.RoomCode.trim(), m.StyleCodeRaw.trim());
            m.StyleCode = parsed;
          })
        );

        res.json(rawMachines);
      } catch (err) {
        serverLog(`[ERROR] GET /disponibles: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data: reuse offline test data shape so dev mode still works
      serverLog('Using test data for /disponibles');
      res.json([]);
    }
  });

  app.get('/grupos', async (req, res) => {
    serverLog('GET /grupos');

    if (isPackaged) {
      try {
        const machinesResult = await queries.getGruposMachines(pool);
        const targetsResult = await queries.getGruposTargets(pool);

        const machines = machinesResult.recordset;
        const targets = targetsResult.recordset;

        // Build targetMet map by style code (trimmed)
        const targetsMap = {};
        targets.forEach(row => {
          const style = (row.StyleCode || '').trim();
          const target = row.TargetPieces || 0;
          const total = row.TotalPieces || 0;
          targetsMap[style] = total >= target;
        });

        // Group machines by StyleCode (split first part and trimmed)
        const groups = {};
        machines.forEach(row => {
          const rawStyle = (row.StyleCode || '').trim();
          if (!rawStyle || rawStyle === '01') return;

          // Split style by space and take first part
          const style = rawStyle.split(/\s+/)[0].trim();
          const machCode = row.MachCode;
          const targetOrder = row.TargetOrder || 0;
          let room = (row.RoomCode || '').trim().toUpperCase();
          if (room === 'HOMBRE') room = 'ALGODÓN';

          if (!groups[style]) {
            groups[style] = {
              style: style,
              maquinas: [],
              room: room,
              targets: []
            };
          }
          groups[style].maquinas.push(machCode);
          groups[style].targets.push(targetOrder);
        });

        // Convert groups to array list
        const list = Object.values(groups).map(g => {
          let targetMet = false;
          Object.keys(targetsMap).forEach(k => {
            if (k.startsWith(g.style)) {
              if (targetsMap[k]) {
                targetMet = true;
              }
            }
          });

          const allTargetsZero = g.targets.length > 0 && g.targets.every(t => t === 0);

          return {
            style: g.style,
            room: g.room,
            maquinas: g.maquinas.sort((a, b) => a - b),
            targetMet: targetMet,
            allTargetsZero: allTargetsZero
          };
        });

        res.json(list);
      } catch (err) {
        serverLog(`[ERROR] GET /grupos: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /grupos');
      res.json(testData.grupos);
    }
  });

  app.get('/distribucion', async (req, res) => {
    serverLog('GET /distribucion');

    if (isPackaged) {
      try {
        const result = await queries.getDistribucionColores(pool);
        const list = result.recordset;

        // Merge with equivalencias.json
        const equivalencias = getEquivalencias();

        const data = list.map(row => {
          const artStr = String(row.Articulo).trim();
          const colorStr = String(row.ColorBase).trim();
          
          let destinos = [];
          
          const matchKey = Object.keys(equivalencias).find(
            k => String(k).trim() === artStr || Number(k) === Number(artStr)
          );

          if (matchKey && equivalencias[matchKey][colorStr]) {
            destinos = equivalencias[matchKey][colorStr];
          }

          return {
            Articulo: row.Articulo,
            ColorBase: row.ColorBase,
            Hex: row.Hex,
            WhiteText: row.WhiteText,
            TeñirA: destinos.join(', ')
          };
        });

        res.json(data);
      } catch (err) {
        serverLog(`[ERROR] GET /distribucion: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      serverLog('Using test data for /distribucion');
      res.json(testData.distribucion);
    }
  });

  app.get('/produccion/maquinas', async (req, res) => {
    serverLog('GET /produccion/maquinas');

    const { maquinas } = req.query;
    if (!maquinas) {
      return res.json([]);
    }

    const machineList = maquinas.split(',')
      .map(m => m.trim())
      .filter(m => m !== '')
      .map(m => parseInt(m, 10))
      .filter(m => !isNaN(m));

    if (machineList.length === 0) {
      return res.json([]);
    }

    if (isPackaged) {
      try {
        const [prodResult, defResult] = await Promise.all([
          queries.getMachineProduction(pool, machineList),
          queries.getMachineDefects(pool, machineList)
        ]);

        const prodRows = prodResult.recordset;
        const defRows = defResult.recordset;

        const dias = {};

        prodRows.forEach(row => {
          const dt = row.DateRec;
          if (!dt) return;

          const { date, turno } = obtenerDiaYTurno(dt);

          if (!dias[date]) {
            dias[date] = {
              dateStr: dayjs(date).format('DD/MM/YYYY'),
              turnos: {
                1: { piezas: 0, saldo: 0, maquinas: {}, maquinasSaldo: {} },
                2: { piezas: 0, saldo: 0, maquinas: {}, maquinasSaldo: {} },
                3: { piezas: 0, saldo: 0, maquinas: {}, maquinasSaldo: {} },
              }
            };
          }

          const piezas = row.Pieces || 0;
          if (piezas <= 0) return;

          dias[date].turnos[turno].piezas += piezas;

          const maquina = row.MachCode;
          const estilo = (row.StyleCode || '—').substring(0, 9).trim();

          if (!dias[date].turnos[turno].maquinas[maquina]) {
            dias[date].turnos[turno].maquinas[maquina] = {};
          }

          if (!dias[date].turnos[turno].maquinas[maquina][estilo]) {
            dias[date].turnos[turno].maquinas[maquina][estilo] = 0;
          }

          dias[date].turnos[turno].maquinas[maquina][estilo] += piezas;
        });

        defRows.forEach(row => {
          const dt = row.DateRec;
          if (!dt) return;

          const { date, turno } = obtenerDiaYTurno(dt);

          if (dias[date] && dias[date].turnos[turno]) {
            dias[date].turnos[turno].saldo += (row.Times || 0);

            const maquina = row.MachCode;
            if (maquina) {
              if (!dias[date].turnos[turno].maquinasSaldo[maquina]) {
                dias[date].turnos[turno].maquinasSaldo[maquina] = 0;
              }
              dias[date].turnos[turno].maquinasSaldo[maquina] += (row.Times || 0);
            }
          }
        });

        const divisor = machineList.every(m => m >= 1001) ? 12 : 24;

        const responseData = Object.keys(dias).sort((a, b) => b.localeCompare(a)).map(dateKey => {
          const dayObj = dias[dateKey];
          
          let totalDayPiezas = 0;
          let totalDaySaldo = 0;

          const turnosArray = [1, 2, 3].map(tNum => {
            const turnoObj = dayObj.turnos[tNum];
            totalDayPiezas += turnoObj.piezas;
            totalDaySaldo += turnoObj.saldo;

            const maquinasArray = Object.keys(turnoObj.maquinas).sort().map(mCode => {
              const machineEstilos = turnoObj.maquinas[mCode];
              let totalMachPiezas = 0;

              const estilosArray = Object.keys(machineEstilos).sort().map(eName => {
                const ePiezas = machineEstilos[eName];
                totalMachPiezas += ePiezas;

                return {
                  id: `${dateKey}-${tNum}-${mCode}-${eName}`,
                  name: eName,
                  piezas: ePiezas,
                  docenas: parseFloat((ePiezas / divisor).toFixed(2))
                };
              });

              const machSaldo = turnoObj.maquinasSaldo[mCode] || 0;

              return {
                id: `${dateKey}-${tNum}-${mCode}`,
                name: `Máquina ${mCode}`,
                piezas: totalMachPiezas,
                docenas: parseFloat((totalMachPiezas / divisor).toFixed(2)),
                saldo: machSaldo,
                articulos: estilosArray
              };
            });

            return {
              id: `${dateKey}-${tNum}`,
              name: `Turno ${tNum}`,
              piezas: turnoObj.piezas,
              docenas: parseFloat((turnoObj.piezas / divisor).toFixed(2)),
              saldo: turnoObj.saldo,
              maquinas: maquinasArray
            };
          });

          return {
            id: dateKey,
            fecha: dayObj.dateStr,
            piezas: totalDayPiezas,
            docenas: parseFloat((totalDayPiezas / divisor).toFixed(2)),
            saldo: totalDaySaldo,
            turnos: turnosArray
          };
        });

        res.json(responseData);
      } catch (err) {
        serverLog(`[ERROR] GET /produccion/maquinas: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      serverLog('Using test data for /produccion/maquinas');
      res.json(testData.produccionMaquinas);
    }
  });

  app.get('/:room/programada', async (req, res) => {


    const { room } = req.params;
    serverLog(`GET /${room}/programada`);

    if (isPackaged) {
      try {
        const { startDate, startMonth, startYear, endDate } = req.query;
        const [progColor, machines] = await Promise.all([
          // get Programada with Color, month production, and docenas by art.
          queries.getProgColorTable(
            pool,
            room,
            startDate,
            startMonth,
            startYear,
            endDate
          ),
          !req.query.startMonth ? getParsedMachines(pool, room, true) : null, // get Machines
        ]);

        // match machines with rows
        let rows = progColor.recordset;
        rows = [...rows].map((row) => {
          // add empty array to avoid errors in ProgAnteriores view
          if (!machines) return { ...row, Machines: [] };

          const matchingMachines = machines.filter(
            // match machines with articulo
            (m) => {
              const machArticulo = m.StyleCode.punto
                ? parseFloat(`${m.StyleCode.articulo}.${m.StyleCode.punto}`)
                : m.StyleCode.articulo;

              return (
                machArticulo === row.Articulo &&
                m.StyleCode.talle === row.Talle &&
                m.StyleCode.colorId === row.ColorId
              );
            }
          );

          return {
            ...row,
            Machines: matchingMachines.sort((a, b) => a.MachCode - b.MachCode),
          };
        });

        res.json(rows);
      } catch (err) {
        serverLog(`[ERROR] GET /${room}/programada: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else if (!req.query.endMonth) {
      // test data
      serverLog(`Using test data for /${room}/programada`);
      res.json(testData.programada);
    } else {
      // test data for month
      serverLog(`Using test data for /${room}/programada (anterior)`);
      res.json(testData.programadaAnterior);
    }
  });

  app.get('/:room/programada/actualDate', async (req, res) => {
    const { room } = req.params;
    serverLog(`GET /${room}/programada/actualDate`);

    if (isPackaged) {
      try {
        const result = await queries.getProgActualDate(pool, room);
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /${room}/programada/actualDate: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /programada/actualDate');
      res.json(testData.actualDate);
    }
  });

  app.post('/:room/programada/calculateNewTargets', async (req, res) => {
    const { room } = req.params;
    serverLog(`POST /${room}/programada/calculateNewTargets`);
    const progUpdates = req.body;

    if (isPackaged) {
      try {
        const machines = await getParsedMachines(pool, room, true);
        const targets = await calculateNewTargets(pool, progUpdates, machines);

        res.json(targets);
      } catch (err) {
        serverLog(
          `[ERROR] POST /${room}/programada/calculateNewTargets: ${err}`
        );
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog(`Using test data for /${room}/programada/calculateNewTargets`);
      res.json(testData.calculateNewTargets);
    }
  });

  app.post('/:room/programada/compare', async (req, res) => {
    const { room } = req.params;
    serverLog(`POST /${room}/programada/compare`);
    const data = req.body;

    if (isPackaged) {
      try {
        const currProg = await queries.getProgramada(
          pool,
          room,
          data.startDate
        );
        const diff = compareProgramada(currProg.recordset, data.new);
        res.json(diff);
      } catch (err) {
        serverLog(`[ERROR] POST /${room}/programada/compare: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /programada/compare');
      res.json(testData.compare);
    }
  });

  app.get('/programada/file', async (req, res) => {
    serverLog('GET /programada/file');
    const { path } = req.query;

    try {
      const data = await processPDF(path);
      res.json(data);
    } catch (err) {
      serverLog(`[ERROR] PDF Error: ${err}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/:room/programada/insertAll', async (req, res) => {
    const { room } = req.params;
    serverLog(`POST /${room}/programada/insertAll`);
    const data = req.body;

    if (isPackaged) {
      try {
        const now = dayjs.tz();
        await queries.insertProgramada(pool, data, room, 'inserted', now);
        serverLog(`POST /${room}/programada/insertAll - SUCCESS`);
        // return inserted rows to calculate new targets
        const result = await queries.getProgColor(pool, room, now);
        res.status(201).json({
          message: `Programada nueva cargada con éxito.`,
          inserted: result.recordset,
        });
      } catch (err) {
        serverLog(`[ERROR] POST /${room}/programada/insertAll: ${err}`);
        res.status(500).json({
          message: `No se pudo cargar la programada correctamente.`,
          error: err.message,
        });
      }
    } else {
      // test
      serverLog(`Test for /${room}/programada/insertAll`);
    }
  });

  app.post('/:room/programada/insertStartDate', async (req, res) => {
    const { room } = req.params;
    serverLog(`POST /${room}/programada/insertStartDate`);
    const data = req.body;

    if (isPackaged) {
      try {
        await queries.insertProgStartDate(pool, data, room);
        serverLog(`POST /${room}/programada/insertStartDate - SUCCESS`);
        res.status(200).json({
          message: `Fecha de inicio de programada cargada con éxito.`,
        });
      } catch (err) {
        serverLog(`[ERROR] POST /${room}/programada/insertStartDate: ${err}`);
        res.status(500).json({
          message: `No se pudo cargar la fecha de inicio de programada correctamente.`,
          error: err.message,
        });
      }
    } else {
      // test data
      serverLog(`Test for /${room}/programada/insertStartDate`);
    }
  });

  app.get('/programada/history', async (req, res) => {
    const { mes, anio, roomCode, articulo } = req.query;
    serverLog(`GET /programada/history - mes: ${mes}, anio: ${anio}, roomCode: ${roomCode}, articulo: ${articulo}`);

    if (isPackaged) {
      try {
        const result = await queries.getProgramadaHistory(
          pool,
          Number(mes),
          Number(anio),
          roomCode,
          articulo
        );
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /programada/history: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      serverLog(`Using test data for GET /programada/history`);
      const mockHistory = [
        {
          Fecha: new Date().toISOString(),
          Articulo: 6428,
          Talle: 3,
          RoomCode: roomCode === 'HOMBRE' ? 'ALGODÓN' : roomCode,
          Docenas: 50,
          'Docenas prev.': 40,
          'Estado articulo': 'Modificado'
        },
        {
          Fecha: new Date().toISOString(),
          Articulo: 1234,
          Talle: 2,
          RoomCode: roomCode === 'HOMBRE' ? 'ALGODÓN' : roomCode,
          Docenas: 100,
          'Docenas prev.': null,
          'Estado articulo': 'Agregado'
        }
      ];
      res.json(mockHistory);
    }
  });

  app.get('/:room/programada/loadDates', async (req, res) => {
    const { room } = req.params;
    serverLog(`GET /${room}/programada/loadDates`);

    if (isPackaged) {
      try {
        const result = await queries.getProgLoadDates(pool, room);
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /${room}/programada/loadDates: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog(`Using test data for /${room}/programada/loadDates`);
      res.json(testData.loadDates);
    }
  });

  app.get('/:room/programada/total/:startDate', async (req, res) => {
    const { room, startDate } = req.params;
    serverLog(`GET /${room}/programada/total`);

    if (isPackaged) {
      try {
        const result = await queries.getProgramadaTotal(pool, room, startDate);
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /${room}/programada/total: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog(`Using test data for /${room}/programada/total`);
      res.json(testData.programadaTotal);
    }
  });

  app.post('/:room/programada/update', async (req, res) => {
    const { room } = req.params;
    serverLog(`POST /${room}/programada/update`);
    const data = req.body;

    if (isPackaged) {
      try {
        const now = dayjs.tz();
        await queries.updateProgramada(pool, room, data, now);
        serverLog(`POST /${room}/programada/update - SUCCESS`);
        // return inserted rows to calculate new targets
        // include deleted articulos to stop machines
        const result = await queries.getProgColor(pool, room, now, true);
        res.status(201).json({
          message: `Cambios cargados con éxito.`,
          inserted: result.recordset,
        });
      } catch (err) {
        serverLog(`[ERROR] POST /programada/update: ${err}`);
        res.status(500).json({
          message: `No se pudieron cargar los cambios correctamente.`,
          error: err.message,
        });
      }
    } else {
      // test data
      serverLog('Using test data for /programada/update');
      res.json(testData.previousRecord);
    }
  });

  app.post('/programada/updateDocenas', async (req, res) => {
    serverLog('POST /programada/updateDocenas');
    const data = req.body;

    try {
      await queries.updateProgColorDoc(pool, data);
      serverLog('POST /programada/updateDocenas - SUCCESS');
      res.status(201).json({
        message: `Docenas agregadas con éxito para el art. ${data.articulo} T${data.talle} ${data.color}.`,
      });
    } catch (err) {
      serverLog(`[ERROR] POST /programada/updateDocenas: ${err}`);
      res.status(500).json({
        message: `No se pudo agregar las docenas para el art. ${data.articulo} T${data.talle} ${data.color}.`,
        error: err.message,
      });
    }
  });

  // stats for dashboard
  app.get('/:room/stats/dailyProduction', async (req, res) => {
    const { room } = req.params;
    serverLog(`GET /${room}/stats/dailyProduction`);

    if (isPackaged) {
      try {
        const result = await queries.getDailyProduction(pool, room);
        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /${room}/stats/dailyProduction: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /stats/dailyProduction');
      res.json(testData.dailyProduction);
    }
  });

  app.get('/:room/stats/currentEfficiency', async (req, res) => {
    const { room } = req.params;
    serverLog(`GET /${room}/stats/currentEfficiency`);

    if (isPackaged) {
      try {
        const result = await sql.query(queries.getCurrWEff());
        const groupEffs = calcEff(room, result.recordset);

        res.json(groupEffs);
      } catch (err) {
        serverLog(`[ERROR] GET /${room}/stats/currentEfficiency: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /stats/currentEfficiency');
      res.json(testData.currWEff);
    }
  });

  app.get('/:room/stats/dailyEfficiency', async (req, res) => {
    const { room } = req.params;
    serverLog(`GET /${room}/stats/dailyEfficiency`);

    if (isPackaged) {
      try {
        const result = await queries.getDailyWEff(pool, room);

        res.json(result.recordset);
      } catch (err) {
        serverLog(`[ERROR] GET /${room}/stats/dailyEfficiency: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /stats/dailyEfficiency');
      res.json(testData.dailyWEff);
    }
  });

  app.get('/:room/stats/monthSaldo', async (req, res) => {
    const { room } = req.params;
    serverLog(`GET /${room}/stats/monthSaldo`);

    const docenas = room === 'SEAMLESS' ? 12 : 24;

    if (isPackaged) {
      try {
        const result = await queries.getMonthSaldo(pool, room);
        const row = result.recordset[0]; // single-record
        // prep data for chart
        const porc = ((row.Saldo / (row.Pieces + row.Saldo)) * 100).toFixed(2);
        const saldo = {
          porc: isNaN(porc) ? 0 : porc,
          data: [
            { id: 0, value: Math.round(row.Saldo / docenas), label: 'Saldo' },
            {
              id: 1,
              value: Math.round(row.Pieces / docenas),
              label: 'Restante',
            },
          ],
        };

        res.json(saldo);
      } catch (err) {
        serverLog(`[ERROR] GET /${room}/stats/monthSaldo: ${err}`);
        res.status(500).json({ error: err.message });
      }
    } else {
      // test data
      serverLog('Using test data for /stats/monthSaldo');
      res.json(testData.monthSaldo);
    }
  });
};

// startServer();
