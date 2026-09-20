"use client";

import React, { useEffect, useRef } from "react";

interface GalaxyBackgroundProps {
  intensity?: number;
  threatLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  isAudioActive?: boolean;
}

interface Star {
  x: number;
  y: number;
  z: number;
  radius: number;
  baseRadius: number;
  color: string;
  alpha: number;
  angle: number;
  distance: number;
  speed: number;
  armAngle: number;
}

export default function GalaxyBackground({
  intensity = 1,
  threatLevel = "LOW",
  isAudioActive = false,
}: GalaxyBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX - width / 2) / (width / 2);
      mouseRef.current.targetY = (e.clientY - height / 2) / (height / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Generate Spiral Galaxy Stars
    const NUM_STARS = 1600;
    const ARMS = 4;
    const GALAXY_RADIUS = Math.min(width, height) * 0.75;
    const stars: Star[] = [];

    const getStarColors = () => {
      if (threatLevel === "CRITICAL") {
        return ["#ff0055", "#ff3366", "#ff5500", "#ffaa44", "#ffffff"];
      } else if (threatLevel === "HIGH") {
        return ["#ff6600", "#ffaa00", "#ffdd44", "#ff4444", "#ffffff"];
      } else if (threatLevel === "MEDIUM") {
        return ["#ffcc00", "#00e5ff", "#8b5cf6", "#38bdf8", "#ffffff"];
      }
      return ["#00e5ff", "#38bdf8", "#6366f1", "#8b5cf6", "#a78bfa", "#10b981", "#ffffff"];
    };

    const colors = getStarColors();

    for (let i = 0; i < NUM_STARS; i++) {
      const arm = i % ARMS;
      const armAngle = (arm * 2 * Math.PI) / ARMS;
      // Exponential distribution towards center
      const distance = Math.pow(Math.random(), 2.2) * GALAXY_RADIUS + 15;
      const spiralAngle = distance * 0.0035;
      const angle = armAngle + spiralAngle + (Math.random() - 0.5) * 0.65;
      
      const speed = (0.0006 + (1 / (distance + 50)) * 0.08) * (Math.random() * 0.4 + 0.8);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const baseRadius = Math.random() < 0.92 ? Math.random() * 1.5 + 0.5 : Math.random() * 2.5 + 1.8;

      stars.push({
        x: 0,
        y: 0,
        z: (Math.random() - 0.5) * 160,
        radius: baseRadius,
        baseRadius,
        color,
        alpha: Math.random() * 0.7 + 0.3,
        angle,
        distance,
        speed,
        armAngle,
      });
    }

    let galacticRotation = 0;

    const render = () => {
      // Smooth mouse follow
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      // Dark background with faint persistence trail
      ctx.fillStyle = "rgba(4, 7, 16, 0.35)";
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Galactic core glow
      const coreGradient = ctx.createRadialGradient(
        centerX + mouseRef.current.x * 20,
        centerY + mouseRef.current.y * 20,
        0,
        centerX,
        centerY,
        Math.min(width, height) * 0.45
      );

      if (threatLevel === "CRITICAL") {
        coreGradient.addColorStop(0, "rgba(255, 0, 60, 0.22)");
        coreGradient.addColorStop(0.3, "rgba(220, 20, 60, 0.08)");
        coreGradient.addColorStop(1, "transparent");
      } else if (threatLevel === "HIGH") {
        coreGradient.addColorStop(0, "rgba(255, 120, 0, 0.20)");
        coreGradient.addColorStop(0.3, "rgba(255, 80, 0, 0.07)");
        coreGradient.addColorStop(1, "transparent");
      } else {
        coreGradient.addColorStop(0, "rgba(0, 229, 255, 0.18)");
        coreGradient.addColorStop(0.25, "rgba(99, 102, 241, 0.10)");
        coreGradient.addColorStop(0.6, "rgba(139, 92, 246, 0.04)");
        coreGradient.addColorStop(1, "transparent");
      }

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.min(width, height) * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Rotation speed depends on audio or threat
      const speedMult = isAudioActive ? 2.4 : threatLevel === "CRITICAL" ? 2.0 : 1.0;
      galacticRotation += 0.0012 * speedMult * intensity;

      // 3D tilt angles from mouse
      const tiltX = 0.55 + mouseRef.current.y * 0.2; // Perspective tilt (elliptic view)
      const tiltY = mouseRef.current.x * 0.25;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.angle += star.speed * speedMult * intensity;

        // 3D position before projection
        const cosA = Math.cos(star.angle);
        const sinA = Math.sin(star.angle);

        let px = cosA * star.distance;
        let py = sinA * star.distance * tiltX + star.z * 0.3;

        // Apply mouse tilt offset
        px += tiltY * star.distance * 0.4;

        const screenX = centerX + px;
        const screenY = centerY + py;

        // Skip off-screen
        if (screenX < -20 || screenX > width + 20 || screenY < -20 || screenY > height + 20) {
          continue;
        }

        // Distance attenuation & flicker
        const depth = (sinA + 1) / 2; // Front vs back of galaxy
        const alpha = Math.min(1, Math.max(0.1, star.alpha * (0.4 + depth * 0.6)));
        const r = star.radius * (0.7 + depth * 0.5) * (isAudioActive ? 1.2 : 1.0);

        ctx.beginPath();
        ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha;
        ctx.fill();

        // Extra twinkle glow on larger stars
        if (star.baseRadius > 2.0) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, r * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = alpha * 0.25;
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [threatLevel, isAudioActive, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-85"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
