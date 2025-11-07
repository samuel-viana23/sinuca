import pygame
from pygame.math import Vector2

class Mesa:
    def __init__(self, largura, altura):
        self.largura = largura
        self.altura = altura
        self.raio_buraco = 15
        self.margem_buraco = self.raio_buraco  # sem +2 para ficar rente

        # limites internos da área jogável
        self.limite_esquerdo = 1
        self.limite_direito = self.largura 
        self.limite_superior = 1
        self.limite_inferior = self.altura

        # buracos nos cantos e laterais
        self.buracos = [
            Vector2(2, 2),
            Vector2((self.largura / 2) + 2, 2),
            Vector2(self.largura + 2, 2),
            Vector2(2, self.altura + 2),
            Vector2((self.largura / 2) + 2, self.altura + 2),
            Vector2(self.largura + 4, self.altura + 4),
        ]


    def colidir_borda(self, bola):
        if bola.pos.x - bola.raio < self.limite_esquerdo:
            bola.pos.x = self.limite_esquerdo + bola.raio
            bola.vel.x *= -1
        elif bola.pos.x + bola.raio > self.limite_direito:
            bola.pos.x = self.limite_direito - bola.raio
            bola.vel.x *= -1

        if bola.pos.y - bola.raio < self.limite_superior:
            bola.pos.y = self.limite_superior + bola.raio
            bola.vel.y *= -1
        elif bola.pos.y + bola.raio > self.limite_inferior:
            bola.pos.y = self.limite_inferior - bola.raio
            bola.vel.y *= -1

        # reforça repulsão mínima
        if abs(bola.vel.x) < 0.1:
            bola.vel.x = -0.5
        if abs(bola.vel.y) < 0.1:
            bola.vel.y = -0.5

    def verificar_buracos(self, bola):
        for buraco in self.buracos:
            if bola.pos.distance_to(buraco) <= self.raio_buraco - bola.raio / 2:
                return True
        return False

    def desenhar(self, tela):
        # mesa
        pygame.draw.rect(tela, (50, 50, 50), (0, 0, self.largura, self.altura), self.borda)

        # # buracos
        # for buraco in self.buracos:
        #     pygame.draw.circle(tela, (0, 0, 0), (int(buraco.x), int(buraco.y)), self.raio_buraco)