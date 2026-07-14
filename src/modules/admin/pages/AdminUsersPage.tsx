import { useMemo, useState } from "react";
import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import DataTable from "@/shared/components/DataTable";
import StatusBadge from "@/shared/components/StatusBadge";
import SearchInput from "@/shared/components/SearchInput";
import FilterBar from "@/shared/components/FilterBar";
import { useAdminUsers } from "@/modules/admin/hooks/useAdminUsers";
import { useOrders } from "@/modules/checkout/hooks/useOrders";

const ROLE_FILTERS = ['Todos', 'student', 'instructor', 'producer', 'admin', 'super_admin'];

const AdminUsersPage = () => {
  const { data: users } = useAdminUsers();
  const { data: orders } = useOrders();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('Todos');

  const ordersByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of orders ?? []) {
      map.set(order.customer, (map.get(order.customer) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    return (users ?? []).filter((user) => {
      const matchesRole = role === 'Todos' || user.role === role;
      const matchesQuery = !search.trim() || user.name.toLowerCase().includes(search.trim().toLowerCase());
      return matchesRole && matchesQuery;
    });
  }, [users, search, role]);

  return (
    <AdminLayout>
      <PageHeader title="Usuários" subtitle="Alunos e equipe cadastrados na plataforma." />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de usuários" value={String(users?.length ?? 0)} />
        <StatCard label="Assinantes Premium" value={String(users?.filter((u) => u.subscriptionPlan === 'Premium').length ?? 0)} />
        <StatCard label="Instrutores" value={String(users?.filter((u) => u.role === 'instructor').length ?? 0)} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar usuários..." className="flex-1" />
        <FilterBar options={ROLE_FILTERS} value={role} onChange={setRole} />
      </div>

      <DataTable
        rows={filtered}
        rowKey={(user) => user.email}
        emptyLabel="Nenhum usuário encontrado."
        columns={[
          { header: 'Nome', cell: (user) => user.name },
          { header: 'E-mail', cell: (user) => user.email },
          { header: 'Papel', cell: (user) => user.role },
          { header: 'Plano', cell: (user) => <StatusBadge status={user.subscriptionPlan === 'Premium' ? 'ativo' : 'neutral'} label={user.subscriptionPlan} /> },
          { header: 'Pedidos', cell: (user) => ordersByCustomer.get(user.name) ?? 0 },
          { header: 'Status', cell: (user) => <StatusBadge status={user.status} label={user.status} /> },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminUsersPage;
