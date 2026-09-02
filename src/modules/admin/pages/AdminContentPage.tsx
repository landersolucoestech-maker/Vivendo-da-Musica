import { useMemo, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import AdminLayout from '@/app/layouts/AdminLayout';
import PageHeader from '@/shared/components/PageHeader';
import DataTable from '@/shared/components/DataTable';
import EmptyState from '@/shared/components/EmptyState';
import LoadingState from '@/shared/components/LoadingState';
import SearchInput from '@/shared/components/SearchInput';
import FilterBar from '@/shared/components/FilterBar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';
import AcademyContentForm from '@/modules/courses/components/AcademyContentForm';
import AcademyContentStatusBadge from '@/modules/courses/components/AcademyContentStatusBadge';
import {
  useAddAcademyAttachment,
  useAdminAcademyContents,
  useDeleteAcademyContent,
  usePublishAcademyContent,
  useRemoveAcademyAttachment,
  useSaveAcademyContent,
} from '@/modules/courses/hooks/useAcademyContents';
import type {
  AcademyContent,
  AcademyContentAttachment,
  AcademyContentInput,
  AcademyUploadResult,
} from '@/modules/courses/types/academyContent.types';

const STATUS_FILTERS = [
  { value: 'Todos', label: 'Todos' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'published', label: 'Publicados' },
];

const AdminContentPage = () => {
  const { toast } = useToast();
  const { data: contents, isLoading, isError, error } = useAdminAcademyContents();
  const saveContent = useSaveAcademyContent();
  const deleteContent = useDeleteAcademyContent();
  const publishContent = usePublishAcademyContent();
  const addAttachment = useAddAcademyAttachment();
  const removeAttachment = useRemoveAcademyAttachment();
  const [editing, setEditing] = useState<AcademyContent | null>(null);
  const [viewing, setViewing] = useState<AcademyContent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AcademyContent | null>(null);
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
  const editorOpen = isCreating || !!editing;

  const closeEditor = () => {
    if (saveContent.isPending || addAttachment.isPending) return;
    setEditing(null);
    setIsCreating(false);
  };

  const handleSave = async (input: AcademyContentInput, pendingMaterials: AcademyUploadResult[]) => {
    try {
      const saved = await saveContent.mutateAsync({ id: activeContent?.id, input });
      await Promise.all(
        pendingMaterials.map((upload) => addAttachment.mutateAsync({ contentId: saved.id, upload })),
      );
      toast({
        title: input.status === 'published' ? 'Conteúdo publicado' : 'Rascunho salvo',
        description: saved.title,
      });
      setEditing(null);
      setIsCreating(false);
    } catch (saveError) {
      toast({
        title: 'Não foi possível salvar',
        description: saveError instanceof Error ? saveError.message : 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveAttachment = async (attachment: AcademyContentAttachment) => {
    try {
      await removeAttachment.mutateAsync(attachment.id);
      toast({ title: 'Material removido', description: attachment.name });
    } catch (removeError) {
      toast({
        title: 'Não foi possível remover o material',
        description: removeError instanceof Error ? removeError.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteContent.mutateAsync(pendingDelete.id);
      toast({ title: 'Conteúdo excluído', description: pendingDelete.title });
      setPendingDelete(null);
    } catch (deleteError) {
      toast({
        title: 'Não foi possível excluir',
        description: deleteError instanceof Error ? deleteError.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePublish = async (content: AcademyContent) => {
    try {
      await publishContent.mutateAsync({ id: content.id, publish: content.status !== 'published' });
      toast({ title: content.status === 'published' ? 'Conteúdo despublicado' : 'Conteúdo publicado' });
    } catch (publishError) {
      toast({
        title: 'Não foi possível alterar o status',
        description: publishError instanceof Error ? publishError.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Conteúdos da Academia"
        subtitle="Crie, visualize e edite conteúdos, mídias e materiais somente em popups centralizados."
        actions={
          <Button onClick={() => { setIsCreating(true); setEditing(null); }}>
            <Plus className="mr-2 size-4" />
            Novo conteúdo
          </Button>
        }
      />

      {isLoading && <LoadingState rows={6} />}

      {isError && (
        <div className="mb-6 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
          Não foi possível carregar o CMS da Academia. Verifique se a migration `academy_content_cms` foi aplicada.
          {error instanceof Error && <span className="mt-2 block">{error.message}</span>}
        </div>
      )}

      {contents && !isLoading && !isError && (
        <>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar conteúdos..." className="flex-1" />
            <FilterBar options={STATUS_FILTERS} value={status} onChange={setStatus} />
          </div>

          {contents.length === 0 ? (
            <EmptyState title="Nenhum conteúdo cadastrado" description="Crie o primeiro conteúdo educacional da Academia." />
          ) : (
            <DataTable
              rows={filtered}
              rowKey={(content) => content.id}
              emptyLabel="Nenhum conteúdo encontrado."
              columns={[
                { header: 'Título', cell: (content) => content.title },
                { header: 'Slug', cell: (content) => content.slug },
                { header: 'Categoria', cell: (content) => content.category || '-' },
                {
                  header: 'Mídias',
                  cell: (content) => [
                    content.videoUrl ? 'Vídeo' : null,
                    content.body ? 'Texto' : null,
                    content.attachments?.length ? `${content.attachments.length} materiais` : null,
                  ].filter(Boolean).join(' / ') || '-',
                },
                { header: 'Status', cell: (content) => <AcademyContentStatusBadge status={content.status} /> },
                {
                  header: 'Ações',
                  cell: (content) => (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" className="border-border" onClick={() => setViewing(content)}>
                        <Eye className="mr-2 size-4" />
                        Visualizar
                      </Button>
                      <Button size="sm" variant="outline" className="border-border" onClick={() => void handleTogglePublish(content)}>
                        {content.status === 'published' ? <EyeOff className="mr-2 size-4" /> : <Eye className="mr-2 size-4" />}
                        {content.status === 'published' ? 'Despublicar' : 'Publicar'}
                      </Button>
                      <Button size="sm" variant="outline" className="border-border" onClick={() => { setEditing(content); setIsCreating(false); }}>
                        <Pencil className="mr-2 size-4" />
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" className="border-border" onClick={() => setPendingDelete(content)}>
                        <Trash2 className="mr-2 size-4" />
                        Excluir
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      <Dialog open={editorOpen} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar conteúdo' : 'Novo conteúdo'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Atualize texto, vídeo, imagens e materiais vinculados.' : 'Cadastre o conteúdo educacional e defina se será salvo como rascunho ou publicado.'}
            </DialogDescription>
          </DialogHeader>
          <AcademyContentForm
            content={activeContent}
            isSaving={saveContent.isPending || addAttachment.isPending}
            onSubmit={handleSave}
            onRemoveAttachment={handleRemoveAttachment}
            onCancel={closeEditor}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar conteúdo</DialogTitle>
            <DialogDescription>Visão completa dos dados persistidos no CMS.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-5">
              <div className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">Título</p><p className="mt-1 font-semibold text-white">{viewing.title}</p></div>
                <div><p className="text-xs text-muted-foreground">Slug</p><p className="mt-1 font-mono text-sm text-white">{viewing.slug}</p></div>
                <div><p className="text-xs text-muted-foreground">Categoria</p><p className="mt-1 text-white">{viewing.category || 'Não informada'}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><div className="mt-1"><AcademyContentStatusBadge status={viewing.status} /></div></div>
              </div>
              {viewing.subtitle && <div><p className="text-xs text-muted-foreground">Subtítulo</p><p className="mt-2 text-white">{viewing.subtitle}</p></div>}
              <div><p className="text-xs text-muted-foreground">Descrição</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-white">{viewing.description || 'Sem descrição.'}</p></div>
              <div><p className="text-xs text-muted-foreground">Conteúdo textual</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-white">{viewing.body || 'Sem conteúdo textual.'}</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-muted-foreground">Vídeo</p><p className="mt-2 break-all text-sm text-white">{viewing.videoUrl || 'Não vinculado'}</p></div>
                <div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-muted-foreground">Materiais</p><p className="mt-2 text-sm text-white">{viewing.attachments?.length ?? 0} arquivo(s)</p></div>
              </div>
              {!!viewing.attachments?.length && (
                <div className="space-y-2">
                  {viewing.attachments.map((attachment) => (
                    <div key={attachment.id} className="rounded-xl border border-white/10 p-3"><p className="text-sm font-medium text-white">{attachment.name}</p><p className="mt-1 text-xs text-muted-foreground">{attachment.mimeType} · {attachment.size.toLocaleString('pt-BR')} bytes</p></div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Fechar</Button>
            <Button onClick={() => { const content = viewing; setViewing(null); setEditing(content); setIsCreating(false); }}>
              <Pencil className="size-4" />Editar conteúdo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conteúdo?</AlertDialogTitle>
            <AlertDialogDescription>
              O conteúdo “{pendingDelete?.title}” e seus vínculos serão excluídos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteContent.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteContent.isPending}
              onClick={(event) => { event.preventDefault(); void confirmDelete(); }}
            >
              {deleteContent.isPending ? 'Excluindo...' : 'Excluir definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminContentPage;
