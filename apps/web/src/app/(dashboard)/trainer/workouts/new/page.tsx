'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, ChevronLeft, Save, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

const LEVELS = [
  { value: 1, label: 'Iniciante' },
  { value: 2, label: 'Básico' },
  { value: 3, label: 'Intermediário' },
  { value: 4, label: 'Avançado' },
  { value: 5, label: 'Elite' },
];

export default function NewWorkoutPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('45');
  const [level, setLevel] = useState(1);
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/workouts', data),
    onSuccess: (res) => router.push(`/trainer/workouts/${res.data.data?.id || ''}`),
    onError: (e: any) => {
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Erro ao criar treino'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Nome é obrigatório'); return; }
    createMutation.mutate({
      name,
      description: description || undefined,
      duration: Number(duration) || 45,
      level,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      status: 'ACTIVE',
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/trainer/workouts" className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-accent transition-all">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Novo Treino</h1>
          <p className="text-muted-foreground text-sm">Crie um plano de treino</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-purple-400" />
            Informações gerais
          </h2>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Nome do treino *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Treino A — Peito e Tríceps"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivos, observações..."
              className="input-field min-h-[80px] resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Duração (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="input-field"
                min={1}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nível</label>
              <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className="input-field">
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="peito, tríceps, hipertrofia (separe por vírgula)"
              className="input-field"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-4 flex items-start gap-3 border border-purple-600/20 bg-purple-600/5"
        >
          <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Após criar o treino, você poderá adicionar exercícios a partir da página de exercícios.
          </p>
        </motion.div>

        {error && (
          <div className="glass rounded-xl p-4 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/trainer/workouts" className="btn-secondary flex-1 text-center">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending ? 'Salvando...' : 'Criar treino'}
          </button>
        </div>
      </form>
    </div>
  );
}
