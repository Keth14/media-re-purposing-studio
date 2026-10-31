"use client";

import { motion } from "framer-motion";
import { Brain, Sparkles, Terminal, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black text-white px-6">
      {/* Subtle background radial glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[480px] w-[480px] rounded-full bg-gradient-to-tr from-violet-600/10 via-indigo-500/10 to-transparent blur-3xl" />
      </div>

      {/* Grid overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px"
        }}
      />

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto space-y-8"
      >
        {/* Status Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/80 px-3.5 py-1.5 text-xs text-neutral-400 backdrop-blur-sm"
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="tracking-wide uppercase font-mono text-[10px]">Studio Engine v0.1</span>
        </motion.div>

        {/* Icon & Title */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/60 shadow-xl"
          >
            <Brain className="h-7 w-7 text-neutral-200" />
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-neutral-100">
            Brand Brain Studio
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed max-w-md mx-auto">
            AI-driven brand intelligence, creative generation, and synthesis pipeline.
          </p>
        </div>

        {/* Actions using shadcn Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Button
            variant="default"
            className="rounded-full bg-white text-black hover:bg-neutral-200 h-10 px-5 text-sm font-medium transition-all"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="rounded-full border-neutral-800 bg-neutral-900/40 text-neutral-300 hover:bg-neutral-800 hover:text-white h-10 px-5 text-sm transition-all"
          >
            <Terminal className="mr-2 h-4 w-4 text-neutral-400" />
            Documentation
          </Button>
        </motion.div>

        {/* Minimal Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="pt-8 border-t border-neutral-900/80 w-full flex items-center justify-between text-xs text-neutral-600 font-mono"
        >
          <span>Next.js App Router</span>
          <span>shadcn/ui • framer-motion</span>
        </motion.div>
      </motion.main>
    </div>
  );
}
