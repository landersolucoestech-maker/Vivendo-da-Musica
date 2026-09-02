import { Database, KeyRound, ServerCog, ShieldCheck } from 'lucide-react';

import AdminLayout from '@/app/layouts/AdminLayout';
import { USER_ROLES, type UserRole } from '@/modules/auth/types/role';
import DataTable from '@/shared/components/DataTable';
import PageHeader from '@/shared/components/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

const roleDescriptions: Record<UserRole, string> = {
  student: 'Área do aluno',
  instructor: 'Cursos, conteúdo e acompanhamento de alunos',
  producer: 'Produtos e beats',
  affiliate: 'Links, conversões e comissões',
  company: 'Oportunidades, candidatos e perfil empresarial',
  admin: 'Painel administrativo',
  super_admin: 'Administração e segurança',
};

const roleLabels: Record<UserRole, string> = {
  student: 'Aluno',
  instructor: 'Instrutor',
  producer: 'Produtor',
  affiliate: 'Afiliado',
  company: 'Empresa',
  admin: 'Administrador',
  super_admin: 'Superadministrador',
};

const roleRows = USER_ROLES.map((role) => ({
  role,
  label: roleLabels[role],
  description: roleDescriptions[role],
}));

const AdminSecurityPage = () => (
  <AdminLayout>
    <PageHeader
      title="Segurança"
      subtitle="Controles de acesso declarados pela aplicação e limites desta visão administrativa."
    />

    <div className="space-y-6">
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Esta tela não é um scanner de conformidade</AlertTitle>
        <AlertDescription>
          Os itens abaixo descrevem controles implementados na arquitetura. Cobertura de políticas, banco e release deve ser
          comprovada pelos gates automatizados e auditorias técnicas; esta interface não mede esse estado em tempo real.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" />
              Autorização da aplicação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Rotas privadas aplicam guards de autenticação e papel antes de renderizar áreas protegidas.</p>
            <p>Permissões de dados continuam dependentes das políticas e funções executadas no backend.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Banco e Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Regras de acesso a dados e arquivos são responsabilidade das políticas do Supabase e das funções privilegiadas.</p>
            <p>A cobertura efetiva dessas regras deve ser validada pelos testes de banco e pela auditoria de políticas.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ServerCog className="h-4 w-4" />
              Ambientes e release
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Comportamentos exclusivos de desenvolvimento devem permanecer condicionados ao ambiente correspondente.</p>
            <p>Os workflows de release são a evidência operacional para promover alterações entre ambientes.</p>
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Papéis reconhecidos pelo código</h2>
        <DataTable
          rows={roleRows}
          rowKey={(row) => row.role}
          emptyLabel="Nenhum papel configurado."
          columns={[
            { header: 'Papel', cell: (row) => row.label },
            { header: 'Escopo', cell: (row) => row.description },
          ]}
        />
      </section>
    </div>
  </AdminLayout>
);

export default AdminSecurityPage;
