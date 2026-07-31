import { FormEvent, useState } from 'react';
import { Archive, FileUp, PackagePlus, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import ProducerLayout from '@/app/layouts/ProducerLayout';
import { useProducerProducts } from '@/modules/producer/hooks/useProducerProducts';
import { producerService } from '@/modules/producer/services/producer.service';
import type { SellerProductType } from '@/modules/producer/types/producer.types';
import DataTable from '@/shared/components/DataTable';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
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

const ProducerProductsPage = () => {
  const { data, isError } = useProducerProducts();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get('file');
    if (!(file instanceof File) || !file.size) {
      toast({ title: 'Arquivo obrigatório', description: 'Selecione o arquivo que será entregue ao comprador.', variant: 'destructive' });
      return;
    }

    const priceReais = Number(String(form.get('price')).replace(',', '.'));
    if (!Number.isFinite(priceReais) || priceReais < 0) {
      toast({ title: 'Preço inválido', description: 'Informe um valor monetário válido.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await producerService.createProduct({
        title: String(form.get('title')).trim(),
        slug: String(form.get('slug')).trim().toLowerCase(),
        description: String(form.get('description')).trim(),
        productType: String(form.get('productType')) as SellerProductType,
        priceCents: Math.round(priceReais * 100),
        file,
      });
      formElement.reset();
      await queryClient.invalidateQueries({ queryKey: ['producer-products'] });
      toast({ title: 'Produto criado', description: 'O produto foi salvo como rascunho para revisão.' });
    } catch (error) {
      toast({ title: 'Não foi possível criar o produto', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
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

  return (
    <ProducerLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Catálogo comercial</p>
        <h1 className="vdm-page-title mt-2">Produtos digitais</h1>
        <p className="vdm-page-description">Cadastre arquivos digitais, revise informações e controle a publicação no marketplace.</p>
      </header>

      <Card className="mb-8 border-white/12 bg-card/95">
        <CardHeader>
          <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary"><PackagePlus className="size-5" /></span>
          <CardTitle className="text-xl">Novo produto</CardTitle>
          <CardDescription>O produto será criado como rascunho e poderá ser publicado após a validação dos dados e do arquivo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-title">Título</Label>
              <Input id="product-title" name="title" placeholder="Ex.: Pack de drums para trap" required minLength={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-slug">Slug</Label>
              <Input id="product-slug" name="slug" placeholder="pack-drums-trap" required pattern="[a-z0-9-]+" />
              <p className="text-xs text-muted-foreground">Use apenas letras minúsculas, números e hífens.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-type">Tipo</Label>
              <select id="product-type" name="productType" className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                {productTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-price">Preço (R$)</Label>
              <Input id="product-price" name="price" type="number" min="0" step="0.01" placeholder="49,90" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="product-description">Descrição</Label>
              <Textarea id="product-description" name="description" rows={5} placeholder="Descreva o conteúdo, formato, compatibilidade e condições de uso." required minLength={20} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="product-file">Arquivo entregue</Label>
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-5">
                <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
                  <FileUp className="size-5 text-primary" />
                  Selecione o arquivo final que será disponibilizado ao comprador.
                </div>
                <Input id="product-file" name="file" type="file" required />
                <p className="mt-2 text-xs text-muted-foreground">Tamanho máximo atual: 500 MB.</p>
              </div>
            </div>
            <Button size="lg" className="md:col-span-2" disabled={saving}>
              <Send className="size-4" />
              {saving ? 'Enviando arquivo...' : 'Criar produto como rascunho'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section>
        <div className="mb-4">
          <p className="vdm-eyebrow">Gerenciamento</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-white">Produtos cadastrados</h2>
        </div>

        {isError && <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-red-300">Não foi possível carregar os produtos.</p>}

        <DataTable
          rows={data ?? []}
          rowKey={(item) => item.id}
          emptyLabel="Nenhum produto cadastrado."
          columns={[
            { header: 'Produto', cell: (item) => <span className="font-semibold text-white">{item.title}</span> },
            { header: 'Tipo', cell: (item) => productTypes.find((type) => type.value === item.productType)?.label ?? item.productType },
            { header: 'Preço', cell: (item) => formatPrice(item.priceCents, item.currency) },
            { header: 'Arquivos', cell: (item) => String(item.fileCount) },
            { header: 'Status', cell: (item) => <StatusBadge status={item.status} label={item.status === 'published' ? 'Publicado' : item.status === 'archived' ? 'Arquivado' : 'Rascunho'} /> },
            {
              header: '',
              cell: (item) => item.status !== 'published' ? (
                <Button size="sm" disabled={changing === item.id} onClick={() => void changeStatus(item.id, 'published')}>Publicar</Button>
              ) : (
                <Button size="sm" variant="outline" disabled={changing === item.id} onClick={() => void changeStatus(item.id, 'archived')}>
                  <Archive className="size-4" /> Arquivar
                </Button>
              ),
            },
          ]}
        />
      </section>
    </ProducerLayout>
  );
};

export default ProducerProductsPage;
