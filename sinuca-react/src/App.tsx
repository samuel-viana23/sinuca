import React, { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const socket = io("http://192.168.5.188:5000");

interface Bola {
  x: number;
  y: number;
  cor: "branca" | "vermelha" | "azul";
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bolas, setBolas] = useState<Bola[]>([]);
  const [mostrarTaco, setMostrarTaco] = useState(true);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [ultimaPosicao, setUltimaPosicao] = useState<Bola | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [posInicial, setPosInicial] = useState<{ x: number; y: number } | null>(null);
  const [tempoInicial, setTempoInicial] = useState<number>(0);

  const bolaParada = (bola: Bola): boolean => {
    if (!ultimaPosicao) return true;
    const dx = bola.x - ultimaPosicao.x;
    const dy = bola.y - ultimaPosicao.y;
    const velocidade = Math.sqrt(dx * dx + dy * dy);
    return velocidade < 0.5;
  };

  const desenhar = useCallback((estado: Bola[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#006400";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // desenha todas as bolas
    estado.forEach((bola) => {
      ctx.beginPath();
      ctx.arc(bola.x, bola.y, 10, 0, 2 * Math.PI);

      switch (bola.cor) {
        case "branca":
          ctx.fillStyle = "white";
          break;
        case "vermelha":
          ctx.fillStyle = "red";
          break;
        case "azul":
          ctx.fillStyle = "blue";
          break;
        default:
          ctx.fillStyle = "gray";
      }

      ctx.fill();
    });

    const bolaBranca = estado.find((b) => b.cor === "branca");
    if (!bolaBranca) return;

    // só desenha o taco se permitido e a bola estiver parada
    if (mostrarTaco && bolaParada(bolaBranca)) {
      let dirX: number, dirY: number;

      if (arrastando && posInicial) {
        // direção fixa durante o arrasto
        const dx = bolaBranca.x - posInicial.x;
        const dy = bolaBranca.y - posInicial.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        dirX = dx / dist;
        dirY = dy / dist;
      } else if (mousePos) {
        // direção livre fora do arrasto
        const dx = bolaBranca.x - mousePos.x;
        const dy = bolaBranca.y - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        dirX = dx / dist;
        dirY = dy / dist;
      } else {
        return; // sem referência de direção
      }

      const distanciaMinima = 20;
      const comprimento = 120;
      const pontaX = bolaBranca.x - dirX * distanciaMinima;
      const pontaY = bolaBranca.y - dirY * distanciaMinima;
      const baseX = pontaX - dirX * comprimento;
      const baseY = pontaY - dirY * comprimento;

      // sombra
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(pontaX + 3, pontaY + 3);
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 8;
      ctx.stroke();

      // taco
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(pontaX, pontaY);
      ctx.strokeStyle = "#caa472";
      ctx.lineWidth = 6;
      ctx.stroke();

      // ponta
      ctx.beginPath();
      ctx.arc(pontaX, pontaY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#4682B4";
      ctx.fill();
    }
  }, [mostrarTaco, mousePos, arrastando, posInicial]);

  useEffect(() => {
    socket.on("estado", (estado: Bola[]) => {
      if (estado.length > 0) {
        const bolaBranca = estado.find((b) => b.cor === "branca");
        if (bolaBranca) {
          setMostrarTaco(bolaParada(bolaBranca));
          setUltimaPosicao(bolaBranca);
        }
      }
      setBolas(estado);
      desenhar(estado);
    });
  }, [desenhar]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    setPosInicial({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTempoInicial(performance.now());
    setArrastando(true);
    setMostrarTaco(false);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const posFinal = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const tempoFinal = performance.now();
    setArrastando(false);

    if (posInicial) {
      const dx = posInicial.x - posFinal.x;
      const dy = posInicial.y - posFinal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dt = Math.max((tempoFinal - tempoInicial) / 1000, 2);
      const velocidade = dist / dt;

      socket.emit("taco", {
        mouse: {
          x: posFinal.x,
          y: posFinal.y,
          velocidade: velocidade,
          inicioX: posInicial.x,
          inicioY: posInicial.y,
        },
      });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={(e) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      style={{ display: "block", margin: "auto", background: "#006400" }}
    />
  );
}

export default App;