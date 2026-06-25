import { useOutletContext } from 'react-router';
import { useConfig } from '../../ConfigContext.jsx';
import Button from '@mui/joy/Button';
import Stack from '@mui/joy/Stack';
import ChangeCircleOutlined from '@mui/icons-material/ChangeCircleOutlined';
import CompareArrowsOutlined from '@mui/icons-material/CompareArrowsOutlined';
import LibraryAddOutlined from '@mui/icons-material/LibraryAddOutlined';

export default function CompareToolbar({
  programada,
  diff,
  setDiff,
  newTargets,
  startDate,
  loadType,
  setNewArticuloData,
}) {
  const { apiUrl } = useConfig();
  const { addColorCodes, room } = useOutletContext();

  // compare new programada to old
  function handleCompare() {
    if (programada) {
      fetch(`${apiUrl}/${room}/programada/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate,
          new: programada.rows,
        }),
      })
        .then((res) => res.json())
        .then((data) => setDiff(data))
        .catch((err) => console.error('[CLIENT] Error fetching data:', err));
    }
  }

  async function handleProgramadaUpdate() {
    // Check if articulo, color codes, and color distr exist and handle accordingly

    // colorCodes will be inserted through newColorCodes.
    // fetch newColorCodes before updating
    try {
      const res = await fetch(`${apiUrl}/${room}/machines/newColorCodes`);
      const newCodes = await res.json();
      addColorCodes(newCodes);
    } catch (err) {
      console.error(
        `[CLIENT] Error fetching /${room}/machines/newColorCodes:`,
        err
      );
    }

    let prevArt = null; // to avoid duplicate fetches
    let prevArtTalles = [];

    // Add a dummy item to trigger processing of the final real item
    const addedItems = [...diff.added, { articulo: null }];

    for (const row of addedItems) {
      if (prevArt === row.articulo) {
        // same articulo, different talle
        // gather all the talles first
        prevArtTalles.push(row.talle);
      } else {
        if (prevArt !== null) {
          // we've gathered all the talles, now we insert
          let articulo;
          try {
            let res = await fetch(`${apiUrl}/articulo/${prevArt}`);
            articulo = await res.json();
          } catch (err) {
            console.error('[CLIENT] Error fetching articulo:', err);
          }

          // if else to avoid making unnecessary fetches if articulo doesn't exist
          if (!articulo || articulo.length === 0) {
            // capture the current values
            const artToInsert = prevArt;
            const talles = prevArtTalles;
            // ask for Tipo, ColorDistr
            setNewArticuloData((prev) => [
              ...prev,
              {
                articuloExists: false, // to know if an articulo insert is needed
                articulo: artToInsert,
                tipo: null,
                talles,
                colorDistr: null,
              },
            ]);
          } else {
            // If articulo exists, check if color distr exists for all talles
            let missingTalles = [];
            try {
              const res = await fetch(
                `${apiUrl}/articulo/${articulo[0].Articulo}/colorDistr`
              );
              const colorDistrTalles = await res.json();
              missingTalles = prevArtTalles.filter(
                (talle) => !colorDistrTalles.find((cd) => cd.Talle === talle)
              );
            } catch (err) {
              console.error('[CLIENT] Error fetching colorDistr:', err);
            }

            // if color distr exists, don't add to newArticuloData
            if (missingTalles.length > 0) {
              setNewArticuloData((prev) => [
                ...prev,
                {
                  articuloExists: true, // no need to insert articulo
                  articulo: articulo[0].Articulo,
                  tipo: articulo[0].Tipo,
                  talles: missingTalles,
                  colorDistr: null,
                },
              ]);
            }
          }
        }

        // Set up for next iteration (skip for dummy item)
        if (row.articulo !== null) {
          prevArt = row.articulo;
          prevArtTalles = [row.talle];
        }
      }
    }

    // move from added to modified to trigger useEffect after inserting new articulos
    setDiff((prev) => ({
      ...prev,
      modified: [...prev.modified, ...prev.added],
      added: [],
    }));
  }

  return (
    <Stack direction='row' className='items-center gap-4'>
      {programada && !diff && !newTargets && (
        <Button
          onClick={handleCompare}
          // can compare only if there is reference date
          disabled={startDate === null}
          startDecorator={<CompareArrowsOutlined />}
        >
          Comparar
        </Button>
      )}

      {diff &&
        !(
          diff.added.length === 0 &&
          diff.modified.length === 0 &&
          diff.deleted.length === 0
        ) && (
          <>
            <Button
              onClick={() => {
                loadType.current = 'update';
                handleProgramadaUpdate();
              }}
              disabled={startDate === null}
              startDecorator={<ChangeCircleOutlined />}
            >
              Cargar cambios
            </Button>

            <Button
              onClick={() => {
                loadType.current = 'insert';
                handleProgramadaUpdate();
              }}
              disabled={startDate !== null}
              startDecorator={<LibraryAddOutlined />}
            >
              Cargar todo
            </Button>
          </>
        )}
    </Stack>
  );
}
