import type { Metadata } from 'next';
import Link from 'next/link';
import { Dumbbell, Brain, Users, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sobre nós',
  description: 'Conheça a Fitlynutri — a plataforma fitness mais completa do Brasil para personal trainers e nutricionistas.',
  robots: { index: true, follow: true },
};

const values = [
  {
    icon: Dumbbell,
    title: 'Foco no Profissional',
    description: 'Ferramentas pensadas para quem vive de fitness. Do personal trainer autônomo ao studio com equipe.',
  },
  {
    icon: Brain,
    title: 'Inteligência Artificial',
    description: 'IA que analisa o perfil do aluno e sugere treinos e dietas personalizadas, economizando horas do profissional.',
  },
  {
    icon: Users,
    title: 'Conexão Profissional–Aluno',
    description: 'Chat em tempo real, notificações automáticas e app no celular do aluno para manter tudo conectado.',
  },
  {
    icon: Heart,
    title: 'Feito no Brasil',
    description: 'Plataforma 100% brasileira, com suporte em português, preços em reais e integração com Mercado Pago.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          ← Voltar para o início
        </Link>

        <h1 className="text-3xl font-bold mb-6">Sobre a Fitlynutri</h1>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p className="text-lg">
            A Fitlynutri nasceu da necessidade real de profissionais de fitness que perdiam horas do dia gerenciando treinos em planilhas, cobranças no WhatsApp e evolução dos alunos em cadernos.
          </p>

          <p>
            Somos uma plataforma SaaS completa que reúne tudo o que um personal trainer ou nutricionista precisa em um só lugar: montagem de treinos com biblioteca de exercícios e GIFs, planos alimentares com cálculo automático de macros, chat em tempo real, cobranças integradas via Pix e cartão, agenda de sessões, gamificação e inteligência artificial para sugestões automáticas.
          </p>

          <p>
            Nossa missão é democratizar o acesso a ferramentas profissionais de gestão fitness, permitindo que qualquer profissional — do autônomo ao studio — atenda mais alunos com mais qualidade e menos trabalho manual.
          </p>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Nossos Valores</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((value) => (
              <div key={value.title} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <value.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Comece hoje mesmo</h2>
          <p className="text-muted-foreground mb-6">
            Crie sua conta gratuita e descubra como a Fitlynutri pode transformar seu negócio fitness.
          </p>
          <Link href="/register" className="btn-primary inline-flex items-center gap-2 text-sm py-3 px-6">
            Criar conta grátis
          </Link>
        </div>
      </div>
    </div>
  );
}
