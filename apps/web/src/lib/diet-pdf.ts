// Gera uma janela imprimível (→ "Salvar como PDF" do navegador) com o plano
// alimentar. Usado tanto pelo aluno (Minha Dieta) quanto pelo nutricionista
// (detalhe da dieta), pra ter um documento consistente pra entregar/imprimir.

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: 'Café da manhã',
  MORNING_SNACK: 'Lanche da manhã',
  LUNCH: 'Almoço',
  AFTERNOON_SNACK: 'Lanche da tarde',
  DINNER: 'Jantar',
  EVENING_SNACK: 'Ceia',
  PRE_WORKOUT: 'Pré-treino',
  POST_WORKOUT: 'Pós-treino',
};

interface DietPDFOptions {
  /** Nome exibido no rodapé / carimbo — ex: "Dra. Ana Paula · CRN 12345". */
  professionalLine?: string;
  /** Nome do paciente, exibido no cabeçalho quando informado. */
  patientName?: string;
}

export function openDietPDF(diet: any, opts: DietPDFOptions = {}): boolean {
  if (!diet) return false;

  const meals: any[] = diet.meals ?? [];
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const mealRows = meals
    .map((m: any) => {
      const foodRows = (m.foods ?? [])
        .map(
          (mf: any) => `
        <tr>
          <td style="padding:6px 12px 6px 28px;color:#6b7280;font-size:13px;">${mf.food?.name ?? mf.name ?? '—'}</td>
          <td style="padding:6px 8px;text-align:center;color:#6b7280;font-size:13px;">${mf.quantity ?? '—'}${mf.unit ?? 'g'}</td>
          <td style="padding:6px 8px;text-align:center;color:#374151;font-size:13px;">${mf.calories ?? '—'}</td>
          <td style="padding:6px 8px;text-align:center;color:#374151;font-size:13px;">${mf.protein ?? '—'}g</td>
          <td style="padding:6px 8px;text-align:center;color:#374151;font-size:13px;">${mf.carbs ?? '—'}g</td>
          <td style="padding:6px 8px;text-align:center;color:#374151;font-size:13px;">${mf.fat ?? '—'}g</td>
        </tr>`,
        )
        .join('');

      return `
        <tr style="background:#f9fafb;">
          <td colspan="6" style="padding:10px 12px;font-weight:600;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">
            ${MEAL_LABELS[m.type] ?? m.name ?? m.type}${m.time ? `<span style="font-weight:400;color:#6b7280;font-size:12px;margin-left:8px;">${m.time}</span>` : ''}
            <span style="float:right;font-weight:400;font-size:12px;color:#6b7280;">${m.calories ?? 0} kcal · P:${m.protein ?? 0}g C:${m.carbs ?? 0}g G:${m.fat ?? 0}g</span>
          </td>
        </tr>
        ${foodRows || `<tr><td colspan="6" style="padding:6px 28px;color:#9ca3af;font-size:12px;">Nenhum alimento cadastrado</td></tr>`}
        ${m.notes ? `<tr><td colspan="6" style="padding:4px 28px 10px;color:#9ca3af;font-size:12px;font-style:italic;">Obs: ${m.notes}</td></tr>` : ''}`;
    })
    .join('');

  const footerText = opts.professionalLine
    ? `${opts.professionalLine} · Gerado pelo Fitlynutri`
    : 'Gerado pelo Fitlynutri · Consulte sempre seu nutricionista';

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>Dieta — ${diet.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; background: #fff; padding: 32px; }
    @media print {
      body { padding: 16px; }
      button { display: none !important; }
      @page { margin: 16mm 12mm; }
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #10b981; padding-bottom: 16px; }
    .logo { font-size: 22px; font-weight: 700; color: #10b981; }
    .subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .plan-name { font-size: 18px; font-weight: 600; color: #111827; }
    .date { font-size: 12px; color: #6b7280; margin-top: 2px; text-align: right; }
    .macros-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
    .macro-box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; text-align: center; }
    .macro-val { font-size: 20px; font-weight: 700; color: #10b981; }
    .macro-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #10b981; color: white; padding: 10px 12px; font-size: 12px; font-weight: 600; text-align: center; }
    thead th:first-child { text-align: left; }
    tr:nth-child(even):not([style]) { background: #f9fafb; }
    .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    .print-btn { position: fixed; bottom: 24px; right: 24px; background: #10b981; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,.4); }
    .print-btn:hover { background: #059669; }
  </style></head><body>
  <div class="header">
    <div>
      <div class="logo">Fitlynutri</div>
      <div class="subtitle">Plano Alimentar${opts.patientName ? ` · ${opts.patientName}` : ''}</div>
    </div>
    <div>
      <div class="plan-name">${diet.name}</div>
      <div class="date">Emitido em ${date}</div>
    </div>
  </div>
  <div class="macros-grid">
    <div class="macro-box"><div class="macro-val">${diet.totalCalories ?? 0}</div><div class="macro-label">Calorias (kcal)</div></div>
    <div class="macro-box"><div class="macro-val">${diet.totalProtein ?? 0}g</div><div class="macro-label">Proteína</div></div>
    <div class="macro-box"><div class="macro-val">${diet.totalCarbs ?? 0}g</div><div class="macro-label">Carboidratos</div></div>
    <div class="macro-box"><div class="macro-val">${diet.totalFat ?? 0}g</div><div class="macro-label">Gorduras</div></div>
  </div>
  <table>
    <thead><tr>
      <th style="text-align:left;">Alimento</th>
      <th>Porção</th><th>Kcal</th><th>Prot</th><th>Carb</th><th>Gord</th>
    </tr></thead>
    <tbody>${mealRows}</tbody>
  </table>
  ${diet.description ? `<p style="margin-top:16px;font-size:12px;color:#6b7280;white-space:pre-wrap;">${diet.description}</p>` : ''}
  <div class="footer">${footerText} · Consulte sempre seu nutricionista</div>
  <button class="print-btn" onclick="window.print()">⬇ Salvar PDF</button>
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  return true;
}

/**
 * Lista de compras: soma as quantidades de cada alimento em todas as refeições
 * da dieta e mostra numa lista imprimível com checkbox. Assume que a dieta é
 * um "dia padrão" (multiplica pelos dias que o paciente informar ao imprimir).
 */
export function openShoppingListPDF(diet: any): boolean {
  if (!diet) return false;
  const meals: any[] = diet.meals ?? [];

  // agrega por nome do alimento + unidade
  const agg = new Map<string, { name: string; unit: string; qty: number }>();
  for (const m of meals) {
    for (const mf of m.foods ?? []) {
      const name = mf.food?.name ?? mf.name ?? '—';
      const unit = mf.unit ?? 'g';
      const key = `${name.toLowerCase()}|${unit}`;
      const prev = agg.get(key);
      const qty = Number(mf.quantity) || 0;
      if (prev) prev.qty += qty;
      else agg.set(key, { name, unit, qty });
    }
  }

  const items = Array.from(agg.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (items.length === 0) return false;

  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const rows = items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 10px;font-size:14px;color:#111827;">
          <span style="display:inline-block;width:14px;height:14px;border:1.5px solid #10b981;border-radius:3px;margin-right:10px;vertical-align:middle;"></span>
          ${it.name}
        </td>
        <td style="padding:8px 10px;font-size:14px;color:#374151;text-align:right;white-space:nowrap;">
          ${Math.round(it.qty * 10) / 10} ${it.unit}<span class="mult" style="color:#9ca3af;"></span>
        </td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>Lista de compras — ${diet.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; background: #fff; padding: 32px; max-width: 620px; margin: 0 auto; }
    @media print { body { padding: 16px; } button, .controls { display: none !important; } @page { margin: 16mm 12mm; } }
    .header { border-bottom: 2px solid #10b981; padding-bottom: 14px; margin-bottom: 8px; }
    .logo { font-size: 20px; font-weight: 700; color: #10b981; }
    .subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .plan { font-size: 15px; font-weight: 600; margin-top: 8px; }
    .date { font-size: 11px; color: #9ca3af; }
    .controls { margin: 14px 0; font-size: 13px; color: #374151; }
    .controls input { width: 54px; padding: 4px 6px; border: 1px solid #d1d5db; border-radius: 6px; margin: 0 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    .print-btn { position: fixed; bottom: 24px; right: 24px; background: #10b981; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,.4); }
  </style></head><body>
  <div class="header">
    <div class="logo">Fitlynutri</div>
    <div class="subtitle">Lista de Compras</div>
    <div class="plan">${diet.name}</div>
    <div class="date">Base: 1 dia · Emitida em ${date}</div>
  </div>
  <div class="controls">
    Multiplicar quantidades por
    <input id="mult" type="number" min="1" value="1" onchange="applyMult(this.value)" />
    dia(s) e <button onclick="window.print()" style="border:none;background:#10b981;color:#fff;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">imprimir</button>
  </div>
  <table><tbody>${rows}</tbody></table>
  <div class="footer">Gerado pelo Fitlynutri</div>
  <button class="print-btn" onclick="window.print()">⬇ Salvar PDF</button>
  <script>
    var base = ${JSON.stringify(items.map((i) => ({ q: Math.round(i.qty * 10) / 10, u: i.unit })))};
    function applyMult(m){
      m = parseFloat(m) || 1;
      var cells = document.querySelectorAll('td:last-child');
      cells.forEach(function(c, i){
        if(!base[i]) return;
        var total = Math.round(base[i].q * m * 10) / 10;
        c.firstChild.textContent = total + ' ' + base[i].u + (m > 1 ? '' : '');
      });
    }
  </script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=680,height=760');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  return true;
}
