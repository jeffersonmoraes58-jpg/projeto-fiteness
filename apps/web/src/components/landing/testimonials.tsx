'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Rodrigo Mendes',
    role: 'Personal Trainer',
    location: 'São Paulo, SP',
    avatar: 'RM',
    rating: 5,
    text: 'O FitSaaS transformou meu negócio. Antes eu usava planilhas e WhatsApp, agora tenho tudo integrado. Minha produtividade triplicou e consigo acompanhar mais alunos com menos esforço.',
  },
  {
    name: 'Carla Oliveira',
    role: 'Nutricionista',
    location: 'Rio de Janeiro, RJ',
    avatar: 'CO',
    rating: 5,
    text: 'A calculadora de macros automática e os planos alimentares salvaram horas do meu dia. Meus pacientes adoram o app e eu consigo acompanhar a evolução deles em tempo real.',
  },
  {
    name: 'Studio FitLife',
    role: 'Academia',
    location: 'Belo Horizonte, MG',
    avatar: 'FL',
    rating: 5,
    text: 'Migramos de um software desatualizado para o FitSaaS e a diferença foi enorme. O white-label nos deu uma identidade profissional e os alunos engajaram muito mais com a gamificação.',
  },
  {
    name: 'Marcus Silva',
    role: 'Personal Trainer',
    location: 'Curitiba, PR',
    avatar: 'MS',
    rating: 5,
    text: 'A IA de sugestão de treinos é incrível. Ela analisa o perfil do aluno e já sugere o treino ideal. Economizo pelo menos 2 horas por dia que antes gastava montando programações do zero.',
  },
  {
    name: 'Ana Paula',
    role: 'Nutricionista Esportiva',
    location: 'Brasília, DF',
    avatar: 'AP',
    rating: 5,
    text: 'O controle de pagamentos integrado resolveu um dos meus maiores problemas. Hoje não preciso mais correr atrás de boleto e tenho relatório financeiro completo em tempo real.',
  },
  {
    name: 'MaxFit Academy',
    role: 'Rede de Academias',
    location: 'São Paulo, SP',
    avatar: 'MA',
    rating: 5,
    text: 'Com 5 unidades e 200 funcionários, precisávamos de uma solução robusta. O FitSaaS Enterprise atendeu tudo: multi-tenant, domínio próprio e suporte dedicado. Recomendo muito.',
  },
];

export function LandingTestimonials() {
  return (
    <section id="testimonials" className="py-32 bg-gradient-dark">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Quem usa,
            <span className="gradient-text"> recomenda</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Mais de 2.800 profissionais de fitness confiam no FitSaaS para gerenciar seus negócios.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card card-hover"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{testimonial.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {testimonial.role} · {testimonial.location}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
