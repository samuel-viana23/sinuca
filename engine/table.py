import pygame

class Mesa:
    def __init__(self, largura, altura):
        self.largura = largura
        self.altura = altura
        self.borda = 10

    def colidir_borda(self, bola):
        if bola.pos.x - bola.raio < self.borda or bola.pos.x + bola.raio > self.largura - self.borda:
            bola.vel.x *= -1
        if bola.pos.y - bola.raio < self.borda or bola.pos.y + bola.raio > self.altura - self.borda:
            bola.vel.y *= -1

    def desenhar(self, tela):
        pygame.draw.rect(tela, (50, 50, 50), (0, 0, self.largura, self.altura), self.borda)