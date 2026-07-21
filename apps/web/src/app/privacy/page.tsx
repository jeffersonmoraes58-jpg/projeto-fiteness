import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Política de Privacidade da Fitlynutri — como coletamos, usamos e protegemos seus dados pessoais.',
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          ← Voltar para o início
        </Link>

        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 21 de julho de 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">1. Introdução</h2>
            <p>
              A Fitlynutri (&quot;nós&quot;), operada pelo Fitlynutri, está comprometida em proteger a privacidade e os dados pessoais dos usuários da nossa plataforma. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e compartilhamos informações quando você utiliza o site fitlynutri.com.br, o aplicativo móvel e todos os serviços relacionados (&quot;Serviços&quot;).
            </p>
            <p>
              Ao utilizar nossos Serviços, você concorda com as práticas descritas nesta política. Se você não concordar, por favor, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">2. Dados Coletados</h2>
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.1 Dados fornecidos por você</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nome completo, e-mail, telefone</li>
              <li>Dados de cadastro (CPF, CNPJ, quando aplicável)</li>
              <li>Informações de pagamento (processadas via Mercado Pago, não armazenadas em nossos servidores)</li>
              <li>Dados de alunos: peso, altura, medidas corporais, fotos de progresso</li>
              <li>Conteúdo de chats: mensagens, áudios e arquivos enviados entre profissional e aluno</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.2 Dados coletados automaticamente</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Endereço IP e informações do dispositivo</li>
              <li>Dados de navegação (páginas visitadas, tempo de uso)</li>
              <li>Logs de erro e performance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">3. Uso dos Dados</h2>
            <p>Utilizamos seus dados para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fornecer e melhorar nossos Serviços</li>
              <li>Processar pagamentos e cobranças</li>
              <li>Enviar notificações relevantes (treinos, cobranças, mensagens)</li>
              <li>Gerar relatórios e análises para o profissional</li>
              <li>Comunicar atualizações, novidades e suporte</li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">4. Compartilhamento de Dados</h2>
            <p>Não vendemos seus dados pessoais. Podemos compartilhar informações apenas com:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Profissionais e seus alunos:</strong> dados de treino, dieta e progresso são compartilhados apenas entre o profissional e seus alunos vinculados</li>
              <li><strong>Processadores de pagamento:</strong> Mercado Pago, para processar transações</li>
              <li><strong>Provedores de infraestrutura:</strong> Oracle Cloud (servidor), para hospedagem dos dados</li>
              <li><strong>Quando exigido por lei:</strong> em resposta a ordens judiciais ou obrigações legais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">5. Segurança dos Dados</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito (HTTPS/TLS), controle de acesso por autenticação JWT e armazenamento seguro em servidores com acesso restrito. Nenhuma senha é armazenada em texto plano.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">6. Retenção de Dados</h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Após a exclusão da conta, os dados pessoais serão removidos ou anonimizados dentro de 30 dias, exceto quando exigido por obrigação legal (ex: dados fiscais, que podem ser mantidos por 5 anos).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">7. Seus Direitos (LGPD)</h2>
            <p>Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Acesso:</strong> solicitar cópia dos seus dados pessoais</li>
              <li><strong>Correção:</strong> solicitar correção de dados incompletos ou desatualizados</li>
              <li><strong>Exclusão:</strong> solicitar a exclusão dos seus dados pessoais</li>
              <li><strong>Portabilidade:</strong> solicitar a transferência dos seus dados para outro serviço</li>
              <li><strong>Oposição:</strong> opor-se ao tratamento dos seus dados para certas finalidades</li>
              <li><strong>Revogação de consentimento:</strong> revogar o consentimento a qualquer momento</li>
            </ul>
            <p>Para exercer seus direitos, entre em contato via e-mail: <strong>contato@fitlynutri.com.br</strong></p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">8. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para o funcionamento da plataforma (autenticação, preferências de tema). Não utilizamos cookies de rastreamento de terceiros para fins publicitários.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">9. Menores de Idade</h2>
            <p>
              Nossos Serviços são destinados a profissionais de fitness e seus alunos. Não coletamos intencionalmente dados de menores de 16 anos sem o consentimento do responsável legal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">10. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas via e-mail ou aviso na plataforma. O uso contínuo após alterações constitui aceitação da política atualizada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">11. Contato</h2>
            <p>
              Em caso de dúvidas sobre esta política ou sobre o tratamento dos seus dados, entre em contato:
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
