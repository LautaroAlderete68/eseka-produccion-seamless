import sys
import pyodbc
import pandas as pd
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QComboBox,
    QTableView, QMessageBox
)
from PySide6.QtCore import Qt, QAbstractTableModel, QEvent
import querys
from PySide6.QtGui import QIcon


# =========================
# CONFIGURACIÓN BD
# =========================
DB_SERVER = "servernautilus"
DB_PORT = 1433
DB_NAME = "dbNautilus"
DB_USERNAME = "nautilus"
DB_PASSWORD = "MasterUser78"


def obtener_conexion():
    return pyodbc.connect(
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={DB_SERVER},{DB_PORT};"
        f"DATABASE={DB_NAME};"
        f"UID={DB_USERNAME};"
        f"PWD={DB_PASSWORD};"
        "TrustServerCertificate=yes;"
    )


# =========================
# ROOM ALIAS
# =========================
ROOM_ALIAS = {
    "MUJER (1-194)": "MUJER",
    "HOMBRE (301-450)": "HOMBRE",
    "SEAMLESS (1001-1037)": "SEAMLESS"
}


# =========================
# MODELO TABLA CON CEBRADO POR BLOQUE
# =========================
class PandasModel(QAbstractTableModel):
    def __init__(self, df=pd.DataFrame()):
        super().__init__()
        self.setWindowIcon(QIcon("prenda.ico"))
        self.setDataFrame(df)

    def setDataFrame(self, df):
        self.beginResetModel()
        self._df = df.reset_index(drop=True)
        self._row_groups = self._calcular_grupos()
        self.endResetModel()

    def _calcular_grupos(self):
        grupos = []
        color = False
        last_key = None

        for _, row in self._df.iterrows():
            key = (row["Fecha"], row["Turno"])
            if key != last_key:
                color = not color
                last_key = key
            grupos.append(color)

        return grupos

    def rowCount(self, parent=None):
        return len(self._df)

    def columnCount(self, parent=None):
        return len(self._df.columns)

    def data(self, index, role=Qt.DisplayRole):
        if not index.isValid():
            return None

        value = self._df.iat[index.row(), index.column()]

        if role == Qt.DisplayRole:
            return "" if pd.isna(value) else str(value)

        if role == Qt.TextAlignmentRole:
            return Qt.AlignCenter

        if role == Qt.BackgroundRole:
            if self._row_groups[index.row()]:
                return Qt.lightGray  # se sobreescribe por stylesheet

        return None

    def headerData(self, section, orientation, role=Qt.DisplayRole):
        if role != Qt.DisplayRole:
            return None
        if orientation == Qt.Horizontal:
            return self._df.columns[section]
        return section + 1

    # 🔹 IMPORTANTE: recalcular grupos al ordenar
    def sort(self, column, order):
        colname = self._df.columns[column]
        ascending = order == Qt.AscendingOrder
        self.setDataFrame(
            self._df.sort_values(colname, ascending=ascending)
        )


# =========================
# VENTANA PRINCIPAL
# =========================
class VentanaPrincipal(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Saldo por Máquina")
        self.resize(900, 700)

        # ---------- ESTILO AZUL MODERNO + SCROLL ----------
        self.setStyleSheet("""
        QWidget {
            background-color: #F8FAFC;
            font-family: 'Segoe UI';
            color: #0F172A;
        }

        QLabel {
            font-size: 13px;
        }

        QLineEdit, QComboBox {
            background-color: #FFFFFF;
            border: 1px solid #CBD5E1;
            border-radius: 6px;
            padding: 6px 8px;
            min-height: 28px;
        }
        QLineEdit:focus, QComboBox:focus {
            border: 1px solid #2563EB;
        }

        QPushButton {
            background-color: #2563EB;
            color: white;
            border: none;
            border-radius: 10px;
            padding: 8px 22px;
            font-size: 13px;
            font-weight: 600;
        }
        QPushButton:hover { background-color: #1D4ED8; }
        QPushButton:pressed { background-color: #1E40AF; }

        QTableView {
            background-color: #FFFFFF;
            alternate-background-color: #E0F2FE;
            gridline-color: #CBD5E1;
            border: 1px solid #CBD5E1;
            border-radius: 10px;
            font-size: 12px;
        }

        QTableView::item:hover {
            background-color: #DBEAFE;
        }

        QTableView::item:selected {
            background-color: #93C5FD;
            color: #0F172A;
        }

        QTableView::item:selected:!active {
            background-color: #BFDBFE;
        }

        QHeaderView::section {
            background-color: #EAF1FF;
            padding: 8px;
            border: 1px solid #CBD5E1;
            font-weight: bold;
            font-size: 12px;
        }

        /* SCROLLBAR MODERNA */
        QScrollBar:vertical {
            background: #F8FAFC;
            width: 12px;
            margin: 4px;
        }
        QScrollBar::handle:vertical {
            background: #94A3B8;
            border-radius: 6px;
            min-height: 30px;
        }
        QScrollBar::handle:vertical:hover {
            background: #64748B;
        }
        QScrollBar::add-line, QScrollBar::sub-line {
            height: 0;
        }
        """)

        layout = QVBoxLayout(self)

        # ---------- TÍTULO ----------
        titulo = QLabel("SALDO POR MÁQUINA")
        titulo.setAlignment(Qt.AlignCenter)
        titulo.setStyleSheet("font-size: 20px; font-weight: bold;")
        layout.addWidget(titulo)

        # ---------- FILTROS ----------
        filtros = QHBoxLayout()

        filtros.addWidget(QLabel("Máquina:"))
        self.entry_maquina = QLineEdit()
        self.entry_maquina.setFixedWidth(80)
        filtros.addWidget(self.entry_maquina)

        filtros.addSpacing(20)

        filtros.addWidget(QLabel("Room:"))
        self.combo_room = QComboBox()
        self.combo_room.addItems(ROOM_ALIAS.keys())
        filtros.addWidget(self.combo_room)

        filtros.addSpacing(20)

        self.btn_buscar = QPushButton("Buscar")
        filtros.addWidget(self.btn_buscar)

        filtros.addStretch()
        layout.addLayout(filtros)

        # ---------- TABLA ----------
        self.tabla = QTableView()
        self.tabla.setSortingEnabled(True)
        self.tabla.setAlternatingRowColors(True)
        layout.addWidget(self.tabla)

        # ---------- EVENTOS ----------
        self.btn_buscar.clicked.connect(self.cargar_datos)
        self.entry_maquina.returnPressed.connect(self.cargar_datos)
        self.entry_maquina.installEventFilter(self)

    def eventFilter(self, obj, event):
        if obj == self.entry_maquina and event.type() == QEvent.KeyPress:
            if event.key() == Qt.Key_Escape:
                self.entry_maquina.clear()
                return True
        return super().eventFilter(obj, event)

    # ---------- CARGAR DATOS ----------
    def cargar_datos(self):
        seleccion = self.combo_room.currentText()
        room = ROOM_ALIAS.get(seleccion)

        maquina = self.entry_maquina.text().strip()
        maquina_param = maquina if maquina else None

        try:
            conn = obtener_conexion()
            cursor = conn.cursor()

            cursor.execute(
                querys.saldo_maquina_88,
                (room, maquina_param, maquina_param, maquina_param)
            )

            columnas = [c[0] for c in cursor.description]
            rows = cursor.fetchall()

            df = pd.DataFrame.from_records(rows, columns=columnas)

            df = df[["Fecha", "Maquina", "Saldo", "Acumulado", "Turno", "Cadena"]]

            modelo = PandasModel(df)
            self.tabla.setModel(modelo)
            self.tabla.resizeColumnsToContents()

        except Exception as e:
            QMessageBox.critical(self, "Error", str(e))
        finally:
            conn.close()
