import { useMemo, useState } from 'react';

import AdminLayout from '@/app/layouts/AdminLayout';
import { useAdminUsers } from '@/modules/admin/hooks/useAdminUsers';
import DataTable from '@/shared/components/DataTable';
import FilterBar from '@/shared/components/FilterBar';
import LoadingState from '@/shared/components/LoadingState';
import PageHeader from '@/shared/components/PageHeader';
import SearchInput from '@/shared/components/SearchInput';
import StatCard from '@/shared/components/StatCard';
import { Badge } from '@/shared/components/ui/badge';

const ROLE_FILTERS = [
  { value: 'Todos', label: 'Todos' },
  { value: 'student', label: 'Alunos' },
  { value: 'instructor', label: 'Instrutores' },
  { value: 'producer', label: 'Produtores' },
  { value: 'affiliate', label: 'Afiliados' },
  { value: 'company', label: 'Empresas' },
  { value: 'admin', label: 'Administradores' },
  { value: 'super_admin', label: 'Superadministradores' },
];

const roleLabel = (role: string) => ({
  student: 'Aluno',
  instructor: 'Instrutor',
  producer: 'Produtor',
  affiliate: 'Afiliado',
  company: 'Empresa',
  admin: 'Administrador',
  super_admin: 'Superadministrador',
}[role] ?? role);

const AdminUsersPage = () => {
  const { data: users, isLoading, isError } = useAdminUsers();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('Todos');

  const filtered = useMemo(() => (users ?? []).filter((user) => {
    const matchesRole = role === 'Todos' || user.role === role;
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || user.name.toLowerCase().includes(query) || user.userId.toLowerCase().includes(query);
    return matchesRole && matchesQuery;
  }), [users, search, role]);

  return (
    <AdminLayout>
      <PageHeader title="Usuários" subtitle="Perfis persistidos no ambiente de desenvolvimento, sem e-mails ou planos artificiais." />

      {isLoading && <LoadingState rows={6} />}
      {isError && <p className="text-sm text-destructive">Não foi possível carregar os perfis.</p>}

      {users && !isLoading && !isError && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Total de perfis" value={String(users.length)} />
            <StatCard label="Alunos" value={String(users.filter((user) => user.role === 'student').length)} />
            <StatCard label="Equipe, empresas e parceiros" value={String(users.filter((user) => user.role !== 'student').length)} />
          </div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou identificador..." className="flex-1" />
            <FilterBar options={ROLE_FILTERS} value={role} onChange={setRole} />
          </div>

          <DataTable
            rows={filtered}
            rowKey={(user) => user.userId}
            emptyLabel="Nenhum usuário encontrado."
            columns={[
              { header: 'Nome', cell: (user) => user.name },
              { header: 'Identificador', cell: (user) => <span className="font-mono text-xs text-muted-foreground">{user.userId}</span> },
              { header: 'Papel', cell: (user) => <Badge variant="outline">{roleLabel(user.role)}</Badge> },
              { header: 'Matrículas ativas', cell: (user) => String(user.activeEnrollments) },
              { header: 'Progresso médio', cell: (user) => `${user.averageProgress}%` },
              { header: 'Cadastro', cell: (user) => new Intl.DateTimeFormat('pt-BR').format(new Date(user.joinedAt)) },
            ]}
          />
        </>
      )}
    </AdminLayout>
  );
};

export default AdminUsersPage;
