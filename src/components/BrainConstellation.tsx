'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  Database,
  RotateCw,
  Zap,
  Shield,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { BrainState, BrainRule, PostedResult } from '@/types';
import { Button } from '@/components/ui/button';

interface BrainConstellationProps {
  brain: BrainState | null;
  postedResults: PostedResult[];
  onLoadSamples: () => void;
  onUpdateBrain: () => void;
  isUpdatingBrain: boolean;
  className?: string;
}

interface ConstellationNode {
  id: string;
  type: 'core' | 'trait' | 'rule';
  label: string;
  sublabel?: string;
  detail?: string;
  source?: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  glowColor: string;
  isNew?: boolean;
}

interface ConstellationEdge {
  from: string;
  to: string;
  color: string;
  dashed?: boolean;
}

export default function BrainConstellation({
  brain,
  postedResults,
  onLoadSamples,
  onUpdateBrain,
  isUpdatingBrain,
  className = '',
}: BrainConstellationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 380 });
  const [useSvgFallback, setUseSvgFallback] = useState<boolean>(false);
  const [hoveredNode, setHoveredNode] = useState<ConstellationNode | null>(null);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const prevRulesCountRef = useRef<number>(brain?.rules?.length || 0);

  // Fallback traits if brain traits are empty
  const traits = useMemo(() => {
    if (brain?.voice?.traits && brain.voice.traits.length > 0) {
      return brain.voice.traits;
    }
    return [
      'Radically Direct & Anti-Fluff',
      'Opinionated & Contrarian',
      'Actionable & Tactical',
      'High Velocity',
    ];
  }, [brain?.voice?.traits]);

  const rules: BrainRule[] = useMemo(() => {
    return brain?.rules || [];
  }, [brain?.rules]);

  // Track newly added rules to trigger the visual pulse
  useEffect(() => {
    const currentCount = rules.length;
    if (currentCount > prevRulesCountRef.current) {
      const added = new Set<string>();
      rules.slice(prevRulesCountRef.current).forEach((r) => added.add(r.id));
      setNewlyAddedIds(added);

      const timer = setTimeout(() => {
        setNewlyAddedIds(new Set());
      }, 6000);
      prevRulesCountRef.current = currentCount;
      return () => clearTimeout(timer);
    }
    prevRulesCountRef.current = currentCount;
  }, [rules]);

  // Measure container dimensions
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(rect.width, 320),
          height: 380,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute Layout Nodes & Edges
  const { nodes, edges } = useMemo(() => {
    const { width, height } = dimensions;
    const cx = width / 2;
    const cy = height / 2;

    const nodeList: ConstellationNode[] = [];
    const edgeList: ConstellationEdge[] = [];

    // 1. Center "Voice" Node (Always present)
    const centerNode: ConstellationNode = {
      id: 'voice-core',
      type: 'core',
      label: 'Voice Core',
      sublabel: `v${brain?.version || 1}`,
      detail: brain?.voice?.summary || 'Empirical Brand Voice Core',
      x: cx,
      y: cy,
      radius: 28,
      color: '#6366f1', // Indigo
      glowColor: 'rgba(99, 102, 241, 0.45)',
    };
    nodeList.push(centerNode);

    // 2. Trait Nodes (Inner orbit around Voice)
    const traitRadius = Math.min(width * 0.22, 130);
    const traitCount = traits.length;

    traits.forEach((trait, i) => {
      const angle = (2 * Math.PI * i) / traitCount - Math.PI / 2;
      const tx = cx + traitRadius * Math.cos(angle);
      const ty = cy + traitRadius * Math.sin(angle);
      const traitId = `trait-${i}`;

      nodeList.push({
        id: traitId,
        type: 'trait',
        label: trait,
        sublabel: 'Voice Directive',
        detail: `Brand trait enforced across all copy & video clips.`,
        x: tx,
        y: ty,
        radius: 17,
        color: '#38bdf8', // Sky Cyan
        glowColor: 'rgba(56, 189, 248, 0.4)',
      });

      edgeList.push({
        from: 'voice-core',
        to: traitId,
        color: 'rgba(99, 102, 241, 0.4)',
      });
    });

    // 3. Rule Nodes (Outer orbit / surrounding cluster)
    if (rules.length > 0) {
      const ruleOrbitRadius = Math.min(width * 0.38, 175);
      const ruleCount = rules.length;

      rules.forEach((rule, j) => {
        // Offset angle to weave naturally between traits
        const angle = (2 * Math.PI * j) / ruleCount + Math.PI / 4;
        const rx = cx + ruleOrbitRadius * Math.cos(angle);
        const ry = cy + ruleOrbitRadius * Math.sin(angle);

        const isFeedback = rule.source === 'feedback_loop';
        const isDictated = rule.source === 'dictated';
        const ruleColor = isDictated ? '#d946ef' : isFeedback ? '#10b981' : '#f59e0b';
        const ruleGlow = isDictated
          ? 'rgba(217, 70, 239, 0.45)'
          : isFeedback
          ? 'rgba(16, 185, 129, 0.45)'
          : 'rgba(245, 158, 11, 0.45)';

        nodeList.push({
          id: rule.id,
          type: 'rule',
          label: rule.text,
          sublabel: isFeedback ? 'Learned from Telemetry' : isDictated ? 'Dictated Rule' : 'Sample Rule',
          detail: rule.evidence,
          source: rule.source,
          x: rx,
          y: ry,
          radius: 15,
          color: ruleColor,
          glowColor: ruleGlow,
          isNew: newlyAddedIds.has(rule.id),
        });

        // Connect rule to the center voice core
        edgeList.push({
          from: 'voice-core',
          to: rule.id,
          color: ruleGlow,
          dashed: true,
        });

        // Also connect to nearest trait for a rich web network
        if (traitCount > 0) {
          const nearestTraitIdx = j % traitCount;
          edgeList.push({
            from: `trait-${nearestTraitIdx}`,
            to: rule.id,
            color: 'rgba(255, 255, 255, 0.1)',
            dashed: true,
          });
        }
      });
    }

    return { nodes: nodeList, edges: edgeList };
  }, [dimensions, traits, rules, brain?.version, brain?.voice?.summary, newlyAddedIds]);

  // Check WebGL availability & run hardware-accelerated canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = (canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')) as WebGLRenderingContext;
    } catch {
      gl = null;
    }

    if (!gl) {
      console.warn(
        '[BrandBrain Constellation] WebGL is not available or disabled in this browser. Rendering 2D SVG fallback.'
      );
      setUseSvgFallback(true);
      return;
    }

    console.log(
      '[BrandBrain Constellation] WebGL context initialized successfully on Canvas (height: 380px).'
    );
    setUseSvgFallback(false);

    // Set high-DPI canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // WebGL Shader setup
    const vsSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      attribute float a_size;
      varying vec4 v_color;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        gl_PointSize = a_size;
        v_color = a_color;
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec4 v_color;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5, 0.5));
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, dist);
        gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
      }
    `;

    const createShader = (type: number, src: string) => {
      if (!gl) return null;
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const vert = createShader(gl.VERTEX_SHADER, vsSource);
    const frag = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vert || !frag) {
      setUseSvgFallback(true);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      setUseSvgFallback(true);
      return;
    }
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[BrandBrain Constellation] WebGL link failed, falling back to SVG.');
      setUseSvgFallback(true);
      return;
    }

    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    const colorLoc = gl.getAttribLocation(program, 'a_color');
    const sizeLoc = gl.getAttribLocation(program, 'a_size');

    // Create background floating nebula dust particles
    const starCount = 65;
    const stars: { x: number; y: number; speed: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        speed: 0.0003 + Math.random() * 0.0005,
        size: (1.5 + Math.random() * 3) * dpr,
        alpha: 0.2 + Math.random() * 0.6,
      });
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      if (!gl) return;
      time += 0.015;

      gl.clearColor(0.02, 0.02, 0.04, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // 1. Draw animated background stars
      const starData: number[] = [];
      stars.forEach((star) => {
        star.y += star.speed;
        if (star.y > 1.0) star.y = -1.0;
        const pulseAlpha = star.alpha * (0.7 + 0.3 * Math.sin(time * 2 + star.x * 10));
        // x, y, r, g, b, a, size
        starData.push(star.x, star.y, 0.6, 0.65, 0.95, pulseAlpha, star.size);
      });

      // 2. Draw nodes glow points in WebGL
      nodes.forEach((node) => {
        // Convert screen (0..width, 0..height) to WebGL clipspace (-1..1, 1..-1)
        const nx = (node.x / dimensions.width) * 2 - 1;
        const ny = -((node.y / dimensions.height) * 2 - 1);
        const baseSize = node.radius * 2 * dpr;

        if (node.type === 'core') {
          const corePulse = (baseSize + Math.sin(time * 3) * 6 * dpr) * 1.8;
          starData.push(nx, ny, 0.39, 0.4, 0.95, 0.7, corePulse);
        } else if (node.isNew) {
          const newPulse = (baseSize + Math.sin(time * 8) * 10 * dpr) * 1.6;
          starData.push(nx, ny, 0.1, 0.9, 0.5, 0.9, newPulse);
        } else {
          starData.push(nx, ny, 0.3, 0.6, 0.9, 0.5, baseSize * 1.3);
        }
      });

      const stride = 7 * Float32Array.BYTES_PER_ELEMENT;
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starData), gl.DYNAMIC_DRAW);

      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);

      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

      gl.enableVertexAttribArray(sizeLoc);
      gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);

      gl.drawArrays(gl.POINTS, 0, starData.length / 7);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (gl && buffer) gl.deleteBuffer(buffer);
      if (gl && program) gl.deleteProgram(program);
    };
  }, [dimensions, nodes]);

  // Total nodes count helper for header & receipts
  const totalNodesCount = nodes.length;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[380px] min-h-[380px] rounded-3xl border border-indigo-500/20 bg-neutral-950/80 backdrop-blur-2xl shadow-2xl shadow-indigo-950/30 overflow-hidden select-none ${className}`}
    >
      {/* Deep Space Dark Glow Backdrops */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full" />
      <div className="pointer-events-none absolute right-12 top-10 w-64 h-64 bg-violet-600/10 blur-[90px] rounded-full" />
      <div className="pointer-events-none absolute left-10 bottom-6 w-56 h-56 bg-sky-600/10 blur-[80px] rounded-full" />

      {/* Hardware Canvas (WebGL) */}
      {!useSvgFallback && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-[380px] block pointer-events-none"
          style={{ width: '100%', height: '380px' }}
        />
      )}

      {/* SVG Layer (Works seamlessly as 2D Fallback or High-Def Interactive Overlay) */}
      <svg
        className="absolute inset-0 w-full h-[380px] pointer-events-auto"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      >
        <defs>
          <filter id="coreGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="pulseGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Constellation Edges (Connecting Lines) */}
        {edges.map((edge, idx) => {
          const sourceNode = nodes.find((n) => n.id === edge.from);
          const targetNode = nodes.find((n) => n.id === edge.to);
          if (!sourceNode || !targetNode) return null;

          return (
            <line
              key={`edge-${idx}`}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke={edge.color}
              strokeWidth={edge.dashed ? 1.2 : 1.8}
              strokeDasharray={edge.dashed ? '4 3' : undefined}
              className="transition-all duration-700 opacity-60 hover:opacity-100"
            />
          );
        })}

        {/* 2. Constellation Nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredNode?.id === node.id;
          const isCore = node.type === 'core';
          const isTrait = node.type === 'trait';
          const isRule = node.type === 'rule';

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Pulsing ring for newly added nodes */}
              {node.isNew && (
                <circle
                  r={node.radius + 12}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  className="animate-ping opacity-75 origin-center"
                />
              )}

              {/* Core Breathing Aura */}
              {isCore && (
                <circle
                  r={node.radius + 8}
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.4)"
                  strokeWidth="1.5"
                  className="animate-pulse"
                />
              )}

              {/* Node Outer Halo Glow */}
              <circle
                r={node.radius + 4}
                fill={node.glowColor}
                filter="url(#coreGlow)"
                className="transition-all duration-300"
                opacity={isHovered ? 0.9 : 0.45}
              />

              {/* Node Body Circle */}
              <circle
                r={node.radius}
                fill="#09090b"
                stroke={node.color}
                strokeWidth={isCore ? 2.5 : isHovered ? 2.5 : 1.8}
                className="transition-all duration-300"
              />

              {/* Node Icon / Center Dot */}
              {isCore ? (
                <g transform="translate(-8, -8)">
                  <Brain className="h-4 w-4 text-indigo-300" />
                </g>
              ) : isTrait ? (
                <circle r={4.5} fill="#38bdf8" />
              ) : (
                <circle r={3.5} fill={node.color} />
              )}

              {/* Node Compact Label */}
              <text
                y={node.radius + 14}
                textAnchor="middle"
                fill={isHovered ? '#ffffff' : '#9ca3af'}
                fontSize={isCore ? '11px' : '9.5px'}
                fontFamily="monospace"
                fontWeight={isCore ? '600' : '400'}
                className="pointer-events-none select-none transition-colors"
              >
                {node.label.length > 22 ? `${node.label.slice(0, 20)}…` : node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Top Overlay Banner & Quick Feedback Actions */}
      <div className="absolute top-4 left-5 right-5 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Constellation Meta & Node Count */}
        <div className="flex items-center gap-2.5 pointer-events-auto bg-neutral-900/80 border border-neutral-800/80 rounded-2xl px-3.5 py-1.5 backdrop-blur-md shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="text-xs font-mono text-neutral-300">
            Brand Brain Constellation
          </span>
          <span className="text-[10px] font-mono text-neutral-500">•</span>
          <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 text-[10px] font-mono font-bold">
            {totalNodesCount} nodes active
          </span>
        </div>

        {/* Right: Flow Buttons ("Load sample results" -> "Update Brand Brain") */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onLoadSamples}
            className="rounded-xl border-neutral-800 bg-neutral-900/90 hover:bg-neutral-800 hover:text-white text-[11px] font-mono text-neutral-300 h-8 px-3 shadow-sm transition-all"
          >
            <Database className="mr-1.5 h-3 w-3 text-indigo-400" />
            Load sample results
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onUpdateBrain}
            disabled={isUpdatingBrain || postedResults.length < 2}
            className={`rounded-xl text-[11px] font-semibold font-mono h-8 px-3 transition-all shadow-md ${
              postedResults.length >= 2
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:brightness-110 ring-2 ring-indigo-500/40 shadow-indigo-500/20 animate-pulse'
                : 'bg-white text-black hover:bg-neutral-200 disabled:opacity-40'
            }`}
          >
            {isUpdatingBrain ? (
              <>
                <RotateCw className="mr-1.5 h-3 w-3 animate-spin text-white" />
                Updating Brain...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3 w-3" />
                Update Brand Brain
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Gentle Empty Hint (Rendered when 0 rules are recorded) */}
      {rules.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2 rounded-full border border-indigo-500/30 bg-neutral-900/90 px-4 py-2 text-xs font-mono text-indigo-200 backdrop-blur-md shadow-xl"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Click Update Brand Brain from results to grow your constellation.</span>
        </motion.div>
      )}

      {/* Newly Added Nodes Pulsing Toast Notification */}
      <AnimatePresence>
        {newlyAddedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-950/80 px-4 py-2 text-xs font-mono text-emerald-200 backdrop-blur-md shadow-2xl"
          >
            <Zap className="h-3.5 w-3.5 text-emerald-400 animate-bounce" />
            <span>
              Connected {newlyAddedIds.size} new learned rule node{newlyAddedIds.size > 1 ? 's' : ''} to constellation!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Tooltip Card on Node Hover */}
      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="absolute bottom-4 left-5 max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950/95 p-3.5 backdrop-blur-xl shadow-2xl space-y-1.5 pointer-events-none z-30 font-mono text-xs"
          >
            <div className="flex items-center justify-between gap-2 border-b border-neutral-900 pb-1.5">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: hoveredNode.color }}
                />
                {hoveredNode.label}
              </span>
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                {hoveredNode.sublabel}
              </span>
            </div>
            {hoveredNode.detail && (
              <p className="text-[11px] text-neutral-300 font-sans leading-relaxed">
                {hoveredNode.detail}
              </p>
            )}
            {hoveredNode.source && (
              <div className="pt-0.5">
                <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[9px] text-neutral-400 border border-neutral-800">
                  Source: {hoveredNode.source}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
