WITH cte AS (
    SELECT 
        MACHINES.RoomCode AS Room,
        MACHINES.MachCode AS Máquina,
        MACHINES.IpAddress AS IP,
        pm.DateRec AS [Último Registro],
        ROW_NUMBER() OVER (
            PARTITION BY pm.MachCode 
            ORDER BY pm.DateRec DESC
        ) AS rn
    FROM MACHINES
    JOIN PRODUCTIONS_MONITOR pm 
        ON pm.MachCode = MACHINES.MachCode
    WHERE MACHINES.State = 56
    AND pm.MachCode > 300
    AND pm.Pieces > 0
    AND pm.DateRec >= DATEADD(DAY, -10, GETDATE())
)
SELECT 
    Room,
    Máquina,
    IP,
    [Último Registro]
FROM cte
WHERE rn = 1
ORDER BY Máquina