import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "@/app/layouts/AdminLayout";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";
import { useCourses } from "@/modules/courses/hooks/useCourses";
import { academyService } from "@/modules/courses/services/academy.service";
import { ROUTES } from "@/shared/constants/routes";

const CourseEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: courses } = useCourses();
  const existingReal = id ? courses?.find((c) => c.id === id) : undefined;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [priceCents, setPriceCents] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingReal) {
      setTitle(existingReal.title);
      setSlug(existingReal.slug);
      setDescription(existingReal.description ?? '');
      setPriceCents(String(existingReal.price_cents));
    }
  }, [existingReal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = { title, slug, description, price_cents: Number(priceCents) || 0, currency: 'BRL' };
    const { error } = existingReal
      ? await academyService.updateCourse(existingReal.id, payload)
      : await academyService.createCourse(payload);

    setIsSubmitting(false);

    if (error) {
      toast({ title: "Não foi possível salvar o curso", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: existingReal ? "Curso atualizado" : "Curso criado como rascunho" });
    navigate(ROUTES.adminCourses);
  };

  const existing = existingReal;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">{existing ? 'Editar curso' : 'Novo curso'}</h1>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="producao-musical" required />
        </div>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="price">Preço (em centavos)</Label>
          <Input id="price" type="number" value={priceCents} onChange={(e) => setPriceCents(e.target.value)} />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : existing ? 'Salvar alterações' : 'Salvar como rascunho'}
        </Button>
      </form>
    </AdminLayout>
  );
};

export default CourseEditorPage;
