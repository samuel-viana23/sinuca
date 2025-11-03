import pygame
from pygame.math import Vector2

class Bola:
    def __init__(self, pos, vel, cor):
        self.pos = Vector2(pos)
        self.vel = Vector2(vel)
        self.raio = 10
        self.cor = cor

    def atualizar(self, dt, mesa):
        atrito = 0.5
        if self.vel.length() > 0:
            self.vel -= self.vel.normalize() * atrito * dt
            if self.vel.length() < 0.01:
                self.vel = Vector2(0, 0)
        self.pos += self.vel * dt
        mesa.colidir_borda(self)

    def desenhar(self, tela):
        pygame.draw.circle(tela, self.cor, self.pos, self.raio)