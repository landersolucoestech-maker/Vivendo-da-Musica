import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useProductById } from '@/modules/marketplace/hooks/useProductById';
import { useProductCategories } from '@/modules/marketplace/hooks/useProducts';
import { marketplaceService } from '@/modules/marketplace/services/marketplace.service';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';

interface ProductManagementDialogProps {
  open: boolean;
  productId: string | null;
  onOpenChange: (open: boolean) => void;
}

const ProductManagementDialog = ({ open, productId, onOpenChange }: ProductManagementDialogProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: existing, isLoading } = useProductById(productId ?? undefined);
  const { data: categories } = useProductCategories();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (existing) {
      setTitle(existing.title);
      setCategory(existing.category);
      setPrice(String(existing.priceCents / 100));
      setDescription('');
      return;
    }

    if (!productId) {
      setTitle('');
      setCategory(categories?.[0] ?? '');
      setPrice('');
      setDescription('');
    }
  }, [categories, existing, open, productId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const normalizedPrice = Number(price.replace(',', '.'));
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      toast({ title: 'Preço inválido', description: 'Informe um valor numérico maior ou igual a zero.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        description: description.trim(),
        priceCents: Math.round(normalizedPrice * 100),
      };

      if (existing) {
        await marketplaceService.updateProduct(existing.id, payload);
        toast({ title: 'Produto atualizado', description: payload.title });
      } else {
        await marketplaceService.createProduct(payload);
        toast({ title: 'Produto criado', description: payload.title });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['product', productId] }),
      ]);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Não foi possível salvar o produto',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const editing = Boolean(productId);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Atualize os dados do produto selecionado.' : 'Cadastre um novo produto no catálogo do marketplace.'}
          </DialogDescription>
        </DialogHeader>

        {editing && isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">Carregando produto...</p>
        ) : (
          <form id="product-management-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-title">Título</Label>
              <Input id="product-title" value={title} onChange={(event) => setTitle(event.target.value)} required disabled={saving} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-category">Categoria</Label>
              <select
                id="product-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
                disabled={saving}
              >
                {(categories ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description">Descrição</Label>
              <Textarea id="product-description" value={description} onChange={(event) => setDescription(event.target.value)} disabled={saving} />
              {editing && (
                <p className="text-xs text-muted-foreground">
                  O contrato atual de leitura não retorna a descrição existente. Preencha este campo apenas para substituí-la.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-price">Preço (R$)</Label>
              <Input id="product-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required disabled={saving} />
            </div>
          </form>
        )}

        <DialogFooter>
          <Button variant="outline" type="button" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button form="product-management-form" type="submit" disabled={saving || (editing && isLoading)}>
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar produto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductManagementDialog;
