import { FormEvent, useState } from 'react';
import { Archive, Download, Eye, FileUp, PackagePlus, Pencil, Plus, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import ProducerLayout from '@/app/layouts/ProducerLayout';
import { useProducerProducts } from '@/modules/producer/hooks/useProducerProducts';
import { producerService } from '@/modules/producer/services/producer.service';
import type { SellerProduct, SellerProductType } from '@/modules/producer/types/producer.types';
import DataTable from '@/shared/components/DataTable';
import LoadingState from '@/shared/components/LoadingState';
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

const productTypes: { value: SellerProductType; label: string }[] = [
  { value: 'preset', label: 'Preset' },
  { value: 'drum_kit', label: 'Drum kit' },
  { value: 'midi', label: 'Arquivo MIDI' },
  { value: 'plugin', label: 'Plugin' },
  { value: 'template', label: 'Template' },
  { value: 'project', label: 'Projeto' },
  { value: 'ebook', label: 'E-book' },
  { value: 'other', label: 'Outro' },
];

type ProductDialogMode = 'create' | 'view' | 'edit';

const formatFileSize = (size: number) => {
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(1)} GB`;
  if (size >= 1024 ** 2) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${size} bytes`;
};

const ProducerProductsPage = () => {
  const { data, isLoading, isError } = useProducerProducts();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<ProductDialogMode>('create');
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openDialog = (mode: ProductDialogMode, product?: SellerProduct) => {
    setDialogMode(mode);
    setSelectedProduct(product ?? null);
    setDialogOpen(true);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fileValue = form.get('file');
    const file = fileValue instanceof File && fileValue.size ? fileValue : undefined;

    if (dialogMode === 'create' && !file) {
      toast({ title: 'Arquivo obrigatório', description: 'Selecione o arquivo que será entregue ao comprador.', variant: 'destructive' });
      return;
    }

    const priceReais = Number(String(form.get('price')).replace(',', '.'));
    if (!Number.isFinite(priceReais) || priceReais < 0) {
      toast({ title: 'Preço inválido', description: 'Informe um valor monetário válido.', variant: 'destructive' });
      return;
    }

    const payload = {
      title: String(form.get('title')).trim(),
      slug: String(form.get('slug')).trim().toLowerCase(),
      description: String(form.get('description')).trim(),
      productType: String(form.get('productType')) as SellerProductType,
      priceCents: Math.round(priceReais * 100),
    };

    setSaving(true);
    try {
      if (dialogMode === 'edit' && selectedProduct) {
        await producerService.updateProduct(selectedProduct.id, {
          ...payload,
          ...(file ? { replacementFile: file } : {}),
        });
        toast({ title: 'Produto atualizado', description: file ? 'Dados e arquivo substituídos.' : 'Dados comerciais atualizados.' });
      } else if (file) {
        await producerService.createProduct({ ...payload, file });
        toast({ title: 'Produto criado', description: 'O produto foi salvo como rascunho para revisão.' });
      }

      formElement.reset();
      await queryClient.invalidateQueries({ queryKey: ['producer-products'] });
      setDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      toast({
        title: dialogMode === 'edit' ? 'Não foi possível atualizar o produto' : 'Não foi possível criar o produto',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: string, status: 'published' | 'archived') => {
    setChanging(id);
    try {
      await producerService.setProductStatus(id, status);
      await queryClient.invalidateQueries({ queryKey: ['producer-products'] });
      toast({ title: status === 'published' ? 'Produto publicado' : 'Produto arquivado' });
    } catch (error) {
      toast({ title: 'Não foi possível alterar o produto', description: error instanceof Error ? error.message : 'Revise os dados e tente novamente.', variant: 'destructive' });
    } finally {
      setChanging(null);
    }
  };

  const downloadFile = async (product: SellerProduct, fileIndex: number) => {
    const file = product.files[fileIndex];
    if (!file) return;
    setDownloading(file.id);
    try {
      const url = await producerService.getProductFileDownloadUrl(file);
      window.location.assign(url);
    } catch (error) {
      toast({ title: 'Arquivo indisponível', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <ProducerLayout>
        <LoadingState rows={5} />
      </ProducerLayout>
    );
  }

  if (isError || !data) {
    return (
      <ProducerLayout>
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-red-300">
          Não foi possível carregar os produtos.
        </p>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="vdm-eyebrow">Catálogo comercial</p>
          <h1 className="vdm-page-title mt-2">Produtos digitais</h1>
          <p className="vdm-page-description">Crie, visualize e edite produtos digitais somente em popups centralizados.</p>
        </div>
        <Button onClick={() => openDialog('create')}>
          <Plus className="size-4" />
          Novo produto
        </Button>
      </header>

      <section>
        <div className="mb-4">
          <p className="vdm-eyebrow">Gerenciamento</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-white">Produtos cadastrados</h2>
        </div>

        <DataTable
          rows={data}
          rowKey={(item) => item.id}
          emptyLabel="Nenhum produto cadastrado."
          columns={[
            { header: 'Produto', cell: (item) => <span className="font-semibold text-white">{item.title}</span> },
            { header: 'Tipo', cell: (item) => productTypes.find((type) => type.value === item.productType)?.label ?? item.productType },
            { header: 'Preço', cell: (item) => formatPrice(item.priceCents, item.currency) },
            { header: 'Arquivos', cell: (item) => String(item.fileCount) },
            { header: 'Status', cell: (item) => <StatusBadge status={item.status} label={item.status === 'published' ? 'Publicado' : item.status === 'archived' ? 'Arquivado' : 'Rascunho'} /> },
            {
              header: 'Ações',
              cell: (item) => (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openDialog('view', item)}>
                    <Eye className="size-4" /> Visualizar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openDialog('edit', item)}>
                    <Pencil className="size-4" /> Editar
                  </Button>
                  {item.status !== 'published' ? (
                    <Button size="sm" disabled={changing === item.id} onClick={() => void changeStatus(item.id, 'published')}>Publicar</Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={changing === item.id} onClick={() => void changeStatus(item.id, 'archived')}>
                      <Archive className="size-4" /> Arquivar
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <DialogContent key={`${dialogMode}-${selectedProduct?.id ?? 'new'}`} className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {dialogMode === 'view' && selectedProduct ? (
            <>
              <DialogHeader>
                <DialogTitle>Visualizar produto</DialogTitle>
                <DialogDescription>Informações persistidas e arquivos privados vinculados ao produto.</DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <div className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2">
                  <div><p className="text-xs text-muted-foreground">Título</p><p className="mt-1 font-semibold text-white">{selectedProduct.title}</p></div>
                  <div><p className="text-xs text-muted-foreground">Slug</p><p className="mt-1 font-mono text-sm text-white">{selectedProduct.slug}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tipo</p><p className="mt-1 text-white">{productTypes.find((type) => type.value === selectedProduct.productType)?.label}</p></div>
                  <div><p className="text-xs text-muted-foreground">Preço</p><p className="mt-1 text-white">{formatPrice(selectedProduct.priceCents, selectedProduct.currency)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={selectedProduct.status} label={selectedProduct.status === 'published' ? 'Publicado' : selectedProduct.status === 'archived' ? 'Arquivado' : 'Rascunho'} /></div></div>
                  <div><p className="text-xs text-muted-foreground">Criado em</p><p className="mt-1 text-white">{new Date(selectedProduct.createdAt).toLocaleString('pt-BR')}</p></div>
                </div>
                <div><p className="text-xs text-muted-foreground">Descrição</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-white">{selectedProduct.description || 'Sem descrição.'}</p></div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-white">Arquivos de entrega</p>
                  <div className="space-y-2">
                    {selectedProduct.files.map((file, index) => (
                      <div key={file.id} className="flex flex-col gap-3 rounded-xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{file.fileName}</p><p className="mt-1 text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)} · {file.mimeType || 'tipo não informado'}</p></div>
                        <Button size="sm" variant="outline" disabled={downloading === file.id} onClick={() => void downloadFile(selectedProduct, index)}>
                          <Download className="size-4" />{downloading === file.id ? 'Liberando...' : 'Baixar'}
                        </Button>
                      </div>
                    ))}
                    {!selectedProduct.files.length && <p className="text-sm text-muted-foreground">Nenhum arquivo vinculado.</p>}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Fechar</Button>
                <Button onClick={() => setDialogMode('edit')}><Pencil className="size-4" />Editar produto</Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={(event) => void saveProduct(event)}>
              <DialogHeader>
                <DialogTitle>{dialogMode === 'edit' ? 'Editar produto' : 'Novo produto'}</DialogTitle>
                <DialogDescription>
                  {dialogMode === 'edit'
                    ? 'Atualize os dados e, quando necessário, substitua o arquivo entregue ao comprador.'
                    : 'O produto será criado como rascunho e poderá ser publicado depois da revisão.'}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="product-title">Título</Label><Input id="product-title" name="title" defaultValue={selectedProduct?.title ?? ''} required minLength={3} /></div>
                <div className="space-y-2"><Label htmlFor="product-slug">Slug</Label><Input id="product-slug" name="slug" defaultValue={selectedProduct?.slug ?? ''} placeholder="pack-drums-trap" required pattern="[a-z0-9-]+" /></div>
                <div className="space-y-2"><Label htmlFor="product-type">Tipo</Label><select id="product-type" name="productType" defaultValue={selectedProduct?.productType ?? productTypes[0].value} className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">{productTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="product-price">Preço (R$)</Label><Input id="product-price" name="price" type="number" min="0" step="0.01" defaultValue={selectedProduct ? (selectedProduct.priceCents / 100).toFixed(2) : ''} required /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-description">Descrição</Label><Textarea id="product-description" name="description" rows={5} defaultValue={selectedProduct?.description ?? ''} placeholder="Descreva o conteúdo, formato, compatibilidade e condições de uso." required minLength={20} /></div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="product-file">{dialogMode === 'edit' ? 'Substituir arquivo — opcional' : 'Arquivo entregue'}</Label>
                  <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-5">
                    <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground"><FileUp className="size-5 text-primary" />{dialogMode === 'edit' ? 'Selecione somente quando desejar substituir todos os arquivos atuais.' : 'Selecione o arquivo final que será disponibilizado ao comprador.'}</div>
                    <Input id="product-file" name="file" type="file" required={dialogMode === 'create'} />
                    <p className="mt-2 text-xs text-muted-foreground">Tamanho máximo: 500 MB.</p>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>
                  {dialogMode === 'create' ? <PackagePlus className="size-4" /> : <Send className="size-4" />}
                  {saving ? 'Salvando...' : dialogMode === 'edit' ? 'Salvar alterações' : 'Criar como rascunho'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </ProducerLayout>
  );
};

export default ProducerProductsPage;