import type { Metadata } from 'next';
import Link from 'next/link';
import { DeleteAccountForm } from '@/components/account-deletion/delete-account-form';

export const metadata: Metadata = {
  title: 'Exclusão de Conta',
  description:
    'Exclusão de conta Fitlynutri — como solicitar a exclusão da sua conta e dos seus dados pessoais.',
  robots: { index: true, follow: true },
};

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          ← Voltar para o início
        </Link>

        <h1 className="text-3xl font-bold mb-2">Exclusão de Conta</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: 16 de agosto de 2026
        </p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Como excluir sua conta FitlyNutri</h2>
            <p>
              A Fitlynutri oferece aos usuários o direito de excluir permanentemente a conta e todos
              os dados pessoais associados, conforme previsto na nossa{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Política de Privacidade
              </Link>{' '}
              e na LGPD. A exclusão pode ser feita por você mesmo, de forma simples e rápida:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Abra o aplicativo FitlyNutri e faça login na sua conta.</li>
              <li>
                Acesse esta página de exclusão:{' '}
                <strong className="text-foreground">https://fitlynutri.com.br/account-deletion</strong>.
              </li>
              <li>
                Digite a palavra <strong className="text-destructive">&quot;excluir&quot;</strong> no
                campo de confirmação.
              </li>
              <li>
                Clique em <strong className="text-foreground">Excluir minha conta definitivamente</strong>.
              </li>
            </ol>
            <p>
              A exclusão é processada imediatamente e a conta não poderá ser recuperada. Você também
              pode solicitar a exclusão enviando um e-mail para{' '}
              <strong className="text-foreground">contato@fitlynutri.com.br</strong>, informando o
              endereço de e-mail cadastrado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Dados excluídos</h2>
            <p>Ao excluir a conta, os seguintes dados são removidos permanentemente:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Dados de cadastro (nome, e-mail, telefone, foto de perfil)</li>
              <li>Dados de saúde e fitness (peso, altura, medidas, fotos de progresso, treinos, dietas)</li>
              <li>Mensagens, conversas e arquivos enviados</li>
              <li>Histórico de treinos, refeições, água e check-ins</li>
              <li>Notificações, metas, conquistas e dados de gamificação</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Dados mantidos por obrigação legal</h2>
            <p>
              Registros de pagamento e dados fiscais são mantidos pelo prazo exigido por lei
              brasileira (até 5 anos), conforme previsto na Política de Privacidade. Esses registros
              não incluem informações de saúde ou conteúdo do usuário e são utilizados apenas para
              fins fiscais e contábeis.
            </p>
          </section>

          <DeleteAccountForm />
        </div>
      </div>
    </div>
  );
}
