from pygame.math import Vector2
import math

def aplicar_atrito(velocidade, atrito, dt):
    """Reduz a velocidade com base no atrito e tempo."""
    if velocidade.length() > 0:
        desaceleracao = velocidade.normalize() * atrito * dt
        velocidade -= desaceleracao
        if velocidade.length() < 0.01:
            velocidade = Vector2(0, 0)
    return velocidade

def detectar_colisao(bola1, bola2):
    """Verifica se duas bolas colidiram."""
    distancia = bola1.pos.distance_to(bola2.pos)
    return distancia < bola1.raio + bola2.raio

def resolver_colisao(bola1, bola2):
    """Aplica física de colisão elástica entre duas bolas."""
    direcao = bola1.pos - bola2.pos
    distancia = direcao.length()

    if distancia == 0:
        return

    # Normalização
    normal = direcao / distancia
    tangente = Vector2(-normal.y, normal.x)

    # Projeções
    v1n = normal.dot(bola1.vel)
    v1t = tangente.dot(bola1.vel)
    v2n = normal.dot(bola2.vel)
    v2t = tangente.dot(bola2.vel)

    # Troca de velocidades normais (colisão elástica)
    v1n_final = v2n
    v2n_final = v1n

    # Reconstrução dos vetores
    bola1.vel = normal * v1n_final + tangente * v1t
    bola2.vel = normal * v2n_final + tangente * v2t

    # Separação das bolas para evitar sobreposição
    sobreposicao = bola1.raio + bola2.raio - distancia
    bola1.pos += normal * (sobreposicao / 2)
    bola2.pos -= normal * (sobreposicao / 2)