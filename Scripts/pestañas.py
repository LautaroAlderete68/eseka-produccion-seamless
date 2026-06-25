import sys
import pyodbc
import pandas as pd
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QTableView, QMessageBox, QTabWidget
)
from PySide6.QtCore import Qt, QAbstractTableModel, QTimer
from PySide6.QtGui import QBrush, QColor, QIcon
from DISTRIBUCION import VentanaDistribucion
from tab_offline import TabOffline
import subprocess
import time
from buscar_arp_3 import BuscadorARP
from produccion import TabProduccion

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


acknowledged_data = set()
previous_data = {}
tracked_groups = {}
targets_por_style = {}
ip_nylon_caida = False

from datetime import datetime


def obtener_targets():
    targets = {}
    try:
        hoy = datetime.today()
        mes_actual = hoy.month
        año_actual = hoy.year

        conn = obtener_conexion()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                pm.StyleCode,
                MAX(pm.TargetPieces) AS TargetPieces,
                SUM(pm.Pieces) AS TotalPieces
            FROM PRODUCTIONS_MONITOR pm
            WHERE MONTH(pm.DateRec) = ? AND YEAR(pm.DateRec) = ?
            GROUP BY pm.StyleCode
        """, (mes_actual, año_actual))

        for style, target, total in cursor.fetchall():
            targets[style.strip()] = total >= target

        conn.close()
    except:
        pass

    return targets


def obtener_datos():
    data = {}
    try:
        conn = obtener_conexion()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT StyleCode, MachCode, RoomCode
            FROM MACHINES
            WHERE LTRIM(RTRIM(StyleCode)) <> ''
              AND MachCode >= 301
              AND State <> 8 AND State <> 56 AND State <> 11
        """)

        for style, mach, room in cursor.fetchall():
            style = style.split()[0].strip()

            if style == "01":
                continue

            if style not in data:
                data[style] = {"maquinas": set(), "room": room}

            data[style]["maquinas"].add(mach)

        conn.close()

    except:
        pass

    return data


def ip_en_arp(ip):
    try:
        result = subprocess.run(
            ["ping", "-n", "1", "-w", "800", ip],
            capture_output=True,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW
        )

        return result.returncode == 0

    except:
        return False
class PandasModel(QAbstractTableModel):
    def __init__(self, df=pd.DataFrame()):
        super().__init__()
        self._df = df

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
            style = self._df.iat[index.row(), 0]
            maquinas_txt = self._df.iat[index.row(), 1]
            current_set = set(int(m.strip()) for m in maquinas_txt.split(",") if m.strip().isdigit())
            prev_set = previous_data.get(style, set())

            if style not in acknowledged_data and current_set != prev_set:
                if targets_por_style.get(style, False):
                    return QBrush(QColor("#82DDAA"))  # VERDE
                else:
                    return QBrush(QColor("#f3d160"))  # AMARILLO

            return QBrush(QColor("white"))

        return None

    def headerData(self, section, orientation, role=Qt.DisplayRole):
        if role != Qt.DisplayRole:
            return None
        if orientation == Qt.Horizontal:
            return self._df.columns[section]
        return section + 1


class VentanaPrincipal(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Grupos de Máquinas por Artículo")
        self.resize(400, 600)
        self.setWindowIcon(QIcon("C:\\Eseka\\Lauti\\Python\\Gupos de máquinas\\machine.ico"))

        self.layout = QVBoxLayout(self)
        self.tabs = QTabWidget()

        self.layout.addWidget(self.tabs)

        self.tab_grupos = QWidget()
        self.layout_grupos = QVBoxLayout(self.tab_grupos)

        # pestaña distribución
        self.tab_distribucion = VentanaDistribucion()

        # pestaña producción
        self.tab_produccion = TabProduccion(obtener_conexion)
        self.tabs.addTab(self.tab_produccion, "📊 Producción")

        self.tabs.addTab(self.tab_grupos, "🔬 Grupos")
        self.tabs.addTab(self.tab_distribucion, "🎨 Distribución")

        self.tab_offline = TabOffline(obtener_conexion, self.tabs)
        self.tabs.addTab(self.tab_offline, "🔌 Offline")
        self.tabs.currentChanged.connect(self.tab_cambiada)

        self.tab_arp = BuscadorARP()
        self.tabs.addTab(self.tab_arp, "🌐 En arp")

        titulo = QLabel("Grupos de Máquinas por Artículo")
        titulo.setAlignment(Qt.AlignCenter)
        titulo.setStyleSheet("font-size: 18px; font-weight: bold;")
        self.layout_grupos.addWidget(titulo)

        self.tabla = QTableView()
        self.tabla.setAlternatingRowColors(True)
        self.layout_grupos.addWidget(self.tabla)

        self.tabla.setStyleSheet("""
        QTableView::item:selected { background-color: #3891F2; color: white; }
        QTableView::item:selected:!active { background-color: #4B7AC4; color: black; }
        QTableView::item:hover { background-color: #4F90D6; }
        """)

        btn_frame = QHBoxLayout()

        self.btn_refresh = QPushButton("ACTUALIZAR")
        self.btn_ack = QPushButton("REVISADO")
        self.btn_ack_todo = QPushButton("TODO REVISADO")

        btn_frame.addWidget(self.btn_refresh)
        btn_frame.addWidget(self.btn_ack)
        btn_frame.addWidget(self.btn_ack_todo)

        self.layout_grupos.addLayout(btn_frame)

        self.btn_refresh.clicked.connect(self.refrescar)
        self.btn_ack.clicked.connect(self.marcar_revisado)
        self.btn_ack_todo.clicked.connect(self.marcar_todo_revisado)

        self.refrescar()

        self.timer = QTimer(self)
        self.timer.timeout.connect(self.refrescar)
        self.timer.start(60000)
        self.timer_ip = QTimer(self)
        self.timer_ip.timeout.connect(self.verificar_ip)
        self.timer_ip.start(180000)  # 3 minutos

    def verificar_ip(self):
        global ip_nylon_caida
        ip = "172.22.100.252"

        if not ip_en_arp(ip):
            if not ip_nylon_caida:  # Solo avisa la primera vez
                ip_nylon_caida = True
                QMessageBox.warning(
                    self,
                    "¡Servidor de nylon caído!",
                    f"La IP {ip} (PC Nylon) no respondió al ping."
                )
        else:
            ip_nylon_caida = False  # Cuando vuelve, resetea el estado

    def actualizar_icono(self):
        hay_amarillo = False
        model = getattr(self, "modelo", None)
        if model:
            for row in range(model.rowCount()):
                style = model._df.iat[row, 0]
                maquinas_txt = model._df.iat[row, 1]
                current_set = set(int(m.strip()) for m in maquinas_txt.split(",") if m.strip().isdigit())
                prev_set = previous_data.get(style, set())
                if style not in acknowledged_data and current_set != prev_set:
                    hay_amarillo = True
                    break

        if hay_amarillo:
            self.setWindowIcon(QIcon("C:\\Eseka\\Lauti\\Python\\Gupos de máquinas\\machine2.ico"))
        else:
            self.setWindowIcon(QIcon("C:\\Eseka\\Lauti\\Python\\Gupos de máquinas\\machine.ico"))

    def tab_cambiada(self, index):
        widget = self.tabs.widget(index)

        if isinstance(widget, TabOffline):
            widget.limpiar_alerta()

    def refrescar(self):
        global targets_por_style
        targets_por_style = obtener_targets()

        datos = obtener_datos()
        rows = []

        for style in sorted(datos):
            maquinas = datos[style]["maquinas"]
            room = datos[style]["room"]

            if room:
                room = room.strip().upper()
            if room == "HOMBRE":
                room = "ALGODÓN"

            maquinas_txt = ", ".join(str(m) for m in sorted(maquinas)) if maquinas else "(sin máquinas)"
            cantidad = len(maquinas)

            if style not in previous_data:
                previous_data[style] = set()
            if previous_data[style] != maquinas:
                acknowledged_data.discard(style)

            cantidad_anterior = tracked_groups.get(style, 0)

            mostrar = False

            # Caso 1: es un grupo real
            if cantidad > 1:
                mostrar = True

            # Caso 2: antes era grupo y ahora quedó 1
            elif cantidad == 1 and cantidad_anterior > 1:
                if style not in acknowledged_data:
                    mostrar = True

            if mostrar:
                rows.append([style, maquinas_txt, room])

            tracked_groups[style] = cantidad

        df = pd.DataFrame(rows, columns=["Cadena", "Máquinas", "Room"])

        if hasattr(self, "modelo") and self.modelo is not None:
            self.modelo._df = df
            self.modelo.layoutChanged.emit()
        else:
            self.modelo = PandasModel(df)
            self.tabla.setModel(self.modelo)
            self.tabla.resizeColumnsToContents()

        self.actualizar_icono()

    def marcar_revisado(self):
        model = self.tabla.model()
        selected_indexes = self.tabla.selectionModel().selectedRows()

        if not selected_indexes:
            current = self.tabla.currentIndex()
            if current.isValid():
                selected_indexes = [current]

        for idx in selected_indexes:
            style = model._df.iat[idx.row(), 0]
            maquinas_txt = model._df.iat[idx.row(), 1]
            maquinas_set = set(int(m.strip()) for m in maquinas_txt.split(",") if m.strip().isdigit())
            acknowledged_data.add(style)
            previous_data[style] = maquinas_set

        self.refrescar()

    def marcar_todo_revisado(self):
        model = self.tabla.model()
        for row in range(model.rowCount()):
            style = model._df.iat[row, 0]
            maquinas_txt = model._df.iat[row, 1]
            maquinas_set = set(int(m.strip()) for m in maquinas_txt.split(",") if m.strip().isdigit())
            acknowledged_data.add(style)
            previous_data[style] = maquinas_set

        self.refrescar()

    def closeEvent(self, event):
        reply = QMessageBox.question(
            self,
            "Confirmar salida",
            "¿Estás seguro que quieres salir?",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        if reply == QMessageBox.Yes:
            event.accept()
        else:
            event.ignore()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    ventana = VentanaPrincipal()
    ventana.show()
    sys.exit(app.exec())