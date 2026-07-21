import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos de Uso da Fitlynutri — regras e condições para utilização da plataforma.',
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          ← Voltar para o início
        </Link>

        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 21 de julho de 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar a plataforma Fitlynutri (&quot;Plataforma&quot;), você concorda com estes Termos de Uso. Se não concordar, não utilize a Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Descrição do Serviço</h2>
            <p>
              A Fitlynutri é uma plataforma SaaS que permite profissionais de fitness (personal trainers, nutricionistas e studios) gerenciar seus alunos, incluindo montagem de treinos, planos alimentares, cobranças, chat, agenda e acompanhamento de evolução. Os alunos acessam a plataforma para visualizar seus treinos, dietas e progresso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Elegibilidade</h2>
            <p>
              Para utilizar a Plataforma como profissional, você deve ter pelo menos 18 anos de idade e capacidade legal para firmar contratos. Ao criar uma conta, você declara que atende a esses requisitos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Conta e Segurança</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Você é responsável por manter a confidencialidade das suas credenciais de acesso</li>
              <li>Notifique-nos imediatamente sobre uso não autorizado da sua conta</li>
              <li>Uma pessoa/CPF/CNPJ pode manter apenas uma conta ativa</li>
              <li>Reservamo-nos o direito de suspender contas que violem estes Termos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Planos e Pagamentos</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>A Plataforma oferece um plano gratuito e planos pagos (Starter, Pro, Elite)</li>
              <li>Os preços estão disponíveis em fitlynutri.com.br e podem ser alterados com aviso prévio de 30 dias</li>
              <li>Pagamentos são processados via Mercado Pago. Consulte os termos do Mercado Pago para detalhes</li>
              <li>Assinaturas pagas são renovadas automaticamente, salvo cancelamento antes do vencimento</li>
              <li>Reembolsos seguem a política do Mercado Pago</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Responsabilidades do Profissional</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>O profissional é o responsável pelo conteúdo que cria (treinos, dietas, orientações)</li>
              <li>A Fitlynutri não substitui a orientação profissional de saúde. A plataforma é uma ferramenta de gestão</li>
              <li>O profissional é responsável por obter o consentimento dos alunos para coleta de dados</li>
              <li>Dados de saúde e medidas corporais devem ser tratados com sigilo profissional</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Propriedade Intelectual</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>O conteúdo criado por você (treinos, dietas) é de sua propriedade</li>
              <li>A Fitlynutri detém os direitos sobre o código-fonte, design e marca</li>
              <li>É proibido copiar, modificar ou distribuir qualquer parte da Plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Uso Aceitável</h2>
            <p>É proibido utilizar a Plataforma para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Atividades ilegais ou que violem direitos de terceiros</li>
              <li>Envio de spam, conteúdo ofensivo ou discriminatório</li>
              <li>Tentativas de acesso não autorizado a sistemas ou dados de outros usuários</li>
              <li>Engenharia reversa, descompilação ou extração do código-fonte</li>
              <li>Uso automatizado (bots, scrapers) sem autorização expressa</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">9. Isenção de Responsabilidade</h2>
            <p>
              A Plataforma é fornecida &quot;como está&quot;. Não garantimos disponibilidade ininterrupta ou ausência de erros. Não nos responsabilizamos por decisões tomadas com base nas informações da Plataforma, incluindo orientações de treino e nutrição geradas por IA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">10. Limitação de Responsabilidade</h2>
            <p>
              Em nenhuma circunstância a Fitlynutri será responsável por danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso da Plataforma, incluindo perda de dados, lucros cessantes ou interrupção de negócio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">11. Cancelamento e Exclusão</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Você pode cancelar sua conta a qualquer momento nas configurações</li>
              <li>O cancelamento é imediato e não há cobranças futuras</li>
              <li>Após a exclusão, seus dados serão removidos conforme descrito na Política de Privacidade</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">12. Alterações nestes Termos</h2>
            <p>
              Reservamo-nos o direito de alterar estes Termos a qualquer momento. Alterações significativas serão comunicadas com pelo menos 30 dias de antecedência. O uso contínuo após as alterações constitui aceitação dos Termos atualizados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">13. Lei Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer questões oriundas destes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">14. Contato</h2>
            <p>
              Em caso de dúvidas, entre em contato:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>E-mail: <strong>contato@fitlynutri.com.br</strong></li>
              <li>Site: <a href="https://fitlynutri.com.br" className="text-primary hover:underline">fitlynutri.com.br</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
