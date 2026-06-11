'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Sparkles, User, Copy, RefreshCw,
  Apple, Target, Flame, Zap, ChevronRight, Settings2,
  CheckCircle2, ChevronDown, ChevronUp, Trash2, Save,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AiConfig {
  assistantName: string;
  approaches: string[];
  patientProfiles: string[];
  tone: string;
  focusAreas: string[];
  avoidAreas: string[];
  extraNotes: string;
}

const EMPTY_CONFIG: AiConfig = {
  assistantName: '',
  approaches: [],
  patientProfiles: [],
  tone: '',
  focusAreas: [],
  avoidAreas: [],
  extraNotes: '',
};

// ─── Training options ─────────────────────────────────────────────────────────

const APPROACHES = [
  { value: 'funcional', label: 'Nutrição Funcional' },
  { value: 'low-carb', label: 'Low-carb / Cetogênica' },
  { value: 'iifym', label: 'Dieta Flexível (IIFYM)' },
  { value: 'esportiva', label: 'Nutrição Esportiva' },
  { value: 'clinica', label: 'Nutrição Clínica' },
  { value: 'vegetariana', label: 'Vegetariana / Vegana' },
];

const PATIENT_PROFILES = [
  { value: 'emagrecimento', label: 'Emagrecimento' },
  { value: 'hipertrofia', label: 'Hipertrofia / Ganho muscular' },
  { value: 'atletas', label: 'Atletas de alta performance' },
  { value: 'doencas', label: 'Doenças crônicas (diabetes, hipertensão)' },
  { value: 'preventiva', label: 'Saúde preventiva / Longevidade' },
  { value: 'gestantes', label: 'Gestantes / Pós-parto' },
];

const TONES = [
  { value: 'tecnico', label: 'Técnico e preciso', desc: 'Linguagem clínica, foco em números e protocolos' },
  { value: 'didatico', label: 'Didático e acessível', desc: 'Explica o porquê de cada recomendação' },
  { value: 'motivacional', label: 'Motivacional e próximo', desc: 'Encoraja e humaniza as respostas' },
  { value: 'direto', label: 'Conciso e direto', desc: 'Respostas curtas e objetivas, sem rodeios' },
];

const FOCUS_AREAS = [
  { value: 'macros', label: 'Cálculo preciso de macros e calorias' },
  { value: 'cardapios', label: 'Sugestão de cardápios completos' },
  { value: 'ciencia', label: 'Embasamento científico das recomendações' },
  { value: 'substituicoes', label: 'Substituições alimentares práticas' },
  { value: 'suplementacao', label: 'Protocolos de suplementação' },
  { value: 'comportamento', label: 'Comportamento alimentar e adesão' },
];

const AVOID_AREAS = [
  { value: 'sem_evidencia', label: 'Sugestões sem evidência científica' },
  { value: 'restritivo', label: 'Dietas extremamente restritivas' },
  { value: 'marcas', label: 'Indicar marcas ou produtos específicos' },
  { value: 'complexo', label: 'Linguagem excessivamente técnica' },
  { value: 'generalizacoes', label: 'Generalizações sem considerar o contexto' },
];

const SUGGESTIONS = [
  { icon: Apple, label: 'Gerar dieta de 1800 kcal para perda de peso', color: 'text-emerald-400' },
  { icon: Target, label: 'Calcular macros para ganho muscular de 80kg/1,75m', color: 'text-cyan-400' },
  { icon: Flame, label: 'Cardápio semanal para intolerante à lactose', color: 'text-orange-400' },
  { icon: Zap, label: 'Alimentos ricos em proteína para pós-treino', color: 'text-purple-400' },
];

// ─── Build context string from config ────────────────────────────────────────

function buildContext(cfg: AiConfig): string {
  const lines: string[] = [];

  if (cfg.assistantName)
    lines.push(`Você se chama: ${cfg.assistantName}`);

  if (cfg.approaches.length) {
    const labels = cfg.approaches.map((v) => APPROACHES.find((a) => a.value === v)?.label ?? v);
    lines.push(`Abordagens nutricionais que você domina e deve priorizar: ${labels.join(', ')}`);
  }

  if (cfg.patientProfiles.length) {
    const labels = cfg.patientProfiles.map((v) => PATIENT_PROFILES.find((p) => p.value === v)?.label ?? v);
    lines.push(`Perfil dos pacientes atendidos: ${labels.join(', ')}. Adapte sempre as respostas a esse público.`);
  }

  if (cfg.tone) {
    const t = TONES.find((x) => x.value === cfg.tone);
    lines.push(`Tom obrigatório de todas as suas respostas: ${t?.label} — ${t?.desc}. Mantenha esse tom em todas as mensagens, sem exceção.`);
  }

  if (cfg.focusAreas.length) {
    const labels = cfg.focusAreas.map((v) => FOCUS_AREAS.find((f) => f.value === v)?.label ?? v);
    lines.push(`Sempre priorize nas respostas: ${labels.join(', ')}`);
  }

  if (cfg.avoidAreas.length) {
    const labels = cfg.avoidAreas.map((v) => AVOID_AREAS.find((a) => a.value === v)?.label ?? v);
    lines.push(`Nunca faça nas respostas: ${labels.join(', ')}`);
  }

  if (cfg.extraNotes)
    lines.push(`Instruções adicionais do nutricionista (SEGUIR OBRIGATORIAMENTE): ${cfg.extraNotes}`);

  return lines.join('\n');
}

function isConfigured(cfg: AiConfig) {
  return cfg.approaches.length > 0 || cfg.patientProfiles.length > 0 || cfg.tone !== '';
}

// ─── Multi-select pill ────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
        active
          ? 'bg-primary/20 border-primary text-primary'
          : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/30',
      )}
    >
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NutritionistAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Olá! Sou sua assistente de IA especializada em nutrição. Posso ajudar com:\n\n• Geração de planos alimentares personalizados\n• Cálculo de macronutrientes e calorias\n• Sugestões de substituições alimentares\n• Análise de dietas e ajustes\n• Cardápios para restrições alimentares\n\nComo posso ajudar você hoje?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [config, setConfig] = useState<AiConfig>(() => {
    if (typeof window === 'undefined') return EMPTY_CONFIG;
    try {
      const saved = localStorage.getItem('fitlynutri-ai-config');
      return saved ? JSON.parse(saved) : EMPTY_CONFIG;
    } catch {
      return EMPTY_CONFIG;
    }
  });
  const [draft, setDraft] = useState<AiConfig>(config);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const buildHistory = (msgs: Message[]) =>
    msgs.slice(1).map((m) => ({ role: m.role, content: m.content }));

  const sendMutation = useMutation({
    mutationFn: ({ message, history }: { message: string; history: any[] }) => {
      const context = isConfigured(config) ? buildContext(config) : undefined;
      return api.post('/ai/assistant', { message, history, context }).then((r) => r.data.data);
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.reply || data.response || String(data),
        timestamp: new Date(),
      }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
        timestamp: new Date(),
      }]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const content = text || input.trim();
    if (!content) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      sendMutation.mutate({ message: content, history: buildHistory(next) });
      return next;
    });
    setInput('');
  };

  const toggleMulti = (key: keyof AiConfig, value: string) => {
    setDraft((prev) => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const saveConfig = () => {
    setConfig(draft);
    localStorage.setItem('fitlynutri-ai-config', JSON.stringify(draft));
    setTrainingOpen(false);
    // Reset chat so AI greets with new config
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: `Configurações salvas! Agora estou preparado para atuar com foco em ${draft.approaches.length ? draft.approaches.join(', ') : 'nutrição geral'} e para pacientes com objetivo de ${draft.patientProfiles.length ? draft.patientProfiles.join(', ') : 'saúde geral'}. Como posso ajudar?`,
      timestamp: new Date(),
    }]);
  };

  const clearConfig = () => {
    setDraft(EMPTY_CONFIG);
    setConfig(EMPTY_CONFIG);
    localStorage.removeItem('fitlynutri-ai-config');
  };

  const configured = isConfigured(config);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">IA Nutrição</h1>
          <p className="text-sm text-muted-foreground">Assistente especializado em nutrição</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {configured && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              IA treinada
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </div>
        </div>
      </div>

      {/* ── Training panel ── */}
      <div className="glass rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => { setDraft(config); setTrainingOpen((o) => !o); }}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-all"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
            <Settings2 className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">Treine seu Assistente IA Nutrição</p>
            <p className="text-xs text-muted-foreground">
              {configured ? 'Configuração salva — clique para editar' : 'Configure o perfil para respostas mais precisas'}
            </p>
          </div>
          {trainingOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {trainingOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-5 border-t border-white/5 pt-4">

                {/* Nome do assistente */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Como seu assistente deve se apresentar?
                  </label>
                  <input
                    type="text"
                    value={draft.assistantName}
                    onChange={(e) => setDraft((p) => ({ ...p, assistantName: e.target.value }))}
                    placeholder='Ex: "Assistente da Dra. Ana, especialista em nutrição esportiva"'
                    className="input-field text-sm w-full"
                  />
                </div>

                {/* Abordagem */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Qual(is) abordagem(ns) nutricional você utiliza?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {APPROACHES.map((a) => (
                      <Pill
                        key={a.value}
                        label={a.label}
                        active={draft.approaches.includes(a.value)}
                        onClick={() => toggleMulti('approaches', a.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Perfil de pacientes */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Qual o perfil principal dos seus pacientes?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PATIENT_PROFILES.map((p) => (
                      <Pill
                        key={p.value}
                        label={p.label}
                        active={draft.patientProfiles.includes(p.value)}
                        onClick={() => toggleMulti('patientProfiles', p.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Tom */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Qual tom de comunicação prefere?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setDraft((p) => ({ ...p, tone: p.tone === t.value ? '' : t.value }))}
                        className={cn(
                          'text-left p-3 rounded-xl border text-sm transition-all',
                          draft.tone === t.value
                            ? 'bg-primary/20 border-primary'
                            : 'bg-white/5 border-white/10 hover:border-white/30',
                        )}
                      >
                        <div className="font-medium text-xs">{t.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Foco */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    O que deve ser priorizado nas respostas?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FOCUS_AREAS.map((f) => (
                      <Pill
                        key={f.value}
                        label={f.label}
                        active={draft.focusAreas.includes(f.value)}
                        onClick={() => toggleMulti('focusAreas', f.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Evitar */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    O que a IA deve evitar?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVOID_AREAS.map((a) => (
                      <Pill
                        key={a.value}
                        label={a.label}
                        active={draft.avoidAreas.includes(a.value)}
                        onClick={() => toggleMulti('avoidAreas', a.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Observações livres */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Algo mais que a IA deve saber sobre sua prática?
                  </label>
                  <textarea
                    value={draft.extraNotes}
                    onChange={(e) => setDraft((p) => ({ ...p, extraNotes: e.target.value }))}
                    placeholder="Ex: Meus pacientes são majoritariamente mulheres entre 25-45 anos. Prefiro sempre sugerir opções com ingredientes acessíveis e de baixo custo..."
                    rows={3}
                    className="input-field text-sm w-full resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={clearConfig}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar configuração
                  </button>
                  <button
                    type="button"
                    onClick={saveConfig}
                    className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar e treinar IA
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pr-1">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}
            >
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-600'
                  : 'bg-gradient-to-br from-cyan-600 to-blue-600',
              )}>
                {msg.role === 'assistant'
                  ? <Brain className="w-4 h-4 text-white" />
                  : <User className="w-4 h-4 text-white" />
                }
              </div>

              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm relative group',
                msg.role === 'assistant'
                  ? 'glass rounded-tl-sm'
                  : 'bg-primary text-primary-foreground rounded-tr-sm',
              )}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <div className={cn(
                  'text-[10px] mt-2',
                  msg.role === 'assistant' ? 'text-muted-foreground' : 'text-primary-foreground/70',
                )}>
                  {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent flex items-center justify-center transition-all"
                    title="Copiar"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sendMutation.isPending && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {messages.length === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
            <p className="text-xs text-muted-foreground text-center mb-3">Sugestões</p>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s.label)}
                className="w-full flex items-center gap-3 p-3 glass rounded-xl hover:bg-accent transition-all text-left group"
              >
                <s.icon className={`w-4 h-4 ${s.color} flex-shrink-0`} />
                <span className="text-sm flex-1">{s.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="glass rounded-2xl p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Descreva o que precisa... (Enter para enviar)"
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none py-2 px-2 max-h-32 overflow-y-auto scrollbar-hide"
            style={{ fieldSizing: 'content' } as any}
          />
          <div className="flex items-center gap-1.5 pb-1">
            <button
              onClick={() => setMessages([messages[0]])}
              className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-all"
              title="Nova conversa"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sendMutation.isPending}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                input.trim() && !sendMutation.isPending
                  ? 'bg-primary hover:bg-primary/80'
                  : 'bg-muted cursor-not-allowed',
              )}
            >
              {sendMutation.isPending
                ? <Sparkles className="w-4 h-4 text-muted-foreground animate-spin" />
                : <Send className="w-4 h-4 text-white" />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
