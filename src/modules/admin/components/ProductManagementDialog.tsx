import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { useProductById } from '@/modules/marketplace/hooks/useProductById';
import { useProductCategories } from '@/modules/marketplace/hooks/useProducts';
import { marketplaceService } from '@/modules/marketplace/services/marketplace.service';
import type { Product } from '@/modules/marketplace/types/product';
import StatusBadge from '@/shared/components/StatusBadge';
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
import { formatPrice } from '@/shared/utils/formatters';

export type ProductManagementMode = 'create' | 'view' | 'edit';

interface ProductManagementDialogProps {
  open: boolean;
  mode: ProductManagementMode;
  productId: string | null;
  onOpenChange: (open: boolean) => void;
  onModeChange?: (mode: ProductManagementMode) => void;
}

type ProductStatus = Product['status'];

const ProductManagementDialog = ({ open, mode, productId, onOpenChange, onModeChange }: ProductManagementDialogProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: existing, isLoading, isError } = useProductById(productId ?? undefined);
  const { data: categories } = useProductCategories();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProductStatus>('draft');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || mode === 'view') return;

    if (existing) {
      setTitle(existing.title);
      setCategory(existing.category);
      setPrice(String(existing.priceCents / 100));
      setDescription(existing.description);
      setStatus(existing.status);
      return;
    }

    if (mode === 'create') {
      setTitle('');
      setCategory(categories?.[0] ?? '');
      setPrice('');
      setDescription('');
      setStatus('draft');
    }
  }, [categories, existing, mode, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || mode === 'view') return;

    if (mode === 'edit' && !existing) {
      toast({
        title: 'Produto não encontrado',
        description: 'Recarregue a listagem e selecione um produto válido.',
        variant: 'destructive',
      });
      return;
    }

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
        status,
      };

      if (existing) {
        await marketplaceService.updateProduct(existing.id, payload);
        toast({ title: 'Produto atualizado', description: payload.title });
      } else {
        await marketplaceService.createProduct(payload);
        toast({ title: 'Produto criado', description: payload.title });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['managed-products'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['product-by-id', productId] }),
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

  const requiresProduct = mode !== 'create';
  const missingProduct = requiresProduct && !isLoading && (isError || !existing);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo produto' : mode === 'edit' ? 'Editar produto' : 'Visualizar produto'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Cadastre um novo produto no catálogo do marketplace.'
              : mode === 'edit'
                ? 'Atualize os dados do produto selecionado.'
                : 'Consulte todos os dados comerciais persistidos para este produto.'}
          </DialogDescription>
        </DialogHeader>

        {requiresProduct && isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">Carregando produto...</p>
        ) : missingProduct ? (
          <p className="py-6 text-sm text-destructive">O produto selecionado não existe ou não está acessível.</p>
        ) : mode === 'view' && existing ? (
          <div className="space-y-5">
            <div className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Título</p><p className="mt-1 font-semibold text-white">{existing.title}</p></div>
              <div><p className="text-xs text-muted-foreground">Categoria</p><p className="mt-1 text-white">{existing.category}</p></div>
              <div><p className="text-xs text-muted-foreground">Preço</p><p className="mt-1 text-white">{formatPrice(existing.priceCents)}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={existing.status} label={existing.status === 'published' ? 'Publicado' : existing.status === 'archived' ? 'Arquivado' : 'Rascunho'} /></div></div>
            </div>
            <div><p className="text-xs text-muted-foreground">Descrição</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-white">{existing.description || 'Sem descrição.'}</p></div>
            <div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-muted-foreground">Identificador</p><p className="mt-2 font-mono text-xs text-white">{existing.id}</p></div>
          </div>
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-price">Preço (R$)</Label>
                <Input id="product-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required disabled={saving} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-status">Status</Label>
                <select
                  id="product-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ProductStatus)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  disabled={saving}
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
            </div>
          </form>
        )}

        <DialogFooter>
          <Button variant="outline" type="button" disabled={saving} onClick={() => onOpenChange(false)}>{mode === 'view' ? 'Fechar' : 'Cancelar'}</Button>
          {mode === 'view' && existing && (
            <Button type="button" onClick={() => onModeChange?.('edit')}><Pencil className="size-4" />Editar produto</Button>
          )}
          {mode !== 'view' && !missingProduct && (
            <Button form="product-management-form" type="submit" disabled={saving || (mode === 'edit' && isLoading)}>
              {saving ? 'Salvando...' : mode === 'edit' ? 'Salvar alterações' : 'Criar produto'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductManagementDialog;
