'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Dumbbell, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-dark">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-destructive/20 rounded-2xl flex items-center justify-center">
            <Dumbbell className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-3">Algo deu errado</h1>
        <p className="text-muted-foreground mb-10">
          Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.
        </p>

        {error.digest && (
          <p className="text-xs text-muted-foreground/50 mb-6 font-mono">
            ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
          <Link
            href="/"
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
