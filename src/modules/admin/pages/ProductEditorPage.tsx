import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "@/app/layouts/AdminLayout";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";
import { useProductById } from "@/modules/marketplace/hooks/useProductById";
import { useProductCategories } from "@/modules/marketplace/hooks/useProducts";
import { marketplaceService } from "@/modules/marketplace/services/marketplace.service";
import { ROUTES } from "@/shared/constants/routes";

const ProductEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: existing } = useProductById(id);
  const { data: categories } = useProductCategories();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setCategory(existing.category);
      setPrice(String(existing.priceCents / 100));
    } else if (categories?.length && !category) {
      setCategory(categories[0]);
    }
  }, [existing, categories, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { title, category, description, priceCents: Math.round(Number(price) * 100) || 0 };

    if (existing) {
      await marketplaceService.updateProduct(existing.id, payload);
      toast({ title: "Produto atualizado", description: title });
    } else {
      await marketplaceService.createProduct(payload);
      toast({ title: "Produto criado", description: title });
    }
    navigate(ROUTES.adminProducts);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">{existing ? 'Editar produto' : 'Novo produto'}</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="category">Categoria</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {(categories ?? []).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="price">Preço (R$)</Label>
          <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <Button type="submit">
          {existing ? 'Salvar alterações' : 'Criar produto'}
        </Button>
      </form>
    </AdminLayout>
  );
};

export default ProductEditorPage;
