import sys
import subprocess
import re
import json
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLineEdit, QPushButton, QLabel, QScrollArea, QFrame
)
from PySide6.QtCore import Qt

ARCHIVO_MAPEO = "C:\\Eseka\\Lauti\\Python\\arp\\map_maquinas.json"

GRUPOS = [
    ("301-322",  301,  322),
    ("323-344",  323,  344),
    ("345-366",  345,  366),
    ("367-388",  367,  388),
    ("389-408",  389,  408),
    ("409-428",  409,  428),
    ("429-450",  429,  450),
    ("1001-1037", 1001, 1037),
]

class BuscadorARP(QWidget):

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Buscar Máquina en ARP")
        self.resize(450, 600)

        layout = QVBoxLayout(self)
        layout.setSpacing(10)

        # --- Botones de grupos ---
        fila_titulo = QHBoxLayout()
        fila_titulo.addWidget(QLabel("Grupos predefinidos:"))
        btn_actualizar = QPushButton("🔄 Actualizar ARP")
        btn_actualizar.setFixedWidth(130)
        btn_actualizar.clicked.connect(self._refrescar_arp)
        fila_titulo.addWidget(btn_actualizar)
        layout.addLayout(fila_titulo)
        self.label_ultimo_update = QLabel("")  # ← agregar esto
        self.label_ultimo_update.setStyleSheet("color: gray; font-size: 11px;")
        layout.addWidget(self.label_ultimo_update)

        grid = QGridLayout()
        grid.setSpacing(6)
        for i, (label, desde, hasta) in enumerate(GRUPOS):
            btn = QPushButton(label)
            btn.setFixedHeight(36)
            btn.clicked.connect(lambda _, d=desde, h=hasta: self.buscar_por_rango(d, h))
            grid.addWidget(btn, i // 4, i % 4)
        layout.addLayout(grid)

        # --- Separador ---
        separador = QFrame()
        separador.setFrameShape(QFrame.HLine)
        separador.setFrameShadow(QFrame.Sunken)
        layout.addWidget(separador)

        # --- Búsqueda individual ---
        layout.addWidget(QLabel("Búsqueda individual:"))
        fila_individual = QHBoxLayout()
        self.input_maquina = QLineEdit()
        self.input_maquina.setPlaceholderText("Número de máquina")
        boton_individual = QPushButton("Buscar")
        boton_individual.setFixedWidth(80)
        boton_individual.clicked.connect(self.buscar_individual)
        self.input_maquina.returnPressed.connect(self.buscar_individual)
        fila_individual.addWidget(self.input_maquina)
        fila_individual.addWidget(boton_individual)
        layout.addLayout(fila_individual)

        # --- Búsqueda por rango manual ---
        layout.addWidget(QLabel("Rango manual:"))
        rango_layout = QHBoxLayout()
        self.input_desde = QLineEdit()
        self.input_desde.setPlaceholderText("Desde")
        self.input_hasta = QLineEdit()
        self.input_hasta.setPlaceholderText("Hasta")
        boton_rango = QPushButton("Buscar")
        boton_rango.setFixedWidth(80)
        boton_rango.clicked.connect(self.buscar_rango_manual)
        rango_layout.addWidget(self.input_desde)
        rango_layout.addWidget(QLabel("→"))
        rango_layout.addWidget(self.input_hasta)
        rango_layout.addWidget(boton_rango)
        layout.addLayout(rango_layout)

        # --- Resultado con scroll ---
        self.resultado = QLabel("")
        self.resultado.setAlignment(Qt.AlignTop | Qt.AlignLeft)
        self.resultado.setWordWrap(True)
        self.resultado.setContentsMargins(6, 6, 6, 6)

        scroll = QScrollArea()
        scroll.setWidget(self.resultado)
        scroll.setWidgetResizable(True)
        layout.addWidget(scroll)

        self.mapa_maquinas = self.cargar_mapeo()
        self.ips_arp = self.obtener_ips_arp()

    def cargar_mapeo(self):
        try:
            with open(ARCHIVO_MAPEO, "r") as f:
                return json.load(f)
        except:
            return {}

    def buscar_individual(self):
        maquina = self.input_maquina.text().strip()
        if maquina not in self.mapa_maquinas:
            self.resultado.setText("Máquina no encontrada en mapa")
            return
        ip = self.mapa_maquinas[maquina]
        if ip in self.ips_arp:
            self.resultado.setText(f"Máq. {maquina} ({ip}) está en ARP ✅")
        else:
            self.resultado.setText(f"Máq. {maquina} ({ip}) NO está en ARP ❌")

    def buscar_rango_manual(self):
        try:
            desde = int(self.input_desde.text().strip())
            hasta = int(self.input_hasta.text().strip())
        except ValueError:
            self.resultado.setText("❌ Ingresá números válidos en el rango")
            return
        if desde > hasta:
            self.resultado.setText("❌ 'Desde' no puede ser mayor que 'Hasta'")
            return
        self.buscar_por_rango(desde, hasta)

    def buscar_por_rango(self, desde, hasta):
        lineas = []
        en_arp = 0
        no_en_arp = 0
        sin_mapeo = 0

        for numero in range(desde, hasta + 1):
            maquina = str(numero)
            if maquina not in self.mapa_maquinas:
                lineas.append(f"Máq. {maquina} → sin mapeo ⚠️")
                sin_mapeo += 1
                continue
            ip = self.mapa_maquinas[maquina]
            if ip in self.ips_arp:
                lineas.append(f"Máq. {maquina} ({ip}) ✅")
                en_arp += 1
            else:
                lineas.append(f"Máq. {maquina} ({ip}) ❌")
                no_en_arp += 1

        resumen = (
            f"Rango {desde}–{hasta}\n"
            f"✅ {en_arp} en ARP   ❌ {no_en_arp} ausentes   ⚠️ {sin_mapeo} sin mapeo\n"
            f"{'─' * 38}\n"
        )
        self.resultado.setText(resumen + "\n".join(lineas))
    def _refrescar_arp(self):
        from datetime import datetime
        self.ips_arp = self.obtener_ips_arp()
        hora = datetime.now().strftime("%H:%M")
        self.label_ultimo_update.setText(f"Actualizado: {hora}")

    @staticmethod
    def obtener_ips_arp():
        result = subprocess.run(
            ["arp", "-a"],
            capture_output=True,
            text=True,
           # creationflags=subprocess.CREATE_NO_WINDOW  # ← esto es todo
        )
        ips = re.findall(r"\d+\.\d+\.\d+\.\d+", result.stdout)
        return set(ips)
