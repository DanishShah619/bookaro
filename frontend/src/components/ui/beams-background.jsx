import { useEffect, useRef } from "react";

function createBeam(width, height) {
  const angle = -35 + Math.random() * 10;
  return {
    x: Math.random() * width * 1.5 - width * 0.25,
    y: Math.random() * height * 1.5 - height * 0.25,
    width: 40 + Math.random() * 80,
    length: height * 2.5,
    angle: angle,
    speed: 0.5 + Math.random() * 1.0,
    opacity: 0.18 + Math.random() * 0.22,
    hue: 190 + Math.random() * 70,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.015 + Math.random() * 0.02,
  };
}

export function BeamsBackground({ className = "", children, intensity = "strong" }) {
  const canvasRef = useRef(null);
  const beamsRef = useRef([]);
  const animationFrameRef = useRef(0);
  const MINIMUM_BEAMS = 20;

  const opacityMap = {
    subtle: 0.65,
    medium: 0.85,
    strong: 1.1,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);

      const total = Math.round(MINIMUM_BEAMS * 1.8);
      beamsRef.current = Array.from({ length: total }, () => createBeam(w, h));
    };

    resize();
    window.addEventListener("resize", resize);

    function resetBeam(beam, index, total) {
      const cols = 4;
      const col = index % cols;
      const spacing = window.innerWidth / cols;
      beam.y = window.innerHeight + 150;
      beam.x = col * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.6;
      beam.width = 50 + Math.random() * 80;
      beam.speed = 0.4 + Math.random() * 0.6;
      beam.hue = 190 + (index * 70) / total;
      beam.opacity = 0.15 + Math.random() * 0.18;
      return beam;
    }

    function drawBeam(ctx, beam) {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);

      const alpha = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * opacityMap[intensity];

      const g = ctx.createLinearGradient(0, 0, 0, beam.length);
      g.addColorStop(0,   `hsla(${beam.hue}, 90%, 70%, 0)`);
      g.addColorStop(0.1, `hsla(${beam.hue}, 90%, 70%, ${alpha * 0.5})`);
      g.addColorStop(0.4, `hsla(${beam.hue}, 90%, 70%, ${alpha})`);
      g.addColorStop(0.6, `hsla(${beam.hue}, 90%, 70%, ${alpha})`);
      g.addColorStop(0.9, `hsla(${beam.hue}, 90%, 70%, ${alpha * 0.5})`);
      g.addColorStop(1,   `hsla(${beam.hue}, 90%, 70%, 0)`);

      ctx.fillStyle = g;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      ctx.restore();
    }

    function animate() {
      if (!canvas || !ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.filter = "blur(22px)";

      const total = beamsRef.current.length;
      beamsRef.current.forEach((beam, i) => {
        beam.y -= beam.speed;
        beam.pulse += beam.pulseSpeed;
        if (beam.y + beam.length < -100) resetBeam(beam, i, total);
        drawBeam(ctx, beam);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [intensity]);

  return (
    <div className={`relative w-full ${className}`} style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      {/* Fixed canvas — always covers the viewport */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 0,
          filter: "blur(14px)",
        }}
      />

      {/* Pulsing overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 1,
          background: "rgba(10,10,10,0.35)",
        }}
      />

      {/* Page content on top */}
      <div style={{ position: "relative", zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}
