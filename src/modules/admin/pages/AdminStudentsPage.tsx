import { useMemo, useState } from "react";
import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import DataTable from "@/shared/components/DataTable";
import StatusBadge from "@/shared/components/StatusBadge";
import SearchInput from "@/shared/components/SearchInput";
import { Progress } from "@/shared/components/ui/progress";
import { useAdminStudents } from "@/modules/admin/hooks/useAdminUsers";
import { useOrders } from "@/modules/checkout/hooks/useOrders";

// TODO(backend): progress is fabricated per student until real enrollments
// span multiple courses — deterministic so the table looks stable across renders.
const fakeProgress = (name: string) => (name.length * 7) % 100;

const AdminStudentsPage = () => {
  const { data: students } = useAdminStudents();
  const { data: orders } = useOrders();
  const [search, setSearch] = useState('');

  const ordersByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of orders ?? []) {
      map.set(order.customer, (map.get(order.customer) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  const filtered = (students ?? []).filter((s) => !search.trim() || s.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <AdminLayout>
      <PageHeader title="Alunos" subtitle="Progresso, assinaturas e pedidos dos alunos matriculados." />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de alunos" value={String(students?.length ?? 0)} />
        <StatCard label="Assinantes Premium" value={String(students?.filter((s) => s.subscriptionPlan === 'Premium').length ?? 0)} />
        <StatCard label="Alunos ativos" value={String(students?.filter((s) => s.status === 'Ativo').length ?? 0)} />
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar alunos..." className="mb-6 max-w-md" />

      <DataTable
        rows={filtered}
        rowKey={(student) => student.email}
        emptyLabel="Nenhum aluno encontrado."
        columns={[
          { header: 'Nome', cell: (student) => student.name },
          { header: 'Plano', cell: (student) => <StatusBadge status={student.subscriptionPlan === 'Premium' ? 'ativo' : 'neutral'} label={student.subscriptionPlan} /> },
          {
            header: 'Progresso médio',
            cell: (student) => (
              <div className="flex items-center gap-2 w-32">
                <Progress value={fakeProgress(student.name)} aria-label={`Progresso médio de ${student.name}`} className="h-2" />
                <span className="text-xs text-muted-foreground shrink-0">{fakeProgress(student.name)}%</span>
              </div>
            ),
          },
          { header: 'Pedidos', cell: (student) => ordersByCustomer.get(student.name) ?? 0 },
          { header: 'Status', cell: (student) => <StatusBadge status={student.status} label={student.status} /> },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminStudentsPage;
