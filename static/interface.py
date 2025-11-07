import sys
import math
import socketio
from PyQt5.QtWidgets import QApplication, QWidget
from PyQt5.QtGui import QPainter, QColor, QPen, QBrush, QLinearGradient
from PyQt5.QtCore import Qt, QPointF, QTimer
import time

sio = socketio.Client()

MESA_X = 40
MESA_Y = 40
MESA_LARG = 800
MESA_ALT = 400
RAIO_BURACO = 15

class SinucaWidget(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Sinuca Online")
        self.setFixedSize(MESA_X * 2 + MESA_LARG, MESA_Y * 2 + MESA_ALT)

        self.bolas = []              # ← recebe do backend
        self.mouse_pressed = False
        # mouse / tacada
        self.dragging = False
        self.inicioX = 0
        self.inicioY = 0
        self.atualX = 0
        self.atualY = 0
        self.forca = 0

        self.animacoes_queda = {}

        self.prev_pos_branca = None
        self.show()

        self.repaint_timer = QTimer()
        self.repaint_timer.timeout.connect(self.update)
        self.repaint_timer.start(16) 

    def atualizar_estado(self, data):
        # Detecta desaparecimento de bolas comparando comprimento anterior
        prev_len = len(self.bolas)
        new_len = len(data)

        if prev_len > new_len:
            # identificamos índices que desapareceram (assumimos ordem estável do backend)
            # configura animação de queda para cada índice que sumiu
            for idx in range(new_len, prev_len):
                # só inicia animação se índice válido
                self.animacoes_queda[idx] = 10.0  # raio inicial (px)

        # atualiza lista de bolas (recebendo dicts)
        # convertemos um pouco os valores para float por segurança
        converted = []
        for b in data:
            converted.append({
                "x": float(b.get("x", 0)),
                "y": float(b.get("y", 0)),
                "cor": b.get("cor", "branca")
            })
        self.bolas = converted

        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)

        # ==============================
        # ✅ Mesas e buracos
        # ==============================
        self._desenhar_mesa(painter)
        self._desenhar_buracos(painter)

        # ==============================
        # ✅ Bolas com animação
        # ==============================
        self._desenhar_bolas(painter)

        # ==============================
        # ✅ Taco (somente com bola branca parada)
        # ==============================
        if self.bola_branca_parada():
            self._desenhar_taco(painter)

    # ==============================
    # DESENHAR MESA
    # ==============================
    def _desenhar_mesa(self, painter):
        painter.setBrush(QBrush(QColor(0, 120, 0)))          # área verde
        painter.drawRect(40, 40, 760, 360)
        pen = QPen(QColor(120, 70, 20), 20)                  # bordas
        painter.setPen(pen)
        painter.drawRect(40, 40, 820, 420)
    
    # ==============================
    # DESENHAR BURACOS
    # ==============================
    def _desenhar_buracos(self, painter):
        painter.setBrush(QBrush(Qt.black))
        painter.setPen(Qt.NoPen)

        buracos = [
            (50, 50), (480, 50), (850, 50),
            (50, 450), (480, 450), (850, 450)
        ]

        for x, y in buracos:
            painter.drawEllipse(QPointF(x, y), 13, 13)

    # ==============================
    # DESENHAR BOLAS (com animação de queda)
    # ==============================
    def _desenhar_bolas(self, painter):
        painter.setPen(Qt.black)

        for index, bola in enumerate(self.bolas):

            # Animação quando cai no buraco
            if index in self.animacoes_queda:
                self.animacoes_queda[index] -= 0.5
                if self.animacoes_queda[index] <= 1:
                    del self.animacoes_queda[index]
                    continue
                raio = self.animacoes_queda[index]
            else:
                raio = 7  # normal

            cor = self._cor_bola(bola.get("cor", "branca"))
            painter.setBrush(QBrush(cor))

            painter.drawEllipse(QPointF(bola["x"] + 50, bola["y"] + 50), raio, raio)

    # ==============================
    # DESENHAR TACO + FORÇA
    # ==============================
    def _desenhar_taco(self, painter):
        grad = QLinearGradient(self.inicioX, self.inicioY, self.atualX, self.atualY)
        grad.setColorAt(0, QColor(180, 130, 70))
        grad.setColorAt(1, QColor(90, 60, 20))

        pen = QPen(QBrush(grad), 6)
        pen.setCapStyle(Qt.RoundCap)
        painter.setPen(pen)

        dx = self.atualX - self.inicioX
        dy = self.atualY - self.inicioY
        self.forca = min(int(math.sqrt(dx * dx + dy * dy)), 200)

        # Barra de força
        painter.setPen(Qt.NoPen)
        painter.setBrush(QBrush(QColor(255, 0, 0, 200)))
        painter.drawRect(20, 20, self.forca, 12)

        # Linha do taco
        painter.setPen(pen)
        painter.drawLine(self.inicioX, self.inicioY, self.atualX, self.atualY)

    # ==============================
    # COR DA BOLA (função auxiliar)
    # ==============================
    def _cor_bola(self, cor):
        cores = {
            "branca": (255, 255, 255),
            "vermelha": (255, 0, 0),
            "azul": (0, 0, 255)
        }
        return QColor(*cores.get(cor, (255, 255, 255)))

    def bola_branca_parada(self):
        if not self.bolas:
            return False

        bola_branca = next((b for b in self.bolas if b["cor"] == "branca"), None)
        if not bola_branca:
            return False

        # Salva última posição para comparação
        if not hasattr(self, "ultima_posicao_branca"):
            self.ultima_posicao_branca = (bola_branca["x"], bola_branca["y"])
            return False

        prev_x, prev_y = self.ultima_posicao_branca
        atual_x, atual_y = bola_branca["x"], bola_branca["y"]

        # Considera parada se o movimento é praticamente zero
        parada = abs(prev_x - atual_x) < 0.05 and abs(prev_y - atual_y) < 0.05

        # Atualiza para próxima iteração
        self.ultima_posicao_branca = (atual_x, atual_y)

        return parada

    def keyPressEvent(self, event):
        if event.key() == Qt.Key_Space and not self.mouse_pressed:
            self.mouse_pressed = True
            self.forca_acumulada = 0  # reset força
            self.inicio_time = time.time()
            self.update()

    def keyReleaseEvent(self, event):
        if event.key() == Qt.Key_Space and self.mouse_pressed:
            self.mouse_pressed = False

            tempo_pressionado = time.time() - self.inicio_time
            self.forca_acumulada = min(tempo_pressionado * 600, 600)  # Limita força máx.

            # Envia força para backend
            sio.emit("taco", {
                "mouse": {
                    "x": self.atualX,
                    "y": self.atualY,
                    "inicioX": self.inicioX,
                    "inicioY": self.inicioY,
                    "velocidade": self.forca_acumulada
                }
            })

            self.update()

    def mousePressEvent(self, event):
        self.inicioX = event.x()
        self.inicioY = event.y()

    def mouseMoveEvent(self, event):
        if self.mouse_pressed and self.bola_branca_parada():
            self.atualX = event.x()
            self.atualY = event.y()
            self.update()

# ─────────────────────────────────────────
# SOCKET.IO
# ─────────────────────────────────────────

@sio.on("estado")   # <- o nome do evento precisa ser exatamente este
def receber_estado(data):
    # Detecta bola que caiu comparando listas
    if hasattr(widget, "bolas"):
        if len(data) < len(widget.bolas):
            # Identifica qual índice sumiu (animação de queda)
            for index in range(len(data), len(widget.bolas)):
                widget.animacoes_queda[index] = 10  # tamanho inicial da animação

    widget.bolas = data  # Atualiza lista de bolas renderizadas
    widget.update()

@sio.event
def bola_caiu(data):
    id_bola = data["id"]

    # inicia animação
    widget.animacoes_queda[id_bola] = 10

    # remove visualmente da lista (o backend já removeu)
    if id_bola < len(widget.bolas):
        del widget.bolas[id_bola]

    widget.update()



def conectar_socket():
    sio.connect("http://192.168.5.188:5000")
    print("[FRONT] Conectado ao servidor Flask 🟢")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    widget = SinucaWidget()

    conectar_socket()

    sys.exit(app.exec_())
