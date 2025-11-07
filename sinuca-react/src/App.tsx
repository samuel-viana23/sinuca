import React, { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

// const socket = io("http://192.168.100.150:5000");
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
  const [forca, setForca] = useState(0);
  const [carregandoForca, setCarregandoForca] = useState(false);
  const [animacaoTaco, setAnimacaoTaco] = useState<"recuo" | "impacto" | null>(null);
  const [frameTaco, setFrameTaco] = useState(0);
  const [posicaoTacoFixa, setPosicaoTacoFixa] = useState<{ x: number; y: number } | null>(null);
  const bolaParada = (bola: Bola): boolean => {
    if (!ultimaPosicao) return true;
    const dx = bola.x - ultimaPosicao.x;
    const dy = bola.y - ultimaPosicao.y;
    const velocidade = Math.sqrt(dx * dx + dy * dy);
    return velocidade < 0.5;
  };
  function desenharBuracoArco(ctx: CanvasRenderingContext2D, x: number, y: number, raio: number, direcao: "canto-esq-sup" | "canto-dir-sup" | "canto-esq-inf" | "canto-dir-inf" | "meio-sup" | "meio-inf") {
    ctx.beginPath();
    switch (direcao) {
      case "canto-esq-sup":
        ctx.arc(x, y, raio, 0, Math.PI / 2); // canto superior esquerdo
        break;
      case "canto-dir-sup":
        ctx.arc(x, y, raio, Math.PI / 2, Math.PI); // canto superior direito
        break;
      case "canto-esq-inf":
        ctx.arc(x, y, raio, -Math.PI / 2, 0); // canto inferior esquerdo
        break;
      case "canto-dir-inf":
        ctx.arc(x, y, raio, Math.PI, 3 * Math.PI / 2); // canto inferior direito
        break;
      case "meio-sup":
        ctx.arc(x, y, raio, 0, Math.PI); // arco para cima
        break;
      case "meio-inf":
        ctx.arc(x, y, raio, Math.PI, 2 * Math.PI); // arco para baixo
        break;
    }
    ctx.lineTo(x, y); // fecha o arco
    ctx.fillStyle = "black";
    ctx.fill();
  }
  const desenhar = useCallback(
    (estado: Bola[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const margemBuraco = 2;
      ctx.fillStyle = "#006400";
      ctx.fillRect(margemBuraco, margemBuraco, canvas.width - margemBuraco * 2, canvas.height - margemBuraco * 2);
      const raioBuraco = 15;
      desenharBuracoArco(ctx, 0, 0, raioBuraco, "canto-esq-sup");
      desenharBuracoArco(ctx, canvas.width, 0, raioBuraco, "canto-dir-sup");
      desenharBuracoArco(ctx, 0, canvas.height, raioBuraco, "canto-esq-inf");
      desenharBuracoArco(ctx, canvas.width, canvas.height, raioBuraco, "canto-dir-inf");
      desenharBuracoArco(ctx, canvas.width / 2, 0, raioBuraco, "meio-sup");
      desenharBuracoArco(ctx, canvas.width / 2, canvas.height, raioBuraco, "meio-inf");
      estado.forEach((bola) => {
        ctx.beginPath();
        ctx.arc(bola.x, bola.y, 10, 0, 2 * Math.PI);
        ctx.fillStyle =
          bola.cor === "branca" ? "white" : bola.cor === "vermelha" ? "red" : "blue";
        ctx.fill();
      });
      const bolaBranca = estado.find((b) => b.cor === "branca");
      if (!bolaBranca) return;
      if (mostrarTaco && bolaParada(bolaBranca) && mousePos) {
        const dx = bolaBranca.x - mousePos.x;
        const dy = bolaBranca.y - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / dist;
        const dirY = dy / dist;
        const distanciaMinima = 20;
        const comprimento = 120;
        const pontaX = bolaBranca.x - dirX * distanciaMinima;
        const pontaY = bolaBranca.y - dirY * distanciaMinima;
        const baseX = pontaX - dirX * comprimento;
        const baseY = pontaY - dirY * comprimento;
        if (animacaoTaco) {
          const deslocamento = 100;
          const animX = baseX + dirX * deslocamento;
          const animY = baseY + dirY * deslocamento;
          ctx.beginPath();
          ctx.moveTo(animX, animY);
          ctx.lineTo(pontaX, pontaY);
          ctx.strokeStyle = "#FFD700"; // cor de destaque
          ctx.lineWidth = 8;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(pontaX + 3, pontaY + 3);
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(pontaX, pontaY);
        ctx.strokeStyle = "#caa472";
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pontaX, pontaY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "#4682B4";
        ctx.fill();
      }
      if (carregandoForca) {
        ctx.fillStyle = "gray";
        ctx.fillRect(20, canvas.height - 30, 200, 20);
        ctx.fillStyle = "orange";
        ctx.fillRect(20, canvas.height - 30, (forca / 100) * 200, 20);
        ctx.strokeStyle = "black";
        ctx.strokeRect(20, canvas.height - 30, 200, 20);
      }
    },
    [mostrarTaco, mousePos, carregandoForca, forca]
  );
  useEffect(() => {
    if (!animacaoTaco || !posicaoTacoFixa || !mousePos) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const totalFramesRecuo = 20;
    const totalFramesImpacto = 10;
    const dx = posicaoTacoFixa.x - mousePos.x;
    const dy = posicaoTacoFixa.y - mousePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / dist;
    const dirY = dy / dist;
    const distanciaMinima = 20;
    const comprimento = 120;
    const animate = () => {
      let deslocamento = 0;
      if (animacaoTaco === "recuo") {
        deslocamento = frame * 3;
      } else if (animacaoTaco === "impacto") {
        deslocamento = 60 - frame * 6;
      }
      const pontaX = posicaoTacoFixa.x - dirX * distanciaMinima;
      const pontaY = posicaoTacoFixa.y - dirY * distanciaMinima;
      const baseX = pontaX - dirX * (comprimento + deslocamento);
      const baseY = pontaY - dirY * (comprimento + deslocamento);
      desenhar(bolas);
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(pontaX, pontaY);
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 8;
      ctx.stroke();
      frame++;
      if (animacaoTaco === "recuo" && frame >= totalFramesRecuo) {
        setAnimacaoTaco("impacto");
        setFrameTaco(0);
      } else if (animacaoTaco === "impacto" && frame >= totalFramesImpacto) {
        setAnimacaoTaco(null);
        setFrameTaco(0);
        setPosicaoTacoFixa(null);
        socket.emit("taco", {
          mouse: {
            x: posicaoTacoFixa.x - dirX * 10,
            y: posicaoTacoFixa.y - dirY * 10,
            velocidade: forca,
            inicioX: posicaoTacoFixa.x,
            inicioY: posicaoTacoFixa.y,
          },
        });
        setForca(0);
      } else {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [animacaoTaco, posicaoTacoFixa, mousePos, bolas, desenhar, forca]);
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !carregandoForca) {
        setCarregandoForca(true);
        setForca(0);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && carregandoForca && ultimaPosicao && mousePos) {
        setCarregandoForca(false);
        iniciarAnimacaoTaco(
          { x: ultimaPosicao.x, y: ultimaPosicao.y },
          mousePos,
          forca
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [carregandoForca, mousePos, ultimaPosicao, forca]);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (carregandoForca) {
      interval = setInterval(() => {
        setForca((prev) => {
          const novaForca = Math.min(prev + 4, 100);
          return novaForca;
        });
      }, 80); // velocidade de carga
    }
    return () => clearInterval(interval);
  }, [carregandoForca]);

  const iniciarAnimacaoTaco = (
    posicao: { x: number; y: number },
    mouse: { x: number; y: number },
    forcaAtual: number
  ) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dx = posicao.x - mouse.x;
    const dy = posicao.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / dist;
    const dirY = dy / dist;
    const distanciaMinima = 20;
    const comprimento = 120;
    let frame = 0;
    let fase: "recuo" | "impacto" = "recuo";
    const totalFramesRecuo = 20;
    const totalFramesImpacto = 10;
    const animar = () => {
      let deslocamento = 0;

      if (fase === "recuo") {
        deslocamento = frame * 2; // recuo suave
      } else {
        deslocamento = 40 - frame * 4; // avanço rápido
      }
      const pontaX = posicao.x - dirX * distanciaMinima;
      const pontaY = posicao.y - dirY * distanciaMinima;
      const offsetX = dirX * deslocamento;
      const offsetY = dirY * deslocamento;
      const baseX = pontaX - dirX * comprimento + offsetX;
      const baseY = pontaY - dirY * comprimento + offsetY;
      const pontaAnimX = pontaX + offsetX;
      const pontaAnimY = pontaY + offsetY;
      desenhar(bolas);
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(pontaAnimX + 3, pontaAnimY + 3);
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(pontaAnimX, pontaAnimY);
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pontaAnimX, pontaAnimY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#4682B4";
      ctx.fill();
      frame++;
      if (fase === "recuo" && frame >= totalFramesRecuo) {
        fase = "impacto";
        frame = 0;
        requestAnimationFrame(animar);
      } else if (fase === "impacto" && frame >= totalFramesImpacto) {
        desenhar(bolas); // limpa taco
        socket.emit("taco", {
          mouse: {
            x: posicao.x - dirX * 10,
            y: posicao.y - dirY * 10,
            velocidade: forcaAtual,
            inicioX: posicao.x,
            inicioY: posicao.y,
          },
        });
        setForca(0);
      } else {
        requestAnimationFrame(animar);
      }
    };
    requestAnimationFrame(animar);
  };
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      onMouseMove={(e) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setMousePos(pos);
        desenhar(bolas);
      }}
      style={{ display: "block", margin: "auto", background: "#006400" }}
    />
  );
}

export default App;