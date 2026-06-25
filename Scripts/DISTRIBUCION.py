import json  

with open("C:\\Eseka\\Lauti\\Python\\Distribucion\\equivalencias.json", "r", encoding="utf-8") as f:
    equivalencias = json.load(f)
equivalencias = {
    float(k) if "." in k else int(k): v
    for k, v in equivalencias.items()
}

import sys
import pyodbc
import pandas as pd
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout,
    QTableView, QHBoxLayout, QLabel,
    QLineEdit
)
from PySide6.QtCore import Qt, QAbstractTableModel
from PySide6.QtGui import QColor, QBrush

# =========================================================
# CONEXIÓN
# =========================================================

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

# =========================================================
# TRAER DATOS
# =========================================================

def obtener_datos():

    query = """
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
    """

    conn = obtener_conexion()
    df = pd.read_sql(query, conn)
    conn.close()

    # ===============================
    # AGREGAR COLUMNA TEÑIR A
    # ===============================

    df["TeñirA"] = ""

    for i, row in df.iterrows():
        art = row["Articulo"]
        color = row["ColorBase"]

        if art in equivalencias and color in equivalencias[art]:
            destinos = equivalencias[art][color]
            df.at[i, "TeñirA"] = ", ".join(destinos)

    return df


# =========================================================
# MODELO
# =========================================================

class ModeloColores(QAbstractTableModel):

    def __init__(self, dataframe):
        super().__init__()
        self._df = dataframe
        self.columnas_visibles = ["Articulo", "TeñirA", "ColorBase"]

    def rowCount(self, parent=None):
        return len(self._df)

    def columnCount(self, parent=None):
        return len(self.columnas_visibles)

    def data(self, index, role=Qt.DisplayRole):

        if not index.isValid():
            return None

        row = index.row()
        col_name = self.columnas_visibles[index.column()]
        valor = self._df.iloc[row][col_name]

        # Mostrar texto
        if role == Qt.DisplayRole:
            return str(valor)

        # Centrar texto
        if role == Qt.TextAlignmentRole:
            return Qt.AlignCenter

        # 🔥 ColorBase y TeñirA usan el MISMO color
        if col_name in ["ColorBase", "TeñirA"]:

            if role == Qt.BackgroundRole:
                hex_color = self._df.iloc[row]["Hex"]
                if pd.notna(hex_color):
                    return QBrush(QColor(hex_color))

            if role == Qt.ForegroundRole:
                white_text = self._df.iloc[row]["WhiteText"]
                if pd.notna(white_text) and int(white_text) == 1:
                    return QBrush(QColor("#FFFFFF"))
                else:
                    return QBrush(QColor("#000000"))

        return None

    def headerData(self, section, orientation, role):
        if role == Qt.DisplayRole:
            if orientation == Qt.Horizontal:

                nombres_personalizados = {
                    "Articulo": "Artículo",
                    "TeñirA": "Color a teñir",
                    "ColorBase": "Color base"
                }

                columna_real = self.columnas_visibles[section]
                return nombres_personalizados[columna_real]

            else:
                return section + 1
        return None


# =========================================================
# INTERFAZ
# =========================================================

class VentanaDistribucion(QWidget):

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Artículos y Colores")
        self.resize(400, 600)

        layout = QVBoxLayout()
        self.setLayout(layout)

        buscador_layout = QHBoxLayout()
        buscador_layout.addWidget(QLabel("Buscar Artículo:"))

        self.input_busqueda = QLineEdit()
        buscador_layout.addWidget(self.input_busqueda)

        layout.addLayout(buscador_layout)

        self.tabla = QTableView()
        layout.addWidget(self.tabla)

        self.df_original = obtener_datos()
        self.modelo = ModeloColores(self.df_original)
        self.tabla.setModel(self.modelo)
        self.tabla.resizeColumnsToContents()

        # FILTRO AUTOMÁTICO
        self.input_busqueda.textChanged.connect(self.filtrar)

    def filtrar(self, texto):
        texto = texto.strip()

        if texto == "":
            df_filtrado = self.df_original
        else:
            df_filtrado = self.df_original[
                self.df_original["Articulo"].astype(str).str.contains(texto)
            ]

        self.modelo = ModeloColores(df_filtrado)
        self.tabla.setModel(self.modelo)
        self.tabla.resizeColumnsToContents()


