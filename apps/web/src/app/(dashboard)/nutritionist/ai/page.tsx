'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, Copy, RefreshCw, X, Users, Search,
  Apple, Calendar, Shuffle, FileText, ClipboardList, Loader2,
  ChefHat, Utensils, ChevronDown, Wand2, CheckCircle2,
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToolId = 'meal_plan' | 'weekly_menu' | 'food_substitution' | 'diary_analysis' | 'guidelines';

interface ToolConfig {
  id: ToolId;
  label: string;
  description: string;
  icon: typeof Apple;
  color: string;
  bgColor: string;
  needsPatient: boolean;
  params?: { key: string; label: string; placeholder: string; type: 'number' | 'text' | 'textarea'; required?: boolean }[];
}

const TOOLS: ToolConfig[] = [
  {
    id: 'meal_plan',
    label: 'Gerar Plano Alimentar',
    description: 'Cria dieta completa com macros e refeições usando dados do paciente',
    icon: ChefHat,
    color: 'text-emerald-400',
    bgColor: 'from-emerald-600/20 to-teal-600/10 border-emerald-500/30',
    needsPatient: true,
    params: [
      { key: 'calories', label: 'Meta calórica (kcal)', placeholder: 'Ex: 1800 — ou deixe vazio para cálculo automático', type: 'number' },
      { key: 'meals', label: 'Número de refeições/dia', placeholder: '5', type: 'number' },
    ],
  },
  {
    id: 'weekly_menu',
    label: 'Montar Cardápio Semanal',
    description: 'Gera 7 dias de café, almoço, jantar e lanches variados',
    icon: Calendar,
    color: 'text-purple-400',
    bgColor: 'from-purple-600/20 to-violet-600/10 border-purple-500/30',
    needsPatient: true,
    params: [
      { key: 'calories', label: 'Meta calórica diária (kcal)', placeholder: 'Ex: 2000 — ou deixe vazio para automático', type: 'number' },
    ],
  },
  {
    id: 'food_substitution',
    label: 'Sugerir Substituições',
    description: 'Sugere alternativas saudáveis para qualquer alimento',
    icon: Shuffle,
    color: 'text-orange-400',
    bgColor: 'from-orange-600/20 to-amber-600/10 border-orange-500/30',
    needsPatient: false,
    params: [
      { key: 'food', label: 'Alimento a substituir', placeholder: 'Ex: pão francês, leite integral, arroz branco...', type: 'text', required: true },
      { key: 'reason', label: 'Motivo da substituição', placeholder: 'Ex: reduzir carboidratos, intolerância, mais proteína...', type: 'text' },
    ],
  },
  {
    id: 'diary_analysis',
    label: 'Analisar Diário Alimentar',
    description: 'Analisa relato alimentar do paciente e aponta melhorias',
    icon: ClipboardList,
    color: 'text-cyan-400',
    bgColor: 'from-cyan-600/20 to-blue-600/10 border-cyan-500/30',
    needsPatient: true,
    params: [
      { key: 'diary', label: 'Diário alimentar', placeholder: 'Cole o relato alimentar do paciente aqui... (ex: "Café: 2 ovos, 1 pão. Almoço: arroz, feijão, frango...")', type: 'textarea', required: true },
    ],
  },
  {
    id: 'guidelines',
    label: 'Gerar Orientações',
    description: 'Carta de orientações nutricionais personalizada',
    icon: FileText,
    color: 'text-pink-400',
    bgColor: 'from-pink-600/20 to-rose-600/10 border-pink-500/30',
    needsPatient: true,
    params: [],
  },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NutritionistAIToolbox() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  // Active tool panel
  const [activeTool, setActiveTool] = useState<ToolConfig | null>(null);
  const [toolParams, setToolParams] = useState<Record<string, string>>({});
  const [toolResult, setToolResult] = useState<any>(null);

  // Mini-chat (secondary)
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Olá! Use as ferramentas acima para gerar planos, cardápios e orientações. Se preferir, também posso responder perguntas rápidas aqui no chat.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch patients
  const { data: patients } = useQuery({
    queryKey: ['nutritionist-patients-ai'],
    queryFn: () => api.get('/nutritionists/me/patients').then((r) => r.data.data),
  });

  const selectedPatient = patients?.find((p: any) => p.id === selectedPatientId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(e.target as Node)) {
        setPatientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredPatients = (patients || []).filter((p: any) => {
    if (!patientSearch) return true;
    const name = `${p.user?.profile?.firstName || ''} ${p.user?.profile?.lastName || ''}`.toLowerCase();
    return name.includes(patientSearch.toLowerCase());
  });

  // ── Tool execution ──────────────────────────────────────────────────────

  const toolMutation = useMutation({
    mutationFn: ({ tool, patientId, params }: { tool: string; patientId?: string; params?: any }) =>
      api.post('/ai/nutrition-tool', { tool, patientId, params }).then((r) => r.data.data),
    onSuccess: (data) => setToolResult(data),
  });

  const runTool = (tool: ToolConfig) => {
    setActiveTool(tool);
    setToolParams({});
    setToolResult(null);
  };

  const submitTool = () => {
    if (!activeTool) return;
    const params: any = {};
    activeTool.params?.forEach((p) => {
      const val = toolParams[p.key];
      if (val) params[p.key] = p.type === 'number' ? Number(val) : val;
    });
    toolMutation.mutate({
      tool: activeTool.id,
      patientId: activeTool.needsPatient ? selectedPatientId || undefined : undefined,
      params,
    });
  };

  const closeTool = () => {
    setActiveTool(null);
    setToolResult(null);
    setToolParams({});
  };

  // ── Mini-chat ────────────────────────────────────────────────────────────

  const chatMutation = useMutation({
    mutationFn: ({ message, history }: { message: string; history: any[] }) =>
      api.post('/ai/assistant', { message, history }).then((r) => r.data.data),
    onSuccess: (data: any) => {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.reply || data.response || 'Resposta não disponível.',
        timestamp: new Date(),
      }]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleChatSend = (text?: string) => {
    const content = text || input.trim();
    if (!content) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      const history = next.slice(-15).map((m) => ({ role: m.role, content: m.content }));
      chatMutation.mutate({ message: content, history });
      return next;
    });
    setInput('');
  };

  // ── Result renderers ─────────────────────────────────────────────────────

  const renderResult = () => {
    if (!toolResult) return null;
    const t = activeTool?.id;

    if (t === 'meal_plan') return <MealPlanResult data={toolResult} />;
    if (t === 'weekly_menu') return <WeeklyMenuResult data={toolResult} />;
    if (t === 'food_substitution') return <SubstitutionResult data={toolResult} />;
    if (t === 'diary_analysis') return <DiaryResult data={toolResult} />;
    if (t === 'guidelines') return <GuidelinesResult data={toolResult} />;

    return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(toolResult, null, 2)}</pre>;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
          <Wand2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Ferramentas IA</h1>
          <p className="text-sm text-muted-foreground">
            {selectedPatient
              ? `Paciente: ${selectedPatient.user?.profile?.firstName} ${selectedPatient.user?.profile?.lastName}`
              : 'Selecione um paciente ou use ferramentas independentes'}
          </p>
        </div>
      </div>

      {/* ── Patient selector ── */}
      <div className="glass rounded-2xl px-4 py-3" ref={patientDropdownRef}>
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setPatientDropdownOpen(!patientDropdownOpen)}
              className="w-full flex items-center justify-between text-sm hover:bg-accent/30 rounded-lg px-3 py-2 transition-all"
            >
              <span className={selectedPatient ? 'font-medium' : 'text-muted-foreground'}>
                {selectedPatient
                  ? `${selectedPatient.user?.profile?.firstName || ''} ${selectedPatient.user?.profile?.lastName || ''}`.trim()
                  : 'Selecionar paciente (necessário para planos, cardápios e orientações)'}
              </span>
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', patientDropdownOpen && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {patientDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-20 max-h-60 overflow-hidden"
                >
                  <div className="p-2 border-b border-border/30">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar paciente..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="w-full bg-transparent text-xs pl-8 py-1.5 focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    <button
                      type="button"
                      onClick={() => { setSelectedPatientId(''); setPatientDropdownOpen(false); setPatientSearch(''); }}
                      className={cn('w-full px-3 py-2 text-sm text-left hover:bg-accent transition-all flex items-center gap-2', !selectedPatientId && 'bg-primary/10')}
                    >
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Nenhum (ferramentas sem contexto)</span>
                    </button>
                    {filteredPatients.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedPatientId(p.id); setPatientDropdownOpen(false); setPatientSearch(''); }}
                        className={cn('w-full px-3 py-2 text-sm text-left hover:bg-accent transition-all flex items-center gap-2', selectedPatientId === p.id && 'bg-primary/10')}
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {p.user?.profile?.firstName?.[0]}{p.user?.profile?.lastName?.[0]}
                        </div>
                        <span className="truncate">{p.user?.profile?.firstName} {p.user?.profile?.lastName}</span>
                      </button>
                    ))}
                    {filteredPatients.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum paciente encontrado</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {selectedPatientId && (
            <button type="button" onClick={() => setSelectedPatientId('')} className="text-xs text-muted-foreground hover:text-foreground transition-colors" title="Remover paciente">✕</button>
          )}
        </div>
      </div>

      {/* ── Tool cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => runTool(tool)}
            disabled={tool.needsPatient && !selectedPatientId}
            className={cn(
              'relative text-left p-4 rounded-2xl border bg-gradient-to-br transition-all group',
              tool.bgColor,
              (tool.needsPatient && !selectedPatientId)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-[1.02] hover:shadow-lg cursor-pointer',
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center bg-black/20 flex-shrink-0', tool.color)}>
                <tool.icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">{tool.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{tool.description}</p>
              </div>
            </div>
            {tool.needsPatient && !selectedPatientId && (
              <span className="absolute top-2 right-2 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                Precisa paciente
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tool modal/painel ── */}
      <AnimatePresence>
        {activeTool && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-2xl overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-black/20', activeTool.color)}>
                    <activeTool.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{activeTool.label}</h3>
                    <p className="text-xs text-muted-foreground">{activeTool.description}</p>
                  </div>
                </div>
                <button onClick={closeTool} className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Params */}
              {activeTool.params && activeTool.params.length > 0 && !toolResult && (
                <div className="space-y-3 mb-4">
                  {activeTool.params.map((p) => (
                    <div key={p.key}>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                        {p.label}
                      </label>
                      {p.type === 'textarea' ? (
                        <textarea
                          value={toolParams[p.key] || ''}
                          onChange={(e) => setToolParams((prev) => ({ ...prev, [p.key]: e.target.value }))}
                          placeholder={p.placeholder}
                          rows={4}
                          className="input-field text-sm w-full resize-none"
                        />
                      ) : (
                        <input
                          type={p.type}
                          value={toolParams[p.key] || ''}
                          onChange={(e) => setToolParams((prev) => ({ ...prev, [p.key]: e.target.value }))}
                          placeholder={p.placeholder}
                          className="input-field text-sm w-full"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Result */}
              {toolResult && (
                <div className="mb-4 max-h-[50vh] overflow-y-auto">
                  {renderResult()}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!toolResult ? (
                  <button
                    type="button"
                    onClick={submitTool}
                    disabled={toolMutation.isPending || activeTool.params?.some((p) => p.required && !toolParams[p.key])}
                    className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
                  >
                    {toolMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Gerar</>
                    )}
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => setToolResult(null)} className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
                      <RefreshCw className="w-3.5 h-3.5" /> Refazer
                    </button>
                    <button type="button" onClick={() => navigator.clipboard.writeText(JSON.stringify(toolResult, null, 2))} className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
                      <Copy className="w-3.5 h-3.5" /> Copiar JSON
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mini chat (collapsible) ── */}
      <div className="glass rounded-2xl overflow-hidden mt-auto">
        <button
          type="button"
          onClick={() => setChatOpen(!chatOpen)}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-all"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium flex-1 text-left">Chat rápido</span>
          <span className="text-xs text-muted-foreground">Perguntas pontuais</span>
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', chatOpen && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {chatOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="border-t border-white/5 p-3">
                <div className="max-h-48 overflow-y-auto space-y-3 mb-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
                      <div className={cn('max-w-[85%] rounded-xl px-3 py-2 text-xs', msg.role === 'assistant' ? 'bg-white/5' : 'bg-primary/20')}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {chatMutation.isPending && <p className="text-xs text-muted-foreground animate-pulse">Pensando...</p>}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleChatSend(); }}
                    placeholder="Pergunta rápida..."
                    className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                  <button onClick={() => handleChatSend()} disabled={!input.trim() || chatMutation.isPending} className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 disabled:opacity-50">
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Result sub-components ─────────────────────────────────────────────────

function MealPlanResult({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ChefHat className="w-5 h-5 text-emerald-400" />
        <h3 className="font-bold text-lg">{data.name || 'Plano Alimentar'}</h3>
      </div>
      {data.totalCalories && (
        <p className="text-sm text-muted-foreground">
          Total: <strong>{data.totalCalories} kcal</strong>
          {data.macros && ` | Proteína: ${data.macros.protein}g | Carbs: ${data.macros.carbs}g | Gordura: ${data.macros.fat}g`}
        </p>
      )}
      {data.meals?.map((meal: any, i: number) => (
        <div key={i} className="glass rounded-xl p-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-sm">{meal.name}</h4>
            <span className="text-xs text-muted-foreground">{meal.time} · {meal.calories} kcal</span>
          </div>
          <div className="space-y-1">
            {meal.foods?.map((food: any, j: number) => (
              <div key={j} className="flex justify-between text-xs">
                <span>{food.name} — {food.quantity}{food.unit}</span>
                <span className="text-muted-foreground">{food.calories} kcal</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {data.tips?.length > 0 && (
        <div className="bg-amber-500/10 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-400 mb-1">💡 Dicas</p>
          {data.tips.map((tip: string, i: number) => <p key={i} className="text-xs">• {tip}</p>)}
        </div>
      )}
      {data.shoppingList?.length > 0 && (
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs font-semibold mb-1">🛒 Lista de compras</p>
          <div className="flex flex-wrap gap-1">
            {data.shoppingList.map((item: string, i: number) => (
              <span key={i} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{item}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklyMenuResult({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-purple-400" />
        <h3 className="font-bold text-lg">{data.name || 'Cardápio Semanal'}</h3>
      </div>
      <p className="text-sm text-muted-foreground">Meta diária: <strong>{data.dailyCalories || 'N/A'} kcal</strong></p>
      <div className="space-y-3">
        {data.days?.map((day: any, i: number) => (
          <div key={i} className="glass rounded-xl p-3">
            <h4 className="font-semibold text-sm mb-2">{day.day}</h4>
            <div className="space-y-1.5">
              {day.meals?.map((meal: any, j: number) => (
                <div key={j} className="flex justify-between text-xs">
                  <span className="font-medium">{meal.meal}</span>
                  <span className="text-muted-foreground flex-1 ml-2 truncate">{meal.description}</span>
                  <span className="ml-2">{meal.calories} kcal</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {data.shoppingList?.length > 0 && (
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-xs font-semibold mb-1">🛒 Lista de compras semanal</p>
          <div className="flex flex-wrap gap-1">
            {data.shoppingList.map((item: string, i: number) => <span key={i} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{item}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

function SubstitutionResult({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shuffle className="w-5 h-5 text-orange-400" />
        <h3 className="font-bold text-lg">Substituições para: {data.originalFood}</h3>
      </div>
      <p className="text-xs text-muted-foreground">Motivo: {data.reason}</p>
      <div className="space-y-2">
        {data.alternatives?.map((alt: any, i: number) => (
          <div key={i} className="glass rounded-xl p-3">
            <p className="font-semibold text-sm">{alt.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{alt.explanation}</p>
            {alt.nutritionalNote && <p className="text-[11px] text-emerald-400 mt-1">📊 {alt.nutritionalNote}</p>}
            {alt.preparation && <p className="text-[11px] text-amber-400 mt-0.5">🍳 {alt.preparation}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiaryResult({ data }: { data: any }) {
  const priorityColors: Record<string, string> = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-blue-400' };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-cyan-400" />
        <h3 className="font-bold text-lg">Análise do Diário Alimentar</h3>
      </div>
      <p className="text-sm">{data.summary}</p>
      {data.estimatedCalories && <p className="text-xs text-muted-foreground">Estimativa: ~{data.estimatedCalories} kcal</p>}
      {data.positives?.length > 0 && (
        <div className="bg-emerald-500/10 rounded-xl p-3">
          <p className="text-xs font-semibold text-emerald-400 mb-1">✅ Pontos fortes</p>
          {data.positives.map((p: string, i: number) => <p key={i} className="text-xs">• {p}</p>)}
        </div>
      )}
      {data.concerns?.length > 0 && (
        <div className="bg-amber-500/10 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-400 mb-1">⚠️ Pontos de atenção</p>
          {data.concerns.map((c: string, i: number) => <p key={i} className="text-xs">• {c}</p>)}
        </div>
      )}
      {data.recommendations?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold">📋 Recomendações</p>
          {data.recommendations.map((rec: any, i: number) => (
            <div key={i} className="glass rounded-xl p-3">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-semibold', priorityColors[rec.priority] || 'text-muted-foreground')}>{rec.title}</span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', rec.priority === 'high' ? 'bg-red-500/20 text-red-400' : rec.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400')}>{rec.priority}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{rec.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GuidelinesResult({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-pink-400" />
        <h3 className="font-bold text-lg">{data.title || 'Orientações Nutricionais'}</h3>
      </div>
      <p className="text-sm font-medium">{data.greeting}</p>
      {data.sections?.map((sec: any, i: number) => (
        <div key={i} className="glass rounded-xl p-3">
          <h4 className="font-semibold text-sm mb-1">{sec.heading}</h4>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{sec.body}</p>
        </div>
      ))}
      <p className="text-xs font-medium">{data.closing}</p>
      <p className="text-[10px] text-muted-foreground italic">{data.disclaimer}</p>
    </div>
  );
}