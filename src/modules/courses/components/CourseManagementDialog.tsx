import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, FilePlus2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';
import {
  courseManagementApi,
  type CourseInput,
  type CourseModuleRecord,
  type LessonRecord,
  type ManagedCourse,
  type MaterialType,
} from '@/modules/courses/services/courseManagement.api';

export type CourseDialogMode = 'create' | 'view' | 'edit';

interface CourseManagementDialogProps {
  open: boolean;
  mode: CourseDialogMode;
  course?: ManagedCourse | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const centsFromInput = (value: string) => {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
};

const inputFromCents = (value: number) => (value / 100).toFixed(2).replace('.', ',');

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const emptyCourseInput: CourseInput = {
  title: '',
  slug: '',
  short_description: null,
  description: null,
  thumbnail_url: null,
  category: 'Produção Musical',
  original_price_cents: 0,
  discount_cents: 0,
  currency: 'BRL',
  status: 'draft',
  visibility: 'private',
};

const CourseManagementDialog = ({
  open,
  mode: initialMode,
  course: initialCourse,
  onOpenChange,
  onSaved,
}: CourseManagementDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<CourseDialogMode>(initialMode);
  const [courseId, setCourseId] = useState<string | null>(initialCourse?.id ?? null);
  const [form, setForm] = useState<CourseInput>(emptyCourseInput);
  const [originalPrice, setOriginalPrice] = useState('0,00');
  const [discount, setDiscount] = useState('0,00');
  const [saving, setSaving] = useState(false);
  const [moduleDraft, setModuleDraft] = useState({ title: '', description: '' });
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonDraft, setLessonDraft] = useState({
    title: '',
    slug: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    durationMinutes: '',
  });
  const [materialLessonId, setMaterialLessonId] = useState<string | null>(null);
  const [materialDraft, setMaterialDraft] = useState({
    name: '',
    description: '',
    type: 'other' as MaterialType,
    fileUrl: '',
    mimeType: '',
    sizeBytes: '',
  });

  const courseQuery = useQuery({
    queryKey: ['managed-course', courseId],
    queryFn: () => courseManagementApi.getCourse(courseId!),
    enabled: open && Boolean(courseId),
    initialData: initialCourse?.id === courseId ? initialCourse : undefined,
  });

  const currentCourse = courseQuery.data;
  const readOnly = mode === 'view';

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setCourseId(initialCourse?.id ?? null);
  }, [open, initialMode, initialCourse?.id]);

  useEffect(() => {
    const source = currentCourse ?? initialCourse;
    if (!open) return;
    if (!source) {
      setForm(emptyCourseInput);
      setOriginalPrice('0,00');
      setDiscount('0,00');
      return;
    }

    setForm({
      title: source.title,
      slug: source.slug,
      short_description: source.short_description,
      description: source.description,
      thumbnail_url: source.thumbnail_url,
      category: source.category,
      original_price_cents: source.original_price_cents,
      discount_cents: source.discount_cents,
      currency: source.currency,
      status: source.status,
      visibility: source.visibility,
    });
    setOriginalPrice(inputFromCents(source.original_price_cents));
    setDiscount(inputFromCents(source.discount_cents));
  }, [open, currentCourse, initialCourse]);

  const finalPrice = useMemo(
    () => Math.max(0, centsFromInput(originalPrice) - centsFromInput(discount)),
    [originalPrice, discount],
  );

  const refreshCourse = async (id = courseId) => {
    if (!id) return;
    await queryClient.invalidateQueries({ queryKey: ['managed-course', id] });
    await queryClient.invalidateQueries({ queryKey: ['managed-courses'] });
    await queryClient.invalidateQueries({ queryKey: ['course-cards'] });
    await queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
    onSaved?.();
  };

  const saveCourse = async (event: FormEvent) => {
    event.preventDefault();
    const original = centsFromInput(originalPrice);
    const discountValue = centsFromInput(discount);

    if (!form.title.trim() || !form.slug.trim()) {
      toast({ title: 'Preencha o título e o slug.', variant: 'destructive' });
      return;
    }
    if (discountValue > original) {
      toast({ title: 'O desconto não pode ser maior que o valor original.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload: CourseInput = {
        ...form,
        title: form.title.trim(),
        slug: slugify(form.slug),
        short_description: form.short_description?.trim() || null,
        description: form.description?.trim() || null,
        thumbnail_url: form.thumbnail_url?.trim() || null,
        category: form.category?.trim() || null,
        original_price_cents: original,
        discount_cents: discountValue,
      };

      const saved = courseId
        ? await courseManagementApi.updateCourse(courseId, payload)
        : await courseManagementApi.createCourse(payload);

      setCourseId(saved.id);
      setMode('edit');
      await refreshCourse(saved.id);
      toast({ title: courseId ? 'Curso atualizado.' : 'Curso criado. Continue adicionando módulos e aulas.' });
    } catch (error) {
      toast({
        title: 'Não foi possível salvar o curso.',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const startModuleEdit = (module: CourseModuleRecord) => {
    setEditingModuleId(module.id);
    setModuleDraft({ title: module.title, description: module.description ?? '' });
  };

  const saveModule = async () => {
    if (!courseId || !moduleDraft.title.trim()) return;
    const modules = currentCourse?.course_modules ?? [];
    const existing = modules.find((item) => item.id === editingModuleId);

    try {
      const payload = {
        course_id: courseId,
        title: moduleDraft.title.trim(),
        description: moduleDraft.description.trim() || null,
        order_index: existing?.order_index ?? modules.length,
      };
      if (editingModuleId) await courseManagementApi.updateModule(editingModuleId, payload);
      else await courseManagementApi.createModule(payload);
      setEditingModuleId(null);
      setModuleDraft({ title: '', description: '' });
      await refreshCourse();
      toast({ title: editingModuleId ? 'Módulo atualizado.' : 'Módulo adicionado.' });
    } catch (error) {
      toast({ title: 'Não foi possível salvar o módulo.', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    }
  };

  const removeModule = async (module: CourseModuleRecord) => {
    if (!window.confirm(`Excluir o módulo “${module.title}” e todas as aulas vinculadas?`)) return;
    try {
      await courseManagementApi.deleteModule(module.id);
      await refreshCourse();
      toast({ title: 'Módulo excluído.' });
    } catch (error) {
      toast({ title: 'Não foi possível excluir o módulo.', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    }
  };

  const startLesson = (moduleId: string, lesson?: LessonRecord) => {
    setLessonModuleId(moduleId);
    setEditingLessonId(lesson?.id ?? null);
    setLessonDraft({
      title: lesson?.title ?? '',
      slug: lesson?.slug ?? '',
      description: lesson?.description ?? '',
      videoUrl: lesson?.video_url ?? '',
      thumbnailUrl: lesson?.thumbnail_url ?? '',
      durationMinutes: lesson?.duration_minutes ? String(lesson.duration_minutes) : '',
    });
  };

  const saveLesson = async () => {
    if (!lessonModuleId || !lessonDraft.title.trim()) return;
    const module = currentCourse?.course_modules.find((item) => item.id === lessonModuleId);
    const existing = module?.lessons.find((item) => item.id === editingLessonId);

    try {
      const payload = {
        module_id: lessonModuleId,
        title: lessonDraft.title.trim(),
        slug: slugify(lessonDraft.slug || lessonDraft.title),
        description: lessonDraft.description.trim() || null,
        video_url: lessonDraft.videoUrl.trim() || null,
        thumbnail_url: lessonDraft.thumbnailUrl.trim() || null,
        duration_minutes: lessonDraft.durationMinutes ? Number(lessonDraft.durationMinutes) : null,
        order_index: existing?.order_index ?? module?.lessons.length ?? 0,
        status: existing?.status ?? ('draft' as const),
      };
      if (editingLessonId) await courseManagementApi.updateLesson(editingLessonId, payload);
      else await courseManagementApi.createLesson(payload);
      setLessonModuleId(null);
      setEditingLessonId(null);
      await refreshCourse();
      toast({ title: editingLessonId ? 'Aula atualizada.' : 'Aula adicionada.' });
    } catch (error) {
      toast({ title: 'Não foi possível salvar a aula.', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    }
  };

  const removeLesson = async (lesson: LessonRecord) => {
    if (!window.confirm(`Excluir a aula “${lesson.title}” e os materiais vinculados?`)) return;
    try {
      await courseManagementApi.deleteLesson(lesson.id);
      await refreshCourse();
      toast({ title: 'Aula excluída.' });
    } catch (error) {
      toast({ title: 'Não foi possível excluir a aula.', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    }
  };

  const saveMaterial = async () => {
    if (!materialLessonId || !materialDraft.name.trim() || !materialDraft.fileUrl.trim()) return;
    const lesson = currentCourse?.course_modules
      .flatMap((module) => module.lessons)
      .find((item) => item.id === materialLessonId);

    try {
      await courseManagementApi.createMaterial({
        lesson_id: materialLessonId,
        name: materialDraft.name.trim(),
        description: materialDraft.description.trim() || null,
        material_type: materialDraft.type,
        file_url: materialDraft.fileUrl.trim(),
        mime_type: materialDraft.mimeType.trim() || null,
        size_bytes: materialDraft.sizeBytes ? Number(materialDraft.sizeBytes) : null,
        order_index: lesson?.lesson_materials.length ?? 0,
      });
      setMaterialLessonId(null);
      setMaterialDraft({ name: '', description: '', type: 'other', fileUrl: '', mimeType: '', sizeBytes: '' });
      await refreshCourse();
      toast({ title: 'Material adicionado.' });
    } catch (error) {
      toast({ title: 'Não foi possível adicionar o material.', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    }
  };

  const removeMaterial = async (id: string) => {
    try {
      await courseManagementApi.deleteMaterial(id);
      await refreshCourse();
      toast({ title: 'Material removido.' });
    } catch (error) {
      toast({ title: 'Não foi possível remover o material.', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    }
  };

  const title = mode === 'create' ? 'Novo curso' : mode === 'view' ? 'Visualizar curso' : 'Editar curso';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            O valor é definido somente no curso. Módulos, aulas e materiais são gerenciados neste mesmo modal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={saveCourse} className="space-y-6">
          <section className="grid gap-4 rounded-lg border border-border p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <h3 className="font-semibold">Dados gerais</h3>
            </div>
            <div>
              <Label htmlFor="course-title">Título</Label>
              <Input
                id="course-title"
                value={form.title}
                disabled={readOnly}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((current) => ({
                    ...current,
                    title: value,
                    slug: current.slug ? current.slug : slugify(value),
                  }));
                }}
                required
              />
            </div>
            <div>
              <Label htmlFor="course-slug">Slug</Label>
              <Input id="course-slug" value={form.slug} disabled={readOnly} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="course-category">Categoria</Label>
              <Input id="course-category" value={form.category ?? ''} disabled={readOnly} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
            </div>
            <div>
              <Label htmlFor="course-thumbnail">Imagem de capa — URL</Label>
              <Input id="course-thumbnail" type="url" value={form.thumbnail_url ?? ''} disabled={readOnly} onChange={(event) => setForm((current) => ({ ...current, thumbnail_url: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="course-short-description">Descrição curta</Label>
              <Input id="course-short-description" value={form.short_description ?? ''} disabled={readOnly} onChange={(event) => setForm((current) => ({ ...current, short_description: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="course-description">Descrição completa</Label>
              <Textarea id="course-description" value={form.description ?? ''} disabled={readOnly} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} />
            </div>
          </section>

          <section className="grid gap-4 rounded-lg border border-border p-4 md:grid-cols-3">
            <div className="md:col-span-3">
              <h3 className="font-semibold">Dados comerciais</h3>
              <p className="text-sm text-muted-foreground">Módulos e aulas não possuem preço.</p>
            </div>
            <div>
              <Label htmlFor="course-original-price">Valor original</Label>
              <Input id="course-original-price" inputMode="decimal" value={originalPrice} disabled={readOnly} onChange={(event) => setOriginalPrice(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="course-discount">Desconto aplicado</Label>
              <Input id="course-discount" inputMode="decimal" value={discount} disabled={readOnly} onChange={(event) => setDiscount(event.target.value)} />
            </div>
            <div>
              <Label>Valor final</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 font-semibold">{formatMoney(finalPrice)}</div>
            </div>
            <div>
              <Label htmlFor="course-status">Status</Label>
              <select id="course-status" className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.status} disabled={readOnly} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CourseInput['status'] }))}>
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>
            <div>
              <Label htmlFor="course-visibility">Visibilidade</Label>
              <select id="course-visibility" className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.visibility} disabled={readOnly} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as CourseInput['visibility'] }))}>
                <option value="private">Privado</option>
                <option value="public">Público</option>
                <option value="unlisted">Não listado</option>
              </select>
            </div>
          </section>

          {!readOnly && (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : courseId ? 'Salvar alterações' : 'Criar curso'}</Button>
            </div>
          )}
        </form>

        {courseId && (
          <section className="space-y-4 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Módulos e aulas</h3>
                <p className="text-sm text-muted-foreground">Cada aula pertence obrigatoriamente a um módulo.</p>
              </div>
              {!readOnly && <Button type="button" variant="outline" onClick={() => { setEditingModuleId(null); setModuleDraft({ title: '', description: '' }); }}><Plus className="mr-2 h-4 w-4" />Adicionar módulo</Button>}
            </div>

            {!readOnly && (
              <div className="grid gap-3 rounded-md bg-muted/40 p-3 md:grid-cols-[1fr_2fr_auto]">
                <Input placeholder="Título do módulo" value={moduleDraft.title} onChange={(event) => setModuleDraft((current) => ({ ...current, title: event.target.value }))} />
                <Input placeholder="Descrição do módulo" value={moduleDraft.description} onChange={(event) => setModuleDraft((current) => ({ ...current, description: event.target.value }))} />
                <Button type="button" onClick={saveModule}>{editingModuleId ? 'Atualizar módulo' : 'Salvar módulo'}</Button>
              </div>
            )}

            {courseQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando currículo...</p>}
            {!courseQuery.isLoading && !currentCourse?.course_modules.length && <p className="text-sm text-muted-foreground">Nenhum módulo cadastrado.</p>}

            <div className="space-y-4">
              {currentCourse?.course_modules.map((module, moduleIndex) => (
                <article key={module.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Módulo {moduleIndex + 1}</p>
                      <h4 className="font-semibold">{module.title}</h4>
                      {module.description && <p className="text-sm text-muted-foreground">{module.description}</p>}
                    </div>
                    {!readOnly && <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => startModuleEdit(module)}><Pencil className="mr-2 h-4 w-4" />Editar</Button><Button type="button" size="sm" variant="destructive" onClick={() => removeModule(module)}><Trash2 className="h-4 w-4" /></Button></div>}
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold">Aulas</h5>
                      {!readOnly && <Button type="button" size="sm" variant="outline" onClick={() => startLesson(module.id)}><BookOpen className="mr-2 h-4 w-4" />Adicionar aula</Button>}
                    </div>

                    {lessonModuleId === module.id && !readOnly && (
                      <div className="grid gap-3 rounded-md bg-muted/40 p-3 md:grid-cols-2">
                        <div><Label>Título</Label><Input value={lessonDraft.title} onChange={(event) => setLessonDraft((current) => ({ ...current, title: event.target.value, slug: current.slug || slugify(event.target.value) }))} /></div>
                        <div><Label>Slug</Label><Input value={lessonDraft.slug} onChange={(event) => setLessonDraft((current) => ({ ...current, slug: event.target.value }))} /></div>
                        <div><Label>URL do vídeo</Label><Input type="url" value={lessonDraft.videoUrl} onChange={(event) => setLessonDraft((current) => ({ ...current, videoUrl: event.target.value }))} /></div>
                        <div><Label>Imagem de capa — URL</Label><Input type="url" value={lessonDraft.thumbnailUrl} onChange={(event) => setLessonDraft((current) => ({ ...current, thumbnailUrl: event.target.value }))} /></div>
                        <div><Label>Duração em minutos</Label><Input type="number" min="0" value={lessonDraft.durationMinutes} onChange={(event) => setLessonDraft((current) => ({ ...current, durationMinutes: event.target.value }))} /></div>
                        <div className="md:col-span-2"><Label>Descrição</Label><Textarea value={lessonDraft.description} onChange={(event) => setLessonDraft((current) => ({ ...current, description: event.target.value }))} /></div>
                        <div className="flex gap-2 md:col-span-2"><Button type="button" onClick={saveLesson}>{editingLessonId ? 'Atualizar aula' : 'Salvar aula'}</Button><Button type="button" variant="outline" onClick={() => setLessonModuleId(null)}>Cancelar</Button></div>
                      </div>
                    )}

                    {!module.lessons.length && <p className="text-sm text-muted-foreground">Nenhuma aula cadastrada.</p>}
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.id} className="rounded-md border border-border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Aula {lessonIndex + 1}</p>
                            <p className="font-medium">{lesson.title}</p>
                            <p className="text-xs text-muted-foreground">/{lesson.slug}{lesson.duration_minutes ? ` · ${lesson.duration_minutes} min` : ''}</p>
                          </div>
                          {!readOnly && <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => startLesson(module.id, lesson)}><Pencil className="mr-2 h-4 w-4" />Editar</Button><Button type="button" size="sm" variant="outline" onClick={() => setMaterialLessonId(lesson.id)}><FilePlus2 className="mr-2 h-4 w-4" />Material</Button><Button type="button" size="sm" variant="destructive" onClick={() => removeLesson(lesson)}><Trash2 className="h-4 w-4" /></Button></div>}
                        </div>

                        {materialLessonId === lesson.id && !readOnly && (
                          <div className="mt-3 grid gap-3 rounded-md bg-muted/40 p-3 md:grid-cols-2">
                            <div><Label>Nome do material</Label><Input value={materialDraft.name} onChange={(event) => setMaterialDraft((current) => ({ ...current, name: event.target.value }))} /></div>
                            <div><Label>Tipo</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={materialDraft.type} onChange={(event) => setMaterialDraft((current) => ({ ...current, type: event.target.value as MaterialType }))}><option value="audio_project">Projeto de áudio</option><option value="wav">WAV</option><option value="mp3">MP3</option><option value="pdf">PDF</option><option value="document">Documento</option><option value="archive">Arquivo compactado</option><option value="other">Outro</option></select></div>
                            <div className="md:col-span-2"><Label>URL do arquivo</Label><Input type="url" value={materialDraft.fileUrl} onChange={(event) => setMaterialDraft((current) => ({ ...current, fileUrl: event.target.value }))} /></div>
                            <div><Label>MIME type</Label><Input value={materialDraft.mimeType} onChange={(event) => setMaterialDraft((current) => ({ ...current, mimeType: event.target.value }))} /></div>
                            <div><Label>Tamanho em bytes</Label><Input type="number" min="0" value={materialDraft.sizeBytes} onChange={(event) => setMaterialDraft((current) => ({ ...current, sizeBytes: event.target.value }))} /></div>
                            <div className="md:col-span-2"><Label>Descrição</Label><Input value={materialDraft.description} onChange={(event) => setMaterialDraft((current) => ({ ...current, description: event.target.value }))} /></div>
                            <div className="flex gap-2 md:col-span-2"><Button type="button" onClick={saveMaterial}>Adicionar material</Button><Button type="button" variant="outline" onClick={() => setMaterialLessonId(null)}>Cancelar</Button></div>
                          </div>
                        )}

                        {!!lesson.lesson_materials.length && <div className="mt-3 space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Materiais adicionais</p>{lesson.lesson_materials.map((material) => <div key={material.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm"><a className="underline-offset-4 hover:underline" href={material.file_url} target="_blank" rel="noreferrer">{material.name} · {material.material_type}</a>{!readOnly && <Button type="button" size="sm" variant="ghost" onClick={() => removeMaterial(material.id)}><Trash2 className="h-4 w-4" /></Button>}</div>)}</div>}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <DialogFooter>
          {readOnly && <Button type="button" onClick={() => setMode('edit')}><Pencil className="mr-2 h-4 w-4" />Editar curso</Button>}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CourseManagementDialog;
