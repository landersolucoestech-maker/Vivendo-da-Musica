import { useState } from 'react';

import AdminLayout from '@/app/layouts/AdminLayout';
import { useAdminStudents } from '@/modules/admin/hooks/useAdminUsers';
import DataTable from '@/shared/components/DataTable';
import LoadingState from '@/shared/components/LoadingState';
import PageHeader from '@/shared/components/PageHeader';
import SearchInput from '@/shared/components/SearchInput';
import StatCard from '@/shared/components/StatCard';
import { Progress } from '@/shared/components/ui/progress';

const AdminStudentsPage = () => {
  const { data: students, isLoading, isError } = useAdminStudents();
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const filtered = (students ?? []).filter((student) => !query || student.name.toLowerCase().includes(query) || student.userId.toLowerCase().includes(query));
  const averageProgress = students?.length
    ? Math.round(students.reduce((total, student) => total + student.averageProgress, 0) / students.length)
    : 0;

  return (
    <AdminLayout>
      <PageHeader title="Alunos" subtitle="Matrículas e progresso calculados a partir dos registros reais de aprendizagem." />

      {isLoading && <LoadingState rows={6} />}
      {isError && <p className="text-sm text-destructive">Não foi possível carregar os alunos.</p>}

      {students && !isLoading && !isError && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Total de alunos" value={String(students.length)} />
            <StatCard label="Matrículas ativas" value={String(students.reduce((total, student) => total + student.activeEnrollments, 0))} />
            <StatCard label="Progresso médio" value={`${averageProgress}%`} />
          </div>

          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou identificador..." className="mb-6 max-w-md" />

          <DataTable
            rows={filtered}
            rowKey={(student) => student.userId}
            emptyLabel="Nenhum aluno encontrado."
            columns={[
              { header: 'Nome', cell: (student) => student.name },
              { header: 'Identificador', cell: (student) => <span className="font-mono text-xs text-muted-foreground">{student.userId}</span> },
              { header: 'Matrículas', cell: (student) => String(student.activeEnrollments) },
              {
                header: 'Progresso médio',
                cell: (student) => (
                  <div className="flex w-40 items-center gap-2">
                    <Progress value={student.averageProgress} aria-label={`Progresso médio de ${student.name}`} className="h-2" />
                    <span className="shrink-0 text-xs text-muted-foreground">{student.averageProgress}%</span>
                  </div>
                ),
              },
              { header: 'Aulas concluídas', cell: (student) => String(student.completedLessons) },
              { header: 'Cadastro', cell: (student) => new Intl.DateTimeFormat('pt-BR').format(new Date(student.joinedAt)) },
            ]}
          />
        </>
      )}
    </AdminLayout>
  );
};

export default AdminStudentsPage;
