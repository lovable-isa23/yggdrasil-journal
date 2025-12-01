import { useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  pulsePhase: number;
  pulseSpeed: number;
}

interface Connection {
  source: number;
  target: number;
  strength: number;
}

const COLORS = {
  sage: "hsl(100, 25%, 50%)",
  orange: "hsl(18, 55%, 55%)",
  brown: "hsl(25, 45%, 40%)",
  teal: "hsl(180, 40%, 55%)",
};

export const NeuralNetworkAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<Node[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const isMobile = useIsMobile();

  const initializeNetwork = useCallback((width: number, height: number) => {
    const coreNodeCount = isMobile ? 18 : 35;
    const outerNodeCount = isMobile ? 12 : 25;
    const nodes: Node[] = [];
    const colorArray = Object.values(COLORS);

    // Create core nodes clustered around center
    for (let i = 0; i < coreNodeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * Math.min(width, height) * 0.35 + 50;
      const centerX = width / 2;
      const centerY = height / 2;
      
      nodes.push({
        x: centerX + Math.cos(angle) * distance + (Math.random() - 0.5) * 100,
        y: centerY + Math.sin(angle) * distance + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 4 + 3,
        color: colorArray[Math.floor(Math.random() * colorArray.length)],
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02,
      });
    }

    // Create peripheral nodes near edges and corners
    for (let i = 0; i < outerNodeCount; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x: number, y: number;
      
      const margin = 80;
      const outerZone = 0.25;
      
      switch (edge) {
        case 0: // Top
          x = Math.random() * width;
          y = margin + Math.random() * height * outerZone;
          break;
        case 1: // Right
          x = width - margin - Math.random() * width * outerZone;
          y = Math.random() * height;
          break;
        case 2: // Bottom
          x = Math.random() * width;
          y = height - margin - Math.random() * height * outerZone;
          break;
        case 3: // Left
        default:
          x = margin + Math.random() * width * outerZone;
          y = Math.random() * height;
          break;
      }
      
      nodes.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 3 + 2,
        color: colorArray[Math.floor(Math.random() * colorArray.length)],
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.015,
      });
    }

    // Create connections based on proximity
    const connections: Connection[] = [];
    const maxDistance = isMobile ? 120 : 150;
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < maxDistance && Math.random() > 0.3) {
          connections.push({
            source: i,
            target: j,
            strength: 1 - distance / maxDistance,
          });
        }
      }
    }

    nodesRef.current = nodes;
    connectionsRef.current = connections;
  }, [isMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      initializeNetwork(window.innerWidth, window.innerHeight);
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    let time = 0;

    const animate = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      ctx.clearRect(0, 0, width, height);
      
      const nodes = nodesRef.current;
      const connections = connectionsRef.current;

      // Update node positions with gentle floating
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        node.pulsePhase += node.pulseSpeed;

        // Soft boundary bounce
        const margin = 50;
        if (node.x < margin || node.x > width - margin) {
          node.vx *= -0.8;
          node.x = Math.max(margin, Math.min(width - margin, node.x));
        }
        if (node.y < margin || node.y > height - margin) {
          node.vy *= -0.8;
          node.y = Math.max(margin, Math.min(height - margin, node.y));
        }

        // Add gentle random movement
        node.vx += (Math.random() - 0.5) * 0.02;
        node.vy += (Math.random() - 0.5) * 0.02;
        
        // Damping
        node.vx *= 0.99;
        node.vy *= 0.99;
      });

      // Draw connections with flowing effect
      connections.forEach((conn) => {
        const source = nodes[conn.source];
        const target = nodes[conn.target];
        
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Update connection strength based on distance
        conn.strength = Math.max(0, 1 - distance / 150);
        
        if (conn.strength > 0) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          
          const gradient = ctx.createLinearGradient(
            source.x, source.y, target.x, target.y
          );
          gradient.addColorStop(0, `hsla(25, 45%, 40%, ${conn.strength * 0.3})`);
          gradient.addColorStop(0.5, `hsla(100, 25%, 50%, ${conn.strength * 0.4})`);
          gradient.addColorStop(1, `hsla(18, 55%, 55%, ${conn.strength * 0.3})`);
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = conn.strength * 2;
          ctx.stroke();

          // Draw flowing particles along strong connections
          if (conn.strength > 0.5 && !isMobile) {
            const particlePos = ((time * 0.02) + conn.source * 0.1) % 1;
            const px = source.x + dx * particlePos;
            const py = source.y + dy * particlePos;
            
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(100, 25%, 60%, ${conn.strength * 0.8})`;
            ctx.fill();
          }
        }
      });

      // Draw nodes with pulsing glow
      nodes.forEach((node) => {
        const pulseScale = 1 + Math.sin(node.pulsePhase) * 0.15;
        const glowRadius = node.radius * pulseScale * 3;
        
        // Glow effect
        const glow = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, glowRadius
        );
        glow.addColorStop(0, node.color.replace(")", ", 0.4)").replace("hsl", "hsla"));
        glow.addColorStop(1, node.color.replace(")", ", 0)").replace("hsl", "hsla"));
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        
        // Inner highlight
        ctx.beginPath();
        ctx.arc(
          node.x - node.radius * 0.3, 
          node.y - node.radius * 0.3, 
          node.radius * 0.3 * pulseScale, 
          0, 
          Math.PI * 2
        );
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fill();
      });

      time++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", updateSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initializeNetwork, isMobile]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
};
