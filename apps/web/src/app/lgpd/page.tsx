import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'LGPD — Direitos dos Titulares',
  description: 'Informações sobre os direitos dos titulares de dados conforme a Lei Geral de Proteção de Dados (LGPD).',
  robots: { index: true, follow: true },
};

export default function LGPDPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          ← Voltar para o início
        </Link>

        <h1 className="text-3xl font-bold mb-2">LGPD — Direitos dos Titulares de Dados</h1>
        <p className="text-sm text-muted-foreground mb-8">Em conformidade com a Lei nº 13.709/2018</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">O que é a LGPD?</h2>
            <p>
              A Lei Geral de Proteção de Dados Pessoais (LGPD) é a lei brasileira que regula o tratamento de dados pessoais, garantindo aos titulares maior controle sobre suas informações. A Fitlynutri opera em total conformidade com esta legislação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Controlador dos Dados</h2>
            <p>O controlador responsável pelo tratamento dos seus dados pessoais é:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Fitlynutri</strong></li>
              <li>E-mail: <strong>contato@fitlynutri.com.br</strong></li>
              <li>Site: fitlynutri.com.br</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Dados Pessoais que Coletamos</h2>
            <p>Coletamos apenas os dados estritamente necessários para o funcionamento da plataforma:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados de identificação:</strong> nome, e-mail, telefone, CPF/CNPJ (quando aplicável)</li>
              <li><strong>Dados de saúde:</strong> peso, altura, medidas corporais, fotos de progresso (fornecidos pelo profissional/aluno)</li>
              <li><strong>Dados de navegação:</strong> endereço IP, tipo de dispositivo, páginas visitadas</li>
              <li><strong>Dados financeiros:</strong> processados exclusivamente via Mercado Pago (não armazenados por nós)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Finalidade do Tratamento</h2>
            <p>Seus dados são tratados para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fornecimento dos serviços contratados (gestão de treinos, dietas, cobranças)</li>
              <li>Comunicação sobre atualizações, suporte e notificações relevantes</li>
              <li>Cumprimento de obrigações legais e regulatórias</li>
              <li>Melhoria contínua dos nossos serviços</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Seus Direitos</h2>
            <p>Como titular dos seus dados pessoais, você tem direito a:</p>

            <div className="mt-4 space-y-3">
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10">
                <h3 className="font-medium text-foreground mb-1">Art. 18 — Acesso</h3>
                <p className="text-sm">Solicitar confirmação da existência de tratamento e acesso aos seus dados pessoais.</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10">
                <h3 className="font-medium text-foreground mb-1">Art. 18, II — Correção</h3>
                <p className="text-sm">Solicitar a correção de dados incompletos, inexatos ou desatualizados.</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10">
                <h3 className="font-medium text-foreground mb-1">Art. 18, III — Anonimização, Bloqueio ou Eliminação</h3>
                <p className="text-sm">Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD.</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10">
                <h3 className="font-medium text-foreground mb-1">Art. 18, IV — Portabilidade</h3>
                <p className="text-sm">Solicitar a portabilidade dos seus dados a outro fornecedor de serviço, mediante requisição expressa.</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10">
                <h3 className="font-medium text-foreground mb-1">Art. 18, V — Eliminação</h3>
                <p className="text-sm">Solicitar a eliminação dos dados pessoais tratados com o seu consentimento, salvo em caso de obrigação legal ou legítimo interesse.</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10">
                <h3 className="font-medium text-foreground mb-1">Art. 18, VI — Informação sobre Compartilhamento</h3>
                <p className="text-sm">Receber informações sobre entidades públicas e privadas com as quais seus dados foram compartilhados.</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10">
                <h3 className="font-medium text-foreground mb-1">Art. 18, VII — Revogação de Consentimento</h3>
                <p className="text-sm">Revogar o consentimento a qualquer momento, mediante manifestação expressa.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Banco de Dados do Encarregado (DPO)</h2>
            <p>
              O Encarregado de Proteção de Dados (DPO) da Fitlynutri pode ser contactado pelo e-mail <strong>contato@fitlynutri.com.br</strong> para qualquer solicitação relacionada ao tratamento dos seus dados pessoais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Prazo de Resposta</h2>
            <p>
              Atenderemos às suas solicitações no prazo de até 15 (quinze) dias úteis, contados da data do recebimento do pedido, conforme previsto no Art. 18, §5º da LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Transferência Internacional de Dados</h2>
            <p>
              Os dados são armazenados em servidores localizados no Brasil (Oracle Cloud). Não realizamos transferência internacional de dados pessoais para fora do território nacional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Canal de Comunicação</h2>
            <p>Para exercer qualquer um dos seus direitos, entre em contato:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>E-mail: <strong>contato@fitlynutri.com.br</strong></li>
              <li>Assunto: &quot;Solicitação LGPD — [seu direito]&quot;</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
