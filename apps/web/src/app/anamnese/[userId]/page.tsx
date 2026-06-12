'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface Question {
  id: keyof AnamneseAnswers;
  label: string;
  type: 'boolean' | 'select' | 'text' | 'number' | 'textarea';
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
  dependsOn?: { id: keyof AnamneseAnswers; value: any };
}

interface AnamneseAnswers {
  practicesExercise?: boolean;
  exerciseFrequency?: string;
  previousInjuries?: string;
  surgeries?: string;
  cardiovascularIssues?: boolean;
  bloodPressure?: string;
  cholesterol?: string;
  diabetes?: boolean;
  smoking?: boolean;
  alcohol?: string;
  sleepHours?: number;
  stressLevel?: number;
  mainGoal?: string;
  observations?: string;
}

const QUESTIONS_BY_TYPE: Record<string, Question[]> = {
  'Anamnese Geral': [
    { id: 'practicesExercise', label: 'Você pratica alguma atividade física atualmente?', type: 'boolean' },
    { id: 'exerciseFrequency', label: 'Com que frequência você se exercita?', type: 'select', options: ['1x por semana', '2x por semana', '3x por semana', '4x ou mais por semana'], dependsOn: { id: 'practicesExercise', value: true } },
    { id: 'previousInjuries', label: 'Você tem ou já teve alguma lesão? Se sim, descreva.', type: 'textarea', placeholder: 'Ex: lesão no joelho direito em 2022...' },
    { id: 'surgeries', label: 'Já realizou alguma cirurgia? Se sim, descreva.', type: 'textarea', placeholder: 'Ex: apendicite em 2019...' },
    { id: 'cardiovascularIssues', label: 'Você tem ou já teve algum problema cardiovascular?', type: 'boolean' },
    { id: 'bloodPressure', label: 'Como está sua pressão arterial?', type: 'select', options: ['Normal', 'Alta (hipertensão)', 'Baixa (hipotensão)', 'Não sei'] },
    { id: 'cholesterol', label: 'Como está seu colesterol?', type: 'select', options: ['Normal', 'Alto', 'Não sei'] },
    { id: 'diabetes', label: 'Você tem diabetes?', type: 'boolean' },
    { id: 'smoking', label: 'Você fuma?', type: 'boolean' },
    { id: 'alcohol', label: 'Com que frequência você consome bebida alcoólica?', type: 'select', options: ['Nunca', 'Raramente', 'Fins de semana', 'Frequentemente'] },
    { id: 'sleepHours', label: 'Quantas horas você dorme por noite, em média?', type: 'number', min: 1, max: 14, placeholder: '7' },
    { id: 'stressLevel', label: 'Em uma escala de 1 a 10, qual é seu nível de estresse no dia a dia?', type: 'number', min: 1, max: 10, placeholder: '5' },
    { id: 'mainGoal', label: 'Qual é o seu principal objetivo com o treinamento?', type: 'textarea', placeholder: 'Ex: perder peso, ganhar massa muscular, melhorar condicionamento...' },
    { id: 'observations', label: 'Tem mais alguma informação relevante que queira compartilhar?', type: 'textarea', placeholder: 'Informações adicionais (opcional)...' },
  ],
  'Anamnese Fitness': [
    { id: 'practicesExercise', label: 'Você pratica alguma atividade física atualmente?', type: 'boolean' },
    { id: 'exerciseFrequency', label: 'Quantas vezes por semana você treina?', type: 'select', options: ['1x por semana', '2x por semana', '3x por semana', '4x ou mais por semana'], dependsOn: { id: 'practicesExercise', value: true } },
    { id: 'previousInjuries', label: 'Você tem ou já teve alguma lesão muscular ou articular?', type: 'textarea', placeholder: 'Descreva a lesão e quando ocorreu, ou deixe em branco se não tiver...' },
    { id: 'surgeries', label: 'Já realizou alguma cirurgia ortopédica ou que afete o movimento?', type: 'textarea', placeholder: 'Descreva ou deixe em branco...' },
    { id: 'cardiovascularIssues', label: 'Você tem algum problema cardiovascular que limite o esforço físico?', type: 'boolean' },
    { id: 'bloodPressure', label: 'Sua pressão arterial é:', type: 'select', options: ['Normal', 'Alta (hipertensão)', 'Baixa (hipotensão)', 'Não sei'] },
    { id: 'diabetes', label: 'Você tem diabetes?', type: 'boolean' },
    { id: 'sleepHours', label: 'Quantas horas você dorme por noite?', type: 'number', min: 1, max: 14, placeholder: '7' },
    { id: 'stressLevel', label: 'Nível de estresse diário (1 = tranquilo, 10 = muito estressado)', type: 'number', min: 1, max: 10, placeholder: '5' },
    { id: 'mainGoal', label: 'Qual é seu principal objetivo com o treino?', type: 'select', options: ['Perda de peso', 'Ganho de massa muscular', 'Condicionamento físico', 'Saúde e bem-estar', 'Performance esportiva', 'Reabilitação'] },
    { id: 'observations', label: 'Alguma informação adicional para seu personal trainer?', type: 'textarea', placeholder: 'Limitações, preferências de treino, horários... (opcional)' },
  ],
  'Anamnese Nutricional': [
    { id: 'practicesExercise', label: 'Você pratica alguma atividade física?', type: 'boolean' },
    { id: 'exerciseFrequency', label: 'Com que frequência?', type: 'select', options: ['1x por semana', '2x por semana', '3x por semana', '4x ou mais por semana'], dependsOn: { id: 'practicesExercise', value: true } },
    { id: 'previousInjuries', label: 'Tem alguma restrição alimentar? (intolerância, alergia, preferência)', type: 'textarea', placeholder: 'Ex: intolerante a lactose, alergia a amendoim, vegetariano...' },
    { id: 'diabetes', label: 'Você tem diabetes?', type: 'boolean' },
    { id: 'cholesterol', label: 'Seu colesterol está:', type: 'select', options: ['Normal', 'Alto', 'Não sei'] },
    { id: 'bloodPressure', label: 'Sua pressão arterial é:', type: 'select', options: ['Normal', 'Alta (hipertensão)', 'Baixa (hipotensão)', 'Não sei'] },
    { id: 'alcohol', label: 'Com que frequência consome bebida alcoólica?', type: 'select', options: ['Nunca', 'Raramente', 'Fins de semana', 'Frequentemente'] },
    { id: 'sleepHours', label: 'Quantas horas você dorme por noite?', type: 'number', min: 1, max: 14, placeholder: '7' },
    { id: 'stressLevel', label: 'Nível de estresse diário (1 a 10)', type: 'number', min: 1, max: 10, placeholder: '5' },
    { id: 'mainGoal', label: 'Qual é o seu objetivo com o acompanhamento nutricional?', type: 'select', options: ['Emagrecimento', 'Ganho de massa muscular', 'Manutenção do peso', 'Reeducação alimentar', 'Performance esportiva', 'Saúde geral'] },
    { id: 'observations', label: 'Informações adicionais (hábitos alimentares, alimentos que não gosta, etc.)', type: 'textarea', placeholder: 'Conte mais sobre sua alimentação atual... (opcional)' },
  ],
  'Anamnese de Saúde': [
    { id: 'practicesExercise', label: 'Você pratica alguma atividade física regularmente?', type: 'boolean' },
    { id: 'cardiovascularIssues', label: 'Você tem ou já teve algum problema cardiovascular?', type: 'boolean' },
    { id: 'bloodPressure', label: 'Como está sua pressão arterial?', type: 'select', options: ['Normal', 'Alta (hipertensão)', 'Baixa (hipotensão)', 'Não sei'] },
    { id: 'cholesterol', label: 'Como está seu colesterol?', type: 'select', options: ['Normal', 'Alto', 'Baixo', 'Não sei'] },
    { id: 'diabetes', label: 'Você tem diabetes?', type: 'boolean' },
    { id: 'previousInjuries', label: 'Tem alguma lesão ou problema articular?', type: 'textarea', placeholder: 'Descreva ou deixe em branco...' },
    { id: 'surgeries', label: 'Já realizou alguma cirurgia?', type: 'textarea', placeholder: 'Descreva ou deixe em branco...' },
    { id: 'smoking', label: 'Você fuma?', type: 'boolean' },
    { id: 'alcohol', label: 'Frequência de consumo de álcool:', type: 'select', options: ['Nunca', 'Raramente', 'Fins de semana', 'Frequentemente'] },
    { id: 'sleepHours', label: 'Quantas horas dorme por noite?', type: 'number', min: 1, max: 14, placeholder: '7' },
    { id: 'stressLevel', label: 'Nível de estresse no dia a dia (1 a 10)', type: 'number', min: 1, max: 10, placeholder: '5' },
    { id: 'mainGoal', label: 'Qual é seu principal objetivo?', type: 'textarea', placeholder: 'Ex: melhorar saúde, perder peso, mais disposição...' },
    { id: 'observations', label: 'Alguma outra informação importante sobre sua saúde?', type: 'textarea', placeholder: 'Medicamentos em uso, condições específicas... (opcional)' },
  ],
};

const DEFAULT_TYPE = 'Anamnese Geral';

export default function AnamnesePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.userId as string;
  const type = searchParams.get('type') || DEFAULT_TYPE;

  const questions = (QUESTIONS_BY_TYPE[type] || QUESTIONS_BY_TYPE[DEFAULT_TYPE]).filter(
    (q) => !q.dependsOn,
  );

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnamneseAnswers>({});
  const [visibleQuestions, setVisibleQuestions] = useState<Question[]>(questions);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyFilled, setAlreadyFilled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_URL + '/api/v1';

  useEffect(() => {
    fetch(`${apiBase}/students/public/anamnese/${userId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.filled) setAlreadyFilled(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, apiBase]);

  useEffect(() => {
    const allQ = QUESTIONS_BY_TYPE[type] || QUESTIONS_BY_TYPE[DEFAULT_TYPE];
    const visible = allQ.filter((q) => {
      if (!q.dependsOn) return true;
      return answers[q.dependsOn.id] === q.dependsOn.value;
    });
    setVisibleQuestions(visible);
  }, [answers, type]);

  const current = visibleQuestions[step];
  const progress = Math.round(((step) / visibleQuestions.length) * 100);

  const setAnswer = (value: any) => {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  };

  const handleNext = () => {
    if (step < visibleQuestions.length - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload: any = { anamneseType: type, ...answers };
      const res = await fetch(`${apiBase}/students/public/anamnese/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erro ao enviar');
      setSubmitted(true);
    } catch {
      setError('Erro ao enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = step === visibleQuestions.length - 1;
  const currentAnswer = current ? answers[current.id] : undefined;
  const canAdvance = current?.type === 'textarea' || current?.type === 'text'
    ? true
    : currentAnswer !== undefined && currentAnswer !== '';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (alreadyFilled) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Anamnese já preenchida!</h1>
          <p className="text-slate-400">Sua anamnese já foi enviada anteriormente. Seu personal trainer já tem acesso às suas informações.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Anamnese enviada!</h1>
            <p className="text-slate-400">Suas respostas foram registradas com sucesso. Seu personal trainer já pode visualizá-las no sistema.</p>
          </div>
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4">
            <p className="text-violet-300 text-sm">Agora você pode acessar a plataforma para ver seu plano de treinos e acompanhar sua evolução. 💪</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="text-white font-bold text-lg">Fitlynutri</div>
          <div className="text-violet-200 text-sm">{type}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 to-blue-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Step counter */}
      <div className="max-w-lg mx-auto w-full px-4 pt-4">
        <div className="text-slate-400 text-xs text-right">
          {step + 1} / {visibleQuestions.length}
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="max-w-lg w-full">
          <AnimatePresence mode="wait">
            {current && (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-white leading-snug">
                  {current.label}
                </h2>

                {/* Boolean */}
                {current.type === 'boolean' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['Sim', 'Não'].map((opt) => {
                      const val = opt === 'Sim';
                      const selected = currentAnswer === val;
                      return (
                        <button
                          key={opt}
                          onClick={() => setAnswer(val)}
                          className={`py-4 rounded-2xl font-semibold text-base transition-all border-2 ${
                            selected
                              ? 'bg-violet-600 border-violet-500 text-white'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:border-violet-500/50'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Select */}
                {current.type === 'select' && current.options && (
                  <div className="space-y-2">
                    {current.options.map((opt) => {
                      const selected = currentAnswer === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setAnswer(opt)}
                          className={`w-full text-left py-3 px-4 rounded-xl font-medium text-sm transition-all border-2 ${
                            selected
                              ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:border-violet-500/40'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Number */}
                {current.type === 'number' && (
                  <div className="space-y-4">
                    <input
                      type="number"
                      min={current.min}
                      max={current.max}
                      value={currentAnswer as number ?? ''}
                      onChange={(e) => setAnswer(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder={current.placeholder}
                      className="w-full bg-white/5 border-2 border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white text-lg outline-none transition-colors"
                    />
                    {current.min !== undefined && current.max !== undefined && (
                      <div className="text-slate-500 text-xs">Entre {current.min} e {current.max}</div>
                    )}
                  </div>
                )}

                {/* Text / Textarea */}
                {(current.type === 'text' || current.type === 'textarea') && (
                  <textarea
                    rows={current.type === 'textarea' ? 3 : 1}
                    value={(currentAnswer as string) ?? ''}
                    onChange={(e) => setAnswer(e.target.value || undefined)}
                    placeholder={current.placeholder}
                    className="w-full bg-white/5 border-2 border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors resize-none"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-lg mx-auto w-full px-4 pb-8 space-y-3">
        {isLastStep ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold text-base disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Enviando...' : 'Enviar anamnese ✓'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!canAdvance}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
          >
            Próximo
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {step > 0 && (
          <button
            onClick={handleBack}
            className="w-full py-3 rounded-2xl bg-white/5 text-slate-400 font-medium text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
        )}
      </div>
    </div>
  );
}
