import pandas as pd
import pyodbc
from PySide6.QtWidgets import QWidget, QVBoxLayout, QTableView, QPushButton
from PySide6.QtCore import QTimer, Qt, QAbstractTableModel
from PySide6.QtGui import QColor, QBrush


class PandasModel(QAbstractTableModel):
    def __init__(self, df=pd.DataFrame(), alert_rows=None):
        super().__init__()
        self._df = df
        self.alert_rows = alert_rows if alert_rows else set()

    def rowCount(self, parent=None):
        return len(self._df)

    def columnCount(self, parent=None):
        return len(self._df.columns)

    def data(self, index, role):

        if role == Qt.DisplayRole:
            return str(self._df.iat[index.row(), index.column()])

        if role == Qt.TextAlignmentRole:
            return Qt.AlignCenter

        # pintar filas rojas
        if role == Qt.BackgroundRole:
            if index.row() in self.alert_rows:
                return QBrush(QColor("#FF0000"))

    def headerData(self, section, orientation, role):
        if role == Qt.DisplayRole and orientation == Qt.Horizontal:
            return self._df.columns[section]


class TabOffline(QWidget):

    def __init__(self, conexion_func, tab_widget):
        super().__init__()

        self.obtener_conexion = conexion_func
        self.tab_widget = tab_widget

        self.previous_machines = set()
        self.alert_machines = set()
        self.alert_rows = set()

        layout = QVBoxLayout(self)

        self.tabla = QTableView()
        layout.addWidget(self.tabla)

        # BOTON TODO REVISADO
        self.btn_revisado = QPushButton("TODO REVISADO")
        layout.addWidget(self.btn_revisado)

        self.btn_revisado.clicked.connect(self.todo_revisado)

        self.timer = QTimer()
        self.timer.timeout.connect(self.actualizar)
        self.timer.start(3600000)  # 1 hora

        self.actualizar()

    def leer_query(self):
        with open("C:\\Eseka\\Lauti\\Python\\Distribucion\\offline_query.sql", "r", encoding="utf-8") as f:
            return f.read()

    def actualizar(self):

        try:

            conn = self.obtener_conexion()

            query = self.leer_query()

            df = pd.read_sql(query, conn)

            conn.close()

            maquinas_actuales = set(df["Máquina"].tolist())

            nuevas = maquinas_actuales - self.previous_machines

            # detectar maquinas nuevas
            if nuevas:

                idx = self.tab_widget.indexOf(self)
                self.tab_widget.tabBar().setTabTextColor(idx, QColor("orange"))

                self.alert_machines.update(nuevas)

            self.previous_machines = maquinas_actuales

            # determinar filas amarillas
            self.alert_rows = set()

            for i, maquina in enumerate(df["Máquina"]):
                if maquina in self.alert_machines:
                    self.alert_rows.add(i)

            modelo = PandasModel(df, self.alert_rows)

            self.tabla.setModel(modelo)

        except:
            pass

    def limpiar_alerta(self):

        idx = self.tab_widget.indexOf(self)
        self.tab_widget.tabBar().setTabTextColor(idx, QColor("black"))

    def todo_revisado(self):

        # limpiar filas amarillas
        self.alert_machines.clear()
        self.alert_rows.clear()

        # refrescar tabla
        self.actualizar()