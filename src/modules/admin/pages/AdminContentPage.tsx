import { useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import DataTable from "@/shared/components/DataTable";
import EmptyState from "@/shared/components/EmptyState";
import SearchInput from "@/shared/components/SearchInput";
import FilterBar from "@/shared/components/FilterBar";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import AcademyContentForm from "@/modules/courses/components/AcademyContentForm";
import AcademyContentStatusBadge from "@/modules/courses/components/AcademyContentStatusBadge";
import {
  useAddAcademyAttachment,
  useAdminAcademyContents,
  useDeleteAcademyContent,
  usePublishAcademyContent,
  useRemoveAcademyAttachment,
  useSaveAcademyContent,
} from "@/modules/courses/hooks/useAcademyContents";
import type {
  AcademyContent,
  AcademyContentAttachment,
  AcademyContentInput,
  AcademyUploadResult,
} from "@/modules/courses/types/academyContent.types";

const STATUS_FILTERS = ['Todos', 'draft', 'published'];

const AdminContentPage = () => {
  const { toast } = useToast();
  const { data: contents, isLoading, isError, error } = useAdminAcademyContents();
  const saveContent = useSaveAcademyContent();
  const deleteContent = useDeleteAcademyContent();
  const publishContent = usePublishAcademyContent();
  const addAttachment = useAddAcademyAttachment();
  const removeAttachment = useRemoveAcademyAttachment();
  const [editing, setEditing] = useState<AcademyContent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Todos');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (contents ?? []).filter((content) => {
      const matchesStatus = status === 'Todos' || content.status === status;
      const matchesQuery = !query
        || content.title.toLowerCase().includes(query)
        || content.slug.toLowerCase().includes(query)
        || (content.category ?? '').toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [contents, search, status]);

  const activeContent = isCreating ? null : editing;
  const showForm = isCreating || !!editing;

  const handleSave = async (input: AcademyContentInput, pendingMaterials: AcademyUploadResult[]) => {
    try {
      const saved = await saveContent.mutateAsync({ id: activeContent?.id, input });
      await Promise.all(pendingMaterials.map((upload) => addAttachment.mutateAsync({ contentId: saved.id, upload })));
      toast({ title: input.status === 'published' ? "Conteudo publicado" : "Rascunho salvo", description: saved.title });
      setEditing(null);
      setIsCreating(false);
    } catch (saveError) {
      toast({
        title: "Nao foi possivel salvar",
        description: saveError instanceof Error ? saveError.message : "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAttachment = async (attachment: AcademyContentAttachment) => {
    try {
      await removeAttachment.mutateAsync(attachment.id);
      toast({ title: "Material removido", description: attachment.name });
    } catch (removeError) {
      toast({
        title: "Nao foi possivel remover o material",
        description: removeError instanceof Error ? removeError.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (content: AcademyContent) => {
    if (!window.confirm(`Excluir "${content.title}"?`)) return;
    try {
      await deleteContent.mutateAsync(content.id);
      toast({ title: "Conteudo excluido", description: content.title });
    } catch (deleteError) {
      toast({
        title: "Nao foi possivel excluir",
        description: deleteError instanceof Error ? deleteError.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleTogglePublish = async (content: AcademyContent) => {
    try {
      await publishContent.mutateAsync({ id: content.id, publish: content.status !== 'published' });
      toast({ title: content.status === 'published' ? "Conteudo despublicado" : "Conteudo publicado" });
    } catch (publishError) {
      toast({
        title: "Nao foi possivel alterar o status",
        description: publishError instanceof Error ? publishError.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Conteudos da Academia"
        subtitle="CMS educacional com video proprio, texto, banner e materiais para download."
        actions={
          <Button onClick={() => { setIsCreating(true); setEditing(null); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo conteudo
          </Button>
        }
      />

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5 mb-8">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Editar conteudo' : 'Novo conteudo'}</h2>
          <AcademyContentForm
            content={activeContent}
            isSaving={saveContent.isPending || addAttachment.isPending}
            onSubmit={handleSave}
            onRemoveAttachment={handleRemoveAttachment}
            onCancel={() => { setEditing(null); setIsCreating(false); }}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar conteudos..." className="flex-1" />
        <FilterBar options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando conteudos...</p>}

      {isError && (
        <div className="rounded-lg border border-border bg-card p-5 mb-6 text-sm text-muted-foreground">
          Nao foi possivel carregar o CMS da Academia. Verifique se a migration `academy_content_cms` foi aplicada.
          {error instanceof Error && <span className="block mt-2">{error.message}</span>}
        </div>
      )}

      {!isLoading && !isError && (contents ?? []).length === 0 ? (
        <EmptyState title="Nenhum conteudo cadastrado" description="Crie o primeiro conteudo educacional da Academia." />
      ) : (
        <DataTable
          rows={filtered}
          rowKey={(content) => content.id}
          emptyLabel="Nenhum conteudo encontrado."
          columns={[
            { header: 'Titulo', cell: (content) => content.title },
            { header: 'Slug', cell: (content) => content.slug },
            { header: 'Categoria', cell: (content) => content.category || '-' },
            {
              header: 'Midias',
              cell: (content) => [
                content.videoUrl ? 'Video' : null,
                content.body ? 'Texto' : null,
                content.attachments?.length ? `${content.attachments.length} materiais` : null,
              ].filter(Boolean).join(' / ') || '-',
            },
            { header: 'Status', cell: (content) => <AcademyContentStatusBadge status={content.status} /> },
            {
              header: '',
              cell: (content) => (
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button size="sm" variant="outline" className="border-border" onClick={() => handleTogglePublish(content)}>
                    {content.status === 'published' ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {content.status === 'published' ? 'Despublicar' : 'Publicar'}
                  </Button>
                  <Button size="sm" variant="outline" className="border-border" onClick={() => { setEditing(content); setIsCreating(false); }}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" className="border-border" onClick={() => handleDelete(content)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
    </AdminLayout>
  );
};

export default AdminContentPage;
