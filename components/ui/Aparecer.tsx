"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Entrada suave (sobe 8px e aparece). Desligada para quem pediu "reduzir movimento". */
export function Aparecer({ children, atraso = 0 }: { children: ReactNode; atraso?: number }) {
  const reduzir = useReducedMotion();
  if (reduzir) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: atraso, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
