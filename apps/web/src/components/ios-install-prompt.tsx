'use client';

import { useState, useEffect } from 'react';
import { X, Share, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function isDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('ios-install-dismissed') === '1';
}

export function IosInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isIOS() && !isStandalone() && !isDismissed()) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem('ios-install-dismissed', '1');
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 z-50 lg:left-auto lg:right-6 lg:max-w-sm"
        >
          <div className="glass-card p-4 shadow-2xl border border-border/50">
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center flex-shrink-0">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <p className="font-bold text-sm mb-1">Instalar FitlyNutri</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Adicione à tela de início para uma experiência como app nativo.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
                    <Share className="w-3 h-3" />
                    Toque no ícone
                  </span>
                  <span>→</span>
                  <span className="inline-flex bg-muted rounded-lg px-2 py-1 font-medium">
                    Adicionar à Tela de Início
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
