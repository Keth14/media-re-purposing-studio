'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';

interface BootIntroProps {
  onComplete: () => void;
}

// Check if WebGL is available
function checkWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

// Generate ~1400 points forming a dual-hemisphere brain with folds
function generateBrainPoints(count = 1400) {
  const points: {
    initial: THREE.Vector3;
    target: THREE.Vector3;
    color: THREE.Color;
  }[] = [];

  const violet = new THREE.Color('#8b5cf6');
  const cyan = new THREE.Color('#06b6d4');

  // Deterministic pseudo-random helper
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const halfCount = Math.floor(count / 2);

  for (let i = 0; i < count; i++) {
    const isRight = i >= halfCount;
    const side = isRight ? 1 : -1;
    const idxInHemi = isRight ? i - halfCount : i;

    // Fibonacci sphere distribution over hemisphere
    const u = (idxInHemi + 0.5) / halfCount;
    const theta = Math.acos(1 - 2 * u);
    const phi = Math.PI * (1 + Math.sqrt(5)) * idxInHemi;

    // Brain dimensions & gyri (folds) modulation
    const rx = 0.95;
    const ry = 0.85;
    const rz = 1.35;

    // Fold wave frequencies
    const fold =
      1.0 +
      0.14 * Math.sin(7 * theta) * Math.cos(7 * phi) +
      0.08 * Math.sin(14 * phi) * Math.sin(7 * theta);

    // Anatomical separation of left and right hemispheres (longitudinal fissure)
    const rawX = Math.abs(Math.sin(theta) * Math.cos(phi)) * rx * fold;
    const x = side * (0.16 + rawX);
    const y = Math.cos(theta) * ry * fold - 0.1 * Math.sin(rawX * 3);
    const z = Math.sin(theta) * Math.sin(phi) * rz * fold;

    const target = new THREE.Vector3(x, y, z);

    // Initial position: widely scattered in space (14 - 24 units away)
    const dist = 14 + rand() * 12;
    const sTheta = rand() * Math.PI;
    const sPhi = rand() * 2 * Math.PI;
    const initial = new THREE.Vector3(
      dist * Math.sin(sTheta) * Math.cos(sPhi),
      dist * Math.cos(sTheta),
      dist * Math.sin(sTheta) * Math.sin(sPhi)
    );

    // Interpolate color from violet to cyan based on position
    const tColor = (target.x + 1.2) / 2.4 * 0.5 + (target.z + 1.4) / 2.8 * 0.5;
    const color = violet.clone().lerp(cyan, Math.max(0, Math.min(1, tColor)));

    points.push({ initial, target, color });
  }

  // Precompute nearest neighbor connections for lines
  const lines: number[] = [];
  const maxConnDist = 0.42;
  const maxLines = 650;

  for (let i = 0; i < points.length && lines.length < maxLines * 6; i += 2) {
    const p1 = points[i].target;
    for (let j = i + 1; j < points.length; j += 2) {
      if ((i < halfCount && j >= halfCount) || (i >= halfCount && j < halfCount)) {
        continue; // Keep hemispheres separate
      }
      const dist = p1.distanceTo(points[j].target);
      if (dist < maxConnDist) {
        lines.push(p1.x, p1.y, p1.z, points[j].target.x, points[j].target.y, points[j].target.z);
        if (lines.length >= maxLines * 6) break;
      }
    }
  }

  return { points, lines: new Float32Array(lines) };
}

// 3D Canvas Scene
function BrainScene({
  startTime,
  onDollyComplete,
}: {
  startTime: number;
  onDollyComplete: () => void;
}) {
  const { points, lines } = useMemo(() => generateBrainPoints(1400), []);
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const groupRef = useRef<THREE.Group>(null);
  const hasTriggeredDolly = useRef(false);

  // Buffer geometries
  const { positionsArray, colorsArray } = useMemo(() => {
    const pos = new Float32Array(points.length * 3);
    const col = new Float32Array(points.length * 3);
    points.forEach((p, idx) => {
      pos[idx * 3] = p.initial.x;
      pos[idx * 3 + 1] = p.initial.y;
      pos[idx * 3 + 2] = p.initial.z;

      col[idx * 3] = p.color.r;
      col[idx * 3 + 1] = p.color.g;
      col[idx * 3 + 2] = p.color.b;
    });
    return { positionsArray: pos, colorsArray: col };
  }, [points]);

  const linesPositions = useMemo(() => lines, [lines]);

  useFrame(({ camera }) => {
    const elapsed = performance.now() - startTime;
    const tSec = elapsed / 1000;

    // Phase 1: 0.0s - 0.8s: Converge from space into brain lattice
    const convergeProgress = Math.min(1, Math.max(0, tSec / 0.8));
    // Smooth cubic easing
    const ease =
      convergeProgress < 0.5
        ? 4 * convergeProgress * convergeProgress * convergeProgress
        : 1 - Math.pow(-2 * convergeProgress + 2, 3) / 2;

    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position;
      const array = posAttr.array as Float32Array;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        array[i * 3] = THREE.MathUtils.lerp(p.initial.x, p.target.x, ease);
        array[i * 3 + 1] = THREE.MathUtils.lerp(p.initial.y, p.target.y, ease);
        array[i * 3 + 2] = THREE.MathUtils.lerp(p.initial.z, p.target.z, ease);
      }
      posAttr.needsUpdate = true;
    }

    // Phase 2: 0.8s - 2.2s: Formed brain lattice, gentle rotation & neural pulsation
    if (groupRef.current) {
      if (tSec >= 0.8) {
        groupRef.current.rotation.y = (tSec - 0.8) * 0.45;
        groupRef.current.rotation.x = Math.sin((tSec - 0.8) * 1.5) * 0.08;
      }
    }

    // Line segments visibility & traveling light pulses
    if (linesRef.current) {
      const lineMat = linesRef.current.material as THREE.LineBasicMaterial;
      if (tSec < 0.7) {
        lineMat.opacity = 0;
      } else if (tSec < 2.2) {
        const lineFade = Math.min(1, (tSec - 0.7) / 0.5);
        // Neural pulse rhythm
        const pulse = 0.2 + 0.18 * Math.sin(tSec * 10);
        lineMat.opacity = lineFade * pulse;
      } else {
        // Fade out lines during dolly into core
        lineMat.opacity = Math.max(0, 0.4 - (tSec - 2.2) * 1.5);
      }
    }

    // Phase 3: 2.2s - 3.2s: Camera dollies forward into the brain
    if (tSec < 2.2) {
      camera.position.set(0, 0, 7.2);
    } else if (tSec <= 3.2) {
      const dollyProgress = Math.min(1, (tSec - 2.2) / 1.0);
      const easeDolly = dollyProgress * dollyProgress * dollyProgress;
      // Dolly forward from 7.2 into 0.6
      const zPos = THREE.MathUtils.lerp(7.2, 0.6, easeDolly);
      camera.position.set(0, 0, zPos);

      if (dollyProgress >= 0.6 && !hasTriggeredDolly.current) {
        hasTriggeredDolly.current = true;
        onDollyComplete();
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1400 Brain Particles with Additive Blending */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positionsArray, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colorsArray, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.065}
          vertexColors
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Connecting Neural Lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linesPositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

// Monospace Boot Log Messages
const LOG_MESSAGES = [
  '> waking voice model... ok',
  '> indexing transcripts... ok',
  '> calibrating hook weights... ok',
  '> voice input: Wispr ready',
  '> brand memory: online',
];

export default function BootIntro({ onComplete }: BootIntroProps) {
  const [startTime] = useState<number>(() => performance.now());
  const [elapsed, setElapsed] = useState<number>(0);
  const [isSkipped, setIsSkipped] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [is2DMode, setIs2DMode] = useState<boolean>(false);

  // Check 2D fallback criteria on mount
  useEffect(() => {
    const hasWebGL = checkWebGL();
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const isSmallScreen = window.innerWidth < 640;

    if (!hasWebGL || prefersReducedMotion || isSmallScreen) {
      setIs2DMode(true);
    }
  }, []);

  // Frame timer & animation lifecycle
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const now = performance.now();
      const diff = now - startTime;
      setElapsed(diff);

      const targetDuration = is2DMode ? 1200 : 3800;

      if (diff >= targetDuration) {
        finish();
      } else {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, is2DMode]);

  // Finish and save to sessionStorage
  const finish = () => {
    if (isDone) return;
    setIsDone(true);
    try {
      sessionStorage.setItem('brandbrain_intro_seen', 'true');
    } catch {
      // ignore
    }
    onComplete();
  };

  const skip = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSkipped || isDone) return;
    setIsSkipped(true);
    finish();
  };

  // Keyboard shortcut listener (Escape to skip)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skip();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute boot log lines to show
  const logLines = useMemo(() => {
    if (is2DMode) {
      const lineCount = Math.min(
        LOG_MESSAGES.length,
        Math.floor(elapsed / 180)
      );
      return LOG_MESSAGES.slice(0, lineCount);
    }
    // 3D mode: types one line every 300ms starting at 800ms
    if (elapsed < 800) return [];
    const count = Math.min(
      LOG_MESSAGES.length,
      Math.floor((elapsed - 800) / 300) + 1
    );
    return LOG_MESSAGES.slice(0, count);
  }, [elapsed, is2DMode]);

  // Compute progress bar percent (0 to 100%)
  const progressPercent = useMemo(() => {
    if (is2DMode) {
      return Math.min(100, Math.round((elapsed / 1000) * 100));
    }
    return Math.min(100, Math.round((elapsed / 3200) * 100));
  }, [elapsed, is2DMode]);

  // White flash flare factor (2.2s - 2.8s)
  const flareOpacity = useMemo(() => {
    if (is2DMode) return 0;
    if (elapsed < 2200 || elapsed > 3000) return 0;
    if (elapsed <= 2500) {
      return ((elapsed - 2200) / 300) * 0.9;
    }
    return (1 - (elapsed - 2500) / 500) * 0.9;
  }, [elapsed, is2DMode]);

  // Wordmark appearance (2.3s - 3.8s in 3D mode, or 400ms+ in 2D mode)
  const showWordmark = is2DMode ? elapsed >= 300 : elapsed >= 2300;

  // Final container cross-fade (3.2s - 3.8s in 3D mode, 900ms - 1200ms in 2D mode)
  const containerOpacity = useMemo(() => {
    if (isSkipped) return 0;
    if (is2DMode) {
      if (elapsed < 900) return 1;
      return Math.max(0, 1 - (elapsed - 900) / 300);
    }
    if (elapsed < 3200) return 1;
    return Math.max(0, 1 - (elapsed - 3200) / 600);
  }, [elapsed, isSkipped, is2DMode]);

  if (isDone) return null;

  return (
    <div
      onClick={skip}
      style={{
        opacity: containerOpacity,
        transition: isSkipped ? 'opacity 200ms ease-out' : 'none',
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#05050A] select-none cursor-pointer overflow-hidden"
    >
      {/* 1. Full-screen 3D Canvas (Active when not in 2D mode) */}
      {!is2DMode && (
        <div className="absolute inset-0 pointer-events-none">
          <Canvas
            dpr={[1, 1.5]}
            frameloop={isDone ? 'never' : 'always'}
            camera={{ position: [0, 0, 7.2], fov: 45 }}
            gl={{
              antialias: false,
              powerPreference: 'high-performance',
              alpha: false,
            }}
          >
            <color attach="background" args={['#05050A']} />
            <BrainScene
              startTime={startTime}
              onDollyComplete={() => {}}
            />
          </Canvas>
        </div>
      )}

      {/* 2. White Screen Flare (2.2s - 2.8s) */}
      {flareOpacity > 0 && (
        <div
          style={{ opacity: flareOpacity }}
          className="pointer-events-none absolute inset-0 bg-white transition-opacity duration-100"
        />
      )}

      {/* 3. Top Right: Skippable Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={skip}
          className="rounded-full border border-neutral-800 bg-neutral-900/80 px-3.5 py-1.5 text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-all backdrop-blur-md shadow-lg"
        >
          Skip <span className="text-neutral-600">[Esc]</span>
        </button>
      </div>

      {/* 4. Bottom Left: Monospace Boot Log */}
      <div className="absolute bottom-8 left-6 sm:left-10 z-20 space-y-1 font-mono text-[11px] text-neutral-400 pointer-events-none max-w-xs">
        {logLines.map((line, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 animate-fadeIn text-neutral-300"
          >
            <span className="text-indigo-400">›</span>
            <span>{line.replace(/^>\s*/, '')}</span>
          </div>
        ))}
      </div>

      {/* 5. Bottom Center: Progress Bar & Percent Counter */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
        <div className="w-36 sm:w-48 h-1 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800/80">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-75 ease-out"
          />
        </div>
        <span className="font-mono text-[10px] text-neutral-500">
          {progressPercent}%
        </span>
      </div>

      {/* 6. Center: Wordmark & Tagline (appears at 2.2s - 3.8s) */}
      {showWordmark && (
        <div className="relative z-30 flex flex-col items-center text-center px-4 animate-fadeIn pointer-events-none">
          <h1 className="headline-shimmer text-4xl sm:text-6xl font-light tracking-tight text-white leading-tight">
            BrandBrain Studio
          </h1>
          <p className="mt-3 text-xs sm:text-sm font-mono text-neutral-400 tracking-wider">
            Other tools generate. Ours learns.
          </p>
        </div>
      )}
    </div>
  );
}
