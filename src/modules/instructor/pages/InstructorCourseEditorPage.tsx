import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import InstructorLayout from "@/app/layouts/InstructorLayout";
import CourseCurriculumEditor from "@/modules/instructor/components/CourseCurriculumEditor";
import { useInstructorCourses } from "@/modules/instructor/hooks/useInstructorCourses";
import { instructorService } from "@/modules/instructor/services/instructor.service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { ROUTES } from "@/shared/constants/routes";
import { useToast } from "@/shared/hooks/use-toast";

const InstructorCourseEditorPage = () => {
  const { id } = useParams();
  const { data } = useInstructorCourses();
  const existing = data?.find((course) => course.id === id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setSlug(existing.slug);
    setDescription(existing.description);
    setPrice(String(existing.priceCents));
  }, [existing]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await instructorService.saveCourse({ id: existing?.id, title: title.trim(), slug: slug.trim().toLowerCase(), description: description.trim(), priceCents: Math.max(0, Number(price) || 0) });
      toast({ title: existing ? 'Curso atualizado' : 'Curso criado como rascunho' });
      if (!existing) navigate(ROUTES.instructorCourses);
    } catch (error) {
      toast({ title: 'Não foi possível salvar', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <InstructorLayout>
      <h1 className="mb-6 text-2xl font-bold">{existing ? 'Editar curso' : 'Novo curso'}</h1>
      <form onSubmit={submit} className="max-w-xl space-y-4">
        <div><Label htmlFor="title">Título</Label><Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} /></div>
        <div><Label htmlFor="slug">Slug</Label><Input id="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required pattern="[a-z0-9-]+" /></div>
        <div><Label htmlFor="description">Descrição</Label><Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        <div><Label htmlFor="price">Preço em centavos</Label><Input id="price" type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} /></div>
        <Button disabled={saving}>{saving ? 'Salvando...' : 'Salvar curso'}</Button>
      </form>
      {existing && <CourseCurriculumEditor courseId={existing.id} />}
    </InstructorLayout>
  );
};

export default InstructorCourseEditorPage;
