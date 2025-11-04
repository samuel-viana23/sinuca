from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit
from engine.ball import Bola
from engine.table import Mesa
from engine.sticky import Taco
from engine.fisica import aplicar_atrito, detectar_colisao, resolver_colisao
import eventlet
import time
import pygame

app = Flask(__name__, static_folder="sinuca-react/build", static_url_path="/")
socketio = SocketIO(app, cors_allowed_origins="*")

mesa = Mesa(800, 400)
bolas = [
    Bola((400, 200), (0, 0), "branca"),   # bola branca (interativa)
    Bola((10, 180), (0, 0), "vermelha"),
    Bola((10, 200), (0, 0), "vermelha"),
    Bola((180, 10), (0, 0), "vermelha"),
    Bola((180, 390), (0, 0), "vermelha"),
    Bola((790, 200), (0, 0), "azul"),
    Bola((790, 195), (0, 0), "azul"),
    Bola((600, 390), (0, 0), "azul"),
    Bola((600, 10), (0, 0), "azul"),
]
taco = Taco()

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def static_proxy(path):
    return send_from_directory(app.static_folder, path)

@socketio.on("taco")
def aplicar_taco(data):
    # print("Dados recebidos do cliente:", data)
    try:
        x = float(data["mouse"]["x"])
        y = float(data["mouse"]["y"])
        inicio_x = float(data["mouse"]["inicioX"])
        inicio_y = float(data["mouse"]["inicioY"])
        velocidade = float(data["mouse"]["velocidade"])
    except (KeyError, ValueError) as e:
        print("Erro ao processar dados do taco:", e)
        return

    deslocamento = pygame.math.Vector2(x, y) - pygame.math.Vector2(inicio_x, inicio_y)
    if deslocamento.length() == 0:
        return  # evita divisão por zero

    direcao = -deslocamento.normalize()
    intensidade = min(velocidade, 1000)
    bola_branca = next((b for b in bolas if getattr(b, "cor", "") == "branca"), None)
    if bola_branca:
        bola_branca.vel = direcao * intensidade * 8

def atualizar_jogo():
    """Loop de física e envio de estado para clientes"""
    fps = 60
    dt = 1 / fps
    while True:
        for bola in bolas[:]:  # cópia para permitir remoção
            bola.vel = aplicar_atrito(bola.vel, atrito=80, dt=dt)
            bola.pos += bola.vel * dt
            mesa.colidir_borda(bola)

            if mesa.verificar_buracos(bola):
                bolas.remove(bola)
                continue

        for i in range(len(bolas)):
            for j in range(i + 1, len(bolas)):
                if detectar_colisao(bolas[i], bolas[j]):
                    resolver_colisao(bolas[i], bolas[j])

        estado = [{"x": b.pos.x, "y": b.pos.y, "cor": getattr(b, "cor", "branca")} for b in bolas]
        socketio.emit("estado", estado)
        eventlet.sleep(dt)

if __name__ == "__main__":
    socketio.start_background_task(atualizar_jogo)
    socketio.run(app, host="0.0.0.0", port=5000)