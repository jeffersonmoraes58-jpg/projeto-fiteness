import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PatientData {
  name: string;
  goalType?: string;
  anamnesis?: any;
  lastAssessment?: any;
  physicalAssessments?: any[];
  nutritionalAssessments?: any[];
  weightLog?: any[];
  exams?: any[];
  goals?: any[];
  progressPhotos?: any[];
  dietHistory?: any[];
  clinicalNotes?: any[];
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function labelGoal(g: string) {
  const m: Record<string, string> = {
    LOSE_WEIGHT: 'Perda de peso', GAIN_MUSCLE: 'Ganho muscular', MAINTAIN_WEIGHT: 'Manutenção',
    IMPROVE_ENDURANCE: 'Resistência', INCREASE_FLEXIBILITY: 'Flexibilidade',
    ATHLETIC_PERFORMANCE: 'Performance', REHABILITATION: 'Reabilitação',
  };
  return m[g] || g || 'Não informado';
}

export async function exportPatientReport(data: PatientData) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  // ── Header ──
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório do Paciente', 15, 25);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em ${formatDate(new Date())}`, 15, 35);
  y = 55;

  // ── Patient info ──
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`Paciente: ${data.name}`, 15, y);
  y += 8;
  if (data.goalType) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Objetivo: ${labelGoal(data.goalType)}`, 15, y);
    y += 6;
  }
  y += 8;

  // ── Anamnese ──
  if (data.anamnesis) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Anamnese', 15, y);
    y += 8;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const a = data.anamnesis;
    const lines: string[] = [];
    if (a.mainGoal) lines.push(`Meta principal: ${a.mainGoal}`);
    if (a.practicesExercise !== null) lines.push(`Pratica exercício: ${a.practicesExercise ? 'Sim' : 'Não'}${a.exerciseFrequency ? ` — ${a.exerciseFrequency}` : ''}`);
    if (a.previousInjuries) lines.push(`Lesões prévias: ${a.previousInjuries}`);
    if (a.surgeries) lines.push(`Cirurgias: ${a.surgeries}`);
    if (a.cardiovascularIssues) lines.push('Problemas cardiovasculares: Sim');
    if (a.diabetes) lines.push('Diabetes: Sim');
    if (a.sleepHours != null) lines.push(`Horas de sono: ${a.sleepHours}h`);
    if (a.stressLevel != null) lines.push(`Nível de estresse (1-10): ${a.stressLevel}`);
    if (a.observations) lines.push(`Observações: ${a.observations}`);
    if (lines.length > 0) {
      for (const l of lines) {
        doc.text(`• ${l}`, 15, y);
        y += 5.5;
      }
    } else {
      doc.text('Nenhuma informação registrada.', 15, y);
      y += 5.5;
    }
    y += 6;
  }

  // ── Avaliação Nutricional ──
  if (data.nutritionalAssessments?.length) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Evolução Nutricional', 15, y);
    y += 8;
    const rows = data.nutritionalAssessments.map((na) => [
      formatDate(na.assessedAt),
      `${na.weight}kg`,
      na.bmi ? String(na.bmi) : '—',
      na.tmb ? `${na.tmb}kcal` : '—',
      na.get ? `${na.get}kcal` : '—',
    ]);
    autoTable(doc, {
      head: [['Data', 'Peso', 'IMC', 'TMB', 'GET']],
      body: rows,
      startY: y,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Avaliação Antropométrica ──
  if (data.physicalAssessments?.length) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Evolução Antropométrica', 15, y);
    y += 8;
    const rows = data.physicalAssessments.map((pa) => [
      formatDate(pa.assessedAt),
      pa.weight ? `${pa.weight}kg` : '—',
      pa.bodyFatPercent ? `${pa.bodyFatPercent}%` : '—',
      pa.muscleMassKg ? `${pa.muscleMassKg}kg` : '—',
      pa.waistCm ? `${pa.waistCm}cm` : '—',
      pa.hipCm ? `${pa.hipCm}cm` : '—',
    ]);
    autoTable(doc, {
      head: [['Data', 'Peso', '% Gordura', 'Músculo', 'Cintura', 'Quadril']],
      body: rows,
      startY: y,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Peso diário ──
  if (data.weightLog?.length) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Registro de Peso', 15, y);
    y += 8;
    const rows = [...data.weightLog].reverse().slice(0, 20).map((w: any) => [
      formatDate(w.measuredAt),
      `${w.weight}kg`,
      w.notes || '—',
    ]);
    autoTable(doc, {
      head: [['Data', 'Peso', 'Notas']],
      body: rows,
      startY: y,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Exames ──
  if (data.exams?.length) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Exames', 15, y);
    y += 8;
    for (const exam of data.exams) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`${exam.title}`, 15, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Data: ${formatDate(exam.examDate)}`, 15, y);
      y += 4;
      if (exam.notes) {
        doc.text(`Notas: ${exam.notes}`, 15, y);
        y += 4;
      }
      if (exam.fileUrl) {
        doc.setTextColor(16, 185, 129);
        doc.text(`Arquivo: ${exam.fileUrl}`, 15, y);
        doc.setTextColor(30, 41, 59);
        y += 4;
      }
      y += 3;
    }
    y += 3;
  }

  // ── Metas ──
  if (data.goals?.length) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Metas', 15, y);
    y += 8;
    for (const g of data.goals) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const status = g.isCompleted ? '✅' : '⏳';
      const progress = g.targetValue ? ` (${g.currentValue || 0}/${g.targetValue}${g.unit || ''})` : '';
      doc.text(`${status} ${g.title}${progress}`, 15, y);
      y += 5;
      if (g.description) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`  ${g.description}`, 15, y);
        y += 4;
        doc.setTextColor(30, 41, 59);
      }
      if (g.targetDate) {
        doc.setFontSize(9);
        doc.text(`  Prazo: ${formatDate(g.targetDate)}`, 15, y);
        y += 4;
      }
      y += 2;
    }
    y += 5;
  }

  // ── Histórico de dietas ──
  if (data.dietHistory?.length) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Histórico de Dietas', 15, y);
    y += 8;
    for (const plan of data.dietHistory) {
      const diet = plan.diet;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`${diet?.name || 'Sem nome'}`, 15, y);
      y += 5;
      if (diet) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const info = [];
        if (diet.totalCalories) info.push(`${diet.totalCalories}kcal`);
        if (diet.totalProtein) info.push(`P: ${diet.totalProtein}g`);
        if (diet.totalCarbs) info.push(`C: ${diet.totalCarbs}g`);
        if (diet.totalFat) info.push(`G: ${diet.totalFat}g`);
        doc.text(info.join(' | '), 15, y);
        y += 5;
        doc.text(`Início: ${formatDate(plan.startDate)}${plan.endDate ? ` — Fim: ${formatDate(plan.endDate)}` : ' — Ativa'}`, 15, y);
        y += 5;
      }
      y += 3;
    }
    y += 5;
  }

  // ── Notas clínicas ──
  if (data.clinicalNotes?.length) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Notas Clínicas', 15, y);
    y += 8;
    for (const note of data.clinicalNotes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      const pin = note.isPinned ? '📌 ' : '';
      doc.text(`[${note.category}] ${pin}${formatDate(note.createdAt)}`, 15, y);
      y += 5;
      if (note.title) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Título: ${note.title}`, 15, y);
        y += 4;
      }
      if (note.content) {
        doc.setFont('helvetica', 'normal');
        const contentLines = doc.splitTextToSize(note.content, pageW - 30);
        for (const line of contentLines) {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.text(line, 15, y);
          y += 4;
        }
      }
      y += 3;
    }
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`FitlyNutri — Relatório do Paciente — Página ${i}/${pageCount}`, pageW / 2, 290, { align: 'center' });
  }

  doc.save(`relatorio_${data.name.replace(/\s+/g, '_')}.pdf`);
}