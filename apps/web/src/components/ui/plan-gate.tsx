'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Lock, Zap } from 'lucide-react';
import { useSubscription, PlanLimits } from '@/hooks/useSubscription';

interface PlanGateProps {
  feature: keyof Omit<PlanLimits, 'maxStudents'>;
  children: React.ReactNode;
}

export function PlanGate({ feature, children }: PlanGateProps) {
  const { canUseFeature, displayName, upgradePrice, upgradePlan, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (canUseFeature(feature)) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
    >
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Funcionalidade bloqueada</h2>
      <p className="text-muted-foreground mb-2 max-w-sm">
        Esta funcionalidade não está disponível no plano <strong>{displayName}</strong>.
      </p>
      {upgradePrice && (
        <p className="text-sm text-muted-foreground mb-8">
          Faça upgrade por apenas <span className="text-primary font-semibold">{upgradePrice}</span> e desbloqueie tudo.
        </p>
      )}
      {upgradePlan && (
        <Link
          href={`/register?plan=${upgradePlan}`}
          className="btn-primary inline-flex items-center gap-2 px-8 py-3"
        >
          <Zap className="w-4 h-4" />
          Fazer upgrade agora
        </Link>
      )}
    </motion.div>
  );
}
