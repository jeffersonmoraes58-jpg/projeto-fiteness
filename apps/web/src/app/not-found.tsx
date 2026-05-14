import Link from 'next/link';
import { Dumbbell, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-dark">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-brand rounded-2xl flex items-center justify-center">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="text-8xl font-black gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold mb-3">Página não encontrada</h1>
        <p className="text-muted-foreground mb-10">
          A página que você está procurando não existe ou foi movida.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Página inicial
          </Link>
          <Link
            href="/dashboard"
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Ir ao dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
