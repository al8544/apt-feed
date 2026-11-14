'use client';
import { motion } from 'framer-motion';

// Ducktective: three layers from the Krita file (duck, eye, magnifier). The magnifier sways and the
// eye inside it wanders on its own, so the duck looks like it's searching. Honors reduced motion.
const LOOP = { repeat: Infinity, ease: 'easeInOut' } as const;

export default function Ducktective({ height = 40 }: { height?: number }) {
  const width = Math.round((height * 304) / 360);
  const layer = 'absolute inset-0 size-full select-none';
  return (
    <span aria-hidden className="relative inline-block shrink-0" style={{ width, height }}>
      {/* eslint-disable @next/next/no-img-element */}
      <img src="/ducktective/duck.png" alt="" draggable={false} className={layer} />
      <motion.img
        src="/ducktective/eye.png"
        alt=""
        draggable={false}
        className={layer}
        animate={{ x: [0, -0.07 * width, 0.05 * width, 0.02 * width, 0], y: [0, 0.04 * height, -0.04 * height, 0.03 * height, 0] }}
        transition={{ ...LOOP, duration: 3.2 }}
      />
      <motion.img
        src="/ducktective/lens.png"
        alt=""
        draggable={false}
        className={layer}
        style={{ transformOrigin: '38% 85%' }} // pivot near the handle
        animate={{ rotate: [0, -6, 4, 0], x: [0, -0.03 * width, 0.03 * width, 0] }}
        transition={{ ...LOOP, duration: 4.4 }}
      />
      {/* eslint-enable @next/next/no-img-element */}
    </span>
  );
}
