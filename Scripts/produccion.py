from datetime import datetime, timedelta, time

from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QTreeView, QPushButton, QHeaderView
)
from PySide6.QtCore import Qt, QAbstractItemModel, QModelIndex
from PySide6.QtGui import QColor, QBrush, QFont
from PySide6.QtCore import Qt, QAbstractItemModel, QModelIndex, QSize

# =========================================================
# TURNOS
# =========================================================

def obtener_dia_y_turno(dt):
    t = dt.time()

    # ⚠️ CASOS EXACTOS (cierres de turno)
    if t == time(6, 0):
        return (dt - timedelta(days=1)).date(), 3
    elif t == time(14, 0):
        return dt.date(), 1
    elif t == time(22, 0):
        return dt.date(), 2

    # ⏱️ RANGO NORMAL
    if time(6, 0) < t < time(14, 0):
        return dt.date(), 1
    elif time(14, 0) < t < time(22, 0):
        return dt.date(), 2
    elif t > time(22, 0):
        return dt.date(), 3
    else:
        # 00:00 → 05:59
        return (dt - timedelta(days=1)).date(), 3

# =========================================================
# NODO
# =========================================================

class Nodo:
    def __init__(self, data, parent=None):
        self.data = data
        self.parent = parent
        self.children = []

    def append(self, child):
        self.children.append(child)

    def child(self, row):
        return self.children[row]

    def childCount(self):
        return len(self.children)

    def row(self):
        if self.parent:
            return self.parent.children.index(self)
        return 0

# =========================================================
# MODELO
# =========================================================

class ModeloProduccion(QAbstractItemModel):

    def __init__(self, root):
        super().__init__()
        self.root = root
        self.headers = ["Fecha / Turno", "Piezas", "Docenas", "Saldo"]

    def columnCount(self, parent):
        return len(self.headers)

    def rowCount(self, parent):
        if not parent.isValid():
            return self.root.childCount()
        return parent.internalPointer().childCount()

    def index(self, row, column, parent):
        if not self.hasIndex(row, column, parent):
            return QModelIndex()

        parentNode = self.root if not parent.isValid() else parent.internalPointer()
        return self.createIndex(row, column, parentNode.child(row))

    def parent(self, index):
        if not index.isValid():
            return QModelIndex()

        node = index.internalPointer()
        parent = node.parent

        if parent is None or parent == self.root:
            return QModelIndex()

        return self.createIndex(parent.row(), 0, parent)

    def data(self, index, role):
        if not index.isValid():
            return None

        node = index.internalPointer()

        if role == Qt.DisplayRole:
            return str(node.data[index.column()])

        if role == Qt.TextAlignmentRole:
            return Qt.AlignCenter

        # 🎨 COLORES
        if role == Qt.BackgroundRole:
            if node.parent == self.root:                # nivel día
                return QBrush(QColor("#cfe2ff")) if node.data[1] > 0 else QBrush(QColor("#d6d6d6"))
            elif node.parent.parent == self.root:       # nivel turno
                return QBrush(QColor("#ffffff")) if node.data[1] > 0 else QBrush(QColor("#eeeeee"))
            else:                                       # nivel artículo
                return QBrush(QColor("#aff8c2"))

        # 🔤 NEGRITA EN SALDO
        if role == Qt.FontRole and index.column() == 3:
            valor = node.data[3]
            if isinstance(valor, (int, float)) and valor > 0:
                font = QFont()
                font.setBold(True)
                return font
        
        if role == Qt.SizeHintRole:
            if node.parent == self.root:  # día
                return QSize(0, 36)
            elif node.parent.parent == self.root:  # turno
                return QSize(0, 28)
            else:  # artículo
                return QSize(0, 24)

        return None

    def headerData(self, section, orientation, role):
        if role == Qt.DisplayRole:
            return self.headers[section] if orientation == Qt.Horizontal else section + 1

        if role == Qt.TextAlignmentRole:
            return Qt.AlignCenter

        return None

# =========================================================
# TAB PRODUCCIÓN
# =========================================================

class TabProduccion(QWidget):

    # Porcentajes de ancho por columna — deben sumar 100
    # [Fecha / Turno, Piezas, Docenas, Saldo]
    COLUMNAS_PCT = [46, 18, 18, 18]

    def __init__(self, obtener_conexion):
        super().__init__()

        self.obtener_conexion = obtener_conexion

        layout = QVBoxLayout(self)

        # 🔹 TOP (input + botón)
        top = QHBoxLayout()

        top.addWidget(QLabel("Máquina:"))

        self.input = QLineEdit()
        self.input.setPlaceholderText("Ej: 430 o 430,429,428")
        self.input.setMaximumWidth(160)
        top.addWidget(self.input)

        self.btn_buscar = QPushButton("Buscar")
        self.btn_buscar.setFixedWidth(80)
        top.addWidget(self.btn_buscar)

        layout.addLayout(top)

        # 🔹 TREE
        self.tree = QTreeView()
        self.tree.header().setSectionResizeMode(QHeaderView.Fixed)
        self.tree.header().setStretchLastSection(False)
        layout.addWidget(self.tree)

        # 🔹 CONEXIONES
        self.btn_buscar.clicked.connect(self.buscar)
        self.input.returnPressed.connect(self.buscar)

        # Override resizeEvent para recalcular anchos al cambiar tamaño de ventana
        self.tree.resizeEvent = self._tree_resize_event

    # =====================================================
    # ANCHOS DE COLUMNAS
    # =====================================================

    def _aplicar_anchos(self):
        ancho_total = self.tree.viewport().width()
        for col, pct in enumerate(self.COLUMNAS_PCT):
            self.tree.setColumnWidth(col, int(ancho_total * pct / 100))

    def _tree_resize_event(self, event):
        QTreeView.resizeEvent(self.tree, event)
        self._aplicar_anchos()

    # =====================================================
    # DATOS
    # =====================================================

    def construir_arbol(self, maquinas):
        conn = self.obtener_conexion()
        cursor = conn.cursor()
        
        # Crear placeholders para la consulta SQL
        placeholders = ",".join(["?"] * len(maquinas))
        
        # PRODUCCIÓN - múltiples máquinas
        cursor.execute(f"""
            SELECT TOP (200) DateRec, Pieces, StyleCode, MachCode
            FROM PRODUCTIONS_MONITOR
            WHERE MachCode IN ({placeholders})
            ORDER BY DateRec DESC
        """, maquinas)
        prod_rows = cursor.fetchall()

        dias = {}

        for row in prod_rows:
            dt = row.DateRec
            dp, t = obtener_dia_y_turno(dt)

            if dp not in dias:
                dias[dp] = {
                    1: {"p": 0, "s": 0, "estilos": {}},
                    2: {"p": 0, "s": 0, "estilos": {}},
                    3: {"p": 0, "s": 0, "estilos": {}},
                }

            piezas = row.Pieces or 0
            if piezas <= 0:
                continue

            dias[dp][t]["p"] += piezas

            maquina = row.MachCode

            if "maquinas" not in dias[dp][t]:
                dias[dp][t]["maquinas"] = {}

            if maquina not in dias[dp][t]["maquinas"]:
                dias[dp][t]["maquinas"][maquina] = {}

            estilo = (row.StyleCode or "—")[:9]

            dias[dp][t]["maquinas"][maquina][estilo] = (
                dias[dp][t]["maquinas"][maquina].get(estilo, 0) + piezas
            )

        # SALDO - múltiples máquinas
        cursor.execute(f"""
            SELECT DateRec, Times
            FROM DEFECTS_MONITOR
            WHERE MachCode IN ({placeholders})
        """, maquinas)
        def_rows = cursor.fetchall()

        for row in def_rows:
            dt = row.DateRec
            dp, t = obtener_dia_y_turno(dt)

            if dp not in dias:
                dias[dp] = {
                    1: {"p": 0, "s": 0, "estilos": {}},
                    2: {"p": 0, "s": 0, "estilos": {}},
                    3: {"p": 0, "s": 0, "estilos": {}},
                }

            if t in dias[dp]:
                dias[dp][t]["s"] += row.Times or 0

        conn.close()

        # Determinar divisor: si TODAS las máquinas son >= 1001, usar 12, sino 24
        divisor = 12 if all(m >= 1001 for m in maquinas) else 24

        root = Nodo(["root"])

        for dp in sorted(dias.keys(), reverse=True):

            t1, t2, t3 = dias[dp][1], dias[dp][2], dias[dp][3]

            total_p = t1["p"] + t2["p"] + t3["p"]
            total_s = t1["s"] + t2["s"] + t3["s"]

            nodo_dia = Nodo(
                [dp.strftime("%d/%m/%Y"), total_p, round(total_p / divisor, 2), total_s],
                root,
            )
            root.append(nodo_dia)

            for i, data in enumerate([t1, t2, t3], start=1):

                nodo_turno = Nodo(
                    [f"Turno {i}", data["p"], round(data["p"] / divisor, 2), data["s"]],
                    nodo_dia,
                )
                nodo_dia.append(nodo_turno)

                # Tercer nivel: máquinas
                for maquina, estilos in sorted(data.get("maquinas", {}).items()):

                    total_maquina = sum(estilos.values())

                    nodo_maquina = Nodo(
                        [
                            f"Máquina {maquina}",
                            total_maquina,
                            round(total_maquina / divisor, 2),
                            ""
                        ],
                        nodo_turno,
                    )

                    nodo_turno.append(nodo_maquina)

                    # Cuarto nivel: artículos
                    for estilo, piezas in sorted(estilos.items()):

                        nodo_estilo = Nodo(
                            [
                                estilo,
                                piezas,
                                round(piezas / divisor, 2),
                                ""
                            ],
                            nodo_maquina,
                        )

                        nodo_maquina.append(nodo_estilo)

        return root

    # =====================================================
    # BUSCAR
    # =====================================================

    def buscar(self):
        texto = self.input.text().strip()
        
        if not texto:
            return
        
        # Parsear múltiples máquinas separadas por comas
        maquinas_str = [m.strip() for m in texto.split(",")]
        maquinas = []
        
        for m in maquinas_str:
            if not m.isdigit():
                return
            num = int(m)
            if num < 323 or num > 1037:
                return
            maquinas.append(num)
        
        root = self.construir_arbol(maquinas)
        
        modelo = ModeloProduccion(root)
        self.tree.setModel(modelo)
        self.tree.collapseAll()
        self._aplicar_anchos()