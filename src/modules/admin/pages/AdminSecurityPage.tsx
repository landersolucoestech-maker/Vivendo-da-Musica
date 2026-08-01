import AdminLayout from '@/app/layouts/AdminLayout';
import PageHeader from '@/shared/components/PageHeader';
import DataTable from '@/shared/components/DataTable';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ShieldCheck, Database, KeyRound, ServerCog } from 'lucide-react';
import { useAdminRoles } from '@/modules/admin/hooks/useAdminSecurity';

const AdminSecurityPage = () => {
  const { data: roles } = useAdminRoles();

  return (
    <AdminLayout>
      <PageHeader
        title="Segurança"
        subtitle="Controles de acesso e estado técnico efetivamente implementados."
      />

      <div className="space-y-6">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Autenticação administrada pelo Supabase Auth</AlertTitle>
          <AlertDescription>
            Login, recuperação de senha, renovação de sessão e validação de usuário são processados pelo Supabase Auth.
            A aplicação não mantém um cadastro paralelo de sessões ou dispositivos no banco público.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4" />
                Autorização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Rotas protegidas por papel no frontend.</p>
              <p>RLS aplicada em todas as tabelas públicas expostas.</p>
              <Badge variant="secondary">Ativo</Badge>
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
              <p>Funções privilegiadas restritas ao service role.</p>
              <p>Uploads privados condicionados a ownership ou papel de staff.</p>
              <Badge variant="secondary">Protegido</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ServerCog className="h-4 w-4" />
                Produção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Bypass de autenticação limitado ao servidor Vite em desenvolvimento.</p>
              <p>Release bloqueado enquanto existirem políticas exclusivas do ambiente dev.</p>
              <Badge variant="secondary">Fail-closed</Badge>
            </CardContent>
          </Card>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Papéis reconhecidos</h2>
          <DataTable
            rows={roles ?? []}
            rowKey={(row) => row.role}
            emptyLabel="Nenhum papel configurado."
            columns={[
              { header: 'Papel', cell: (row) => row.role },
              { header: 'Escopo', cell: (row) => row.description },
            ]}
          />
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminSecurityPage;
