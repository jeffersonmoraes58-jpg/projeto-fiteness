'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, Sparkles, CheckCircle2,
  Users, Dumbbell, MessageCircle, Brain, CreditCard,
  Apple, Target, Calendar, Trophy, Activity, Building2, BarChart3,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

interface TourStep {
  icon: any;
  title: string;
  description: string;
}

/**
 * Roteiro do tutorial por tipo de conta. Cada papel vê só as telas que
 * realmente existem para ele — nada de mostrar "Pagamentos" pro aluno, por
 * exemplo. O primeiro e o último passo são sempre boas-vindas/despedida.
 */
const ONBOARDING_STEPS: Record<string, TourStep[]> = {
  TRAINER: [
    { icon: Sparkles, title: 'Bem-vindo ao FitlyNutri! 👋', description: 'Vamos te mostrar rapidinho como aproveitar ao máximo a plataforma para gerenciar seus alunos. Leva menos de um minuto.' },
    { icon: Users, title: 'Seus alunos', description: 'Cadastre alunos, acompanhe evolução com fotos, medidas e avaliações físicas, e veja o progresso de cada um em um só lugar.' },
    { icon: Dumbbell, title: 'Treinos e exercícios', description: 'Monte treinos personalizados com vídeos de exercícios — inclusive os seus próprios — e acompanhe a execução em tempo real.' },
    { icon: MessageCircle, title: 'Chat e agenda', description: 'Converse com seus alunos por mensagens e áudio, e organize consultas e sessões pela agenda integrada.' },
    { icon: Brain, title: 'IA Fitness', description: 'Peça sugestões de treinos e alternativas de exercícios pra nossa inteligência artificial sempre que precisar de uma ideia.' },
    { icon: CreditCard, title: 'Pagamentos', description: 'Receba de alunos via PIX ou cartão, direto pelo app, com o Mercado Pago já integrado.' },
    { icon: CheckCircle2, title: 'Pronto pra começar!', description: 'É isso! Você pode rever esse tutorial quando quiser em Configurações → Rever tutorial.' },
  ],
  NUTRITIONIST: [
    { icon: Sparkles, title: 'Bem-vindo ao FitlyNutri! 👋', description: 'Vamos te mostrar rapidinho como aproveitar ao máximo a plataforma para acompanhar seus pacientes. Leva menos de um minuto.' },
    { icon: Users, title: 'Seus pacientes', description: 'Cadastre pacientes, acompanhe evolução e histórico, e veja tudo o que precisa em um só lugar.' },
    { icon: Apple, title: 'Dietas', description: 'Monte planos alimentares detalhados, com substituições e observações personalizadas para cada paciente.' },
    { icon: Target, title: 'Calculadora TMB', description: 'Calcule a taxa metabólica basal e as necessidades calóricas dos seus pacientes em segundos.' },
    { icon: Calendar, title: 'Chat e agenda', description: 'Converse com seus pacientes e organize consultas pela agenda integrada.' },
    { icon: Brain, title: 'Ferramentas de IA', description: 'Use inteligência artificial pra agilizar a montagem de dietas e sugestões nutricionais.' },
    { icon: CheckCircle2, title: 'Pronto pra começar!', description: 'É isso! Você pode rever esse tutorial quando quiser em Configurações → Rever tutorial.' },
  ],
  STUDENT: [
    { icon: Sparkles, title: 'Bem-vindo ao FitlyNutri! 👋', description: 'Seu personal trainer ou nutricionista te convidou pra plataforma. Vamos te mostrar rapidinho como tudo funciona.' },
    { icon: Dumbbell, title: 'Meu treino', description: 'Veja seus treinos com vídeos de cada exercício e marque as séries conforme for completando.' },
    { icon: Activity, title: 'Evolução', description: 'Registre fotos, medidas e acompanhe seu progresso ao longo do tempo com gráficos.' },
    { icon: Trophy, title: 'Conquistas e desafios', description: 'Ganhe XP, suba no ranking e participe de desafios pra se manter motivado.' },
    { icon: MessageCircle, title: 'Chat', description: 'Fale direto com seu personal trainer ou nutricionista sempre que tiver uma dúvida.' },
    { icon: CheckCircle2, title: 'Pronto pra começar!', description: 'É isso! Você pode rever esse tutorial quando quiser em Perfil → Rever tutorial.' },
  ],
  STUDIO_OWNER: [
    { icon: Sparkles, title: 'Bem-vindo ao FitlyNutri! 👋', description: 'Vamos te mostrar rapidinho como aproveitar ao máximo a plataforma para gerenciar seu studio. Leva menos de um minuto.' },
    { icon: Building2, title: 'Sua equipe', description: 'Gerencie os personal trainers e nutricionistas do seu studio em um só painel.' },
    { icon: BarChart3, title: 'Relatórios', description: 'Acompanhe o desempenho geral do studio com relatórios consolidados.' },
    { icon: CheckCircle2, title: 'Pronto pra começar!', description: 'É isso! Você pode rever esse tutorial quando quiser em Configurações → Rever tutorial.' },
  ],
};

const REOPEN_EVENT = 'open-onboarding-tour';

/**
 * Dispara o tutorial de novo, de qualquer lugar do app (usado pelo botão
 * "Rever tutorial" nas páginas de Configurações/Perfil).
 */
export function reopenOnboardingTour() {
  window.dispatchEvent(new CustomEvent(REOPEN_EVENT));
}

export function OnboardingTour() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = user?.role ? ONBOARDING_STEPS[user.role] : undefined;
  const storageKey = user?.role ? `fitlynutri-onboarding-${user.role}-done` : null;

  // Mostra automaticamente na primeira vez que esse tipo de conta acessa o
  // dashboard (uma vez por papel, guardado no localStorage do aparelho).
  useEffect(() => {
    if (!steps || !storageKey) return;
    if (localStorage.getItem(storageKey)) return;
    const timer = setTimeout(() => {
      setStepIndex(0);
      setOpen(true);
    }, 700);
    return () => clearTimeout(timer);
  }, [steps, storageKey]);

  // Permite reabrir manualmente (botão "Rever tutorial" nas Configurações).
  useEffect(() => {
    const handler = () => {
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener(REOPEN_EVENT, handler);
    return () => window.removeEventListener(REOPEN_EVENT, handler);
  }, []);

  if (!steps) return null;

  const finish = () => {
    if (storageKey) localStorage.setItem(storageKey, '1');
    setOpen(false);
  };

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const isFirst = stepIndex === 0;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card w-full max-w-sm text-center relative"
          >
            <button
              onClick={finish}
              className="absolute right-3 top-3 w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground"
              aria-label="Pular tutorial"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4 mt-2">
              <step.icon className="w-7 h-7 text-primary" />
            </div>

            <h2 className="font-bold text-lg mb-2">{step.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{step.description}</p>

            {/* Progresso */}
            <div className="flex items-center justify-center gap-1.5 mb-5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={() => setStepIndex((i) => i - 1)}
                  className="btn-secondary flex-1 py-2.5 flex items-center justify-center gap-1 text-sm"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
              )}
              {!isLast ? (
                <button
                  onClick={() => setStepIndex((i) => i + 1)}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-1 text-sm"
                >
                  Próximo <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={finish} className="btn-primary flex-1 py-2.5 text-sm">
                  Começar a usar
                </button>
              )}
            </div>

            {!isLast && (
              <button onClick={finish} className="text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors">
                Pular tutorial
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
