'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

function useCounter(end: number, duration = 2000, started = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, started]);

  return count;
}

const stats = [
  { end: 50000, suffix: '+', label: 'Alunos ativos', prefix: '' },
  { end: 2800, suffix: '+', label: 'Personal trainers', prefix: '' },
  { end: 890, suffix: '+', label: 'Academias', prefix: '' },
  { end: 98, suffix: '%', label: 'Satisfação dos clientes', prefix: '' },
];

function StatItem({ stat, started }: { stat: typeof stats[0]; started: boolean }) {
  const count = useCounter(stat.end, 2000, started);

  const formatted = count >= 1000
    ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`
    : count.toString();

  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">
        {stat.prefix}{formatted}{stat.suffix}
      </div>
      <div className="text-sm text-muted-foreground">{stat.label}</div>
    </div>
  );
}

export function LandingStats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-20 relative">
      <div className="absolute inset-0 border-y border-border/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/3 via-transparent to-cyan-600/3" />
      <div className="relative container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <StatItem stat={stat} started={inView} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
