import pygame
from pygame.math import Vector2

class Taco:
    def __init__(self):
        self.arrastando = False
        self.pos_inicial = None
        self.velocidade_mouse = Vector2(0, 0)
        self.tempo_inicial = 0
        self.forca_maxima = 800  # força máxima permitida

    def processar_evento(self, evento, bola):
        if evento.type == pygame.MOUSEBUTTONDOWN:
            self.arrastando = True
            self.pos_inicial = Vector2(pygame.mouse.get_pos())
            self.tempo_inicial = pygame.time.get_ticks()

        elif evento.type == pygame.MOUSEBUTTONUP and self.arrastando:
            self.arrastando = False
            pos_final = Vector2(pygame.mouse.get_pos())
            tempo_final = pygame.time.get_ticks()
            delta_t = max((tempo_final - self.tempo_inicial) / 1000, 0.01)

            deslocamento = pos_final - self.pos_inicial
            velocidade = deslocamento / delta_t

            direcao_mouse = deslocamento.normalize()
            direcao_bola = (bola.pos - pos_final).normalize()
            alinhamento = direcao_mouse.dot(direcao_bola)

            if alinhamento > 0.5:  # só empurra se estiver alinhado com a bola
                intensidade = min(velocidade.length(), self.forca_maxima)
                bola.vel = direcao_bola * intensidade * 0.01

    def desenhar(self, tela, bola):
        if self.arrastando:
            mouse = Vector2(pygame.mouse.get_pos())
            direcao = bola.pos - mouse
            comprimento = min(direcao.length(), 100)
            ponta = bola.pos + direcao.normalize() * comprimento

            pygame.draw.line(tela, (200, 180, 100), bola.pos, ponta, 6)
            pygame.draw.circle(tela, (255, 220, 150), ponta, 5)