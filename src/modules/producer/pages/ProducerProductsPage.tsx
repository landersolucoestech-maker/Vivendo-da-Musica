import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ProducerLayout from "@/app/layouts/ProducerLayout";
import { useProducerProducts } from "@/modules/producer/hooks/useProducerProducts";
import { producerService } from "@/modules/producer/services/producer.service";
import type { SellerProductType } from "@/modules/producer/types/producer.types";
import DataTable from "@/shared/components/DataTable";
import PageHeader from "@/shared/components/PageHeader";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";
import { formatPrice } from "@/shared/utils/formatters";

const productTypes: { value: SellerProductType; label: string }[] = [
  { value: 'preset', label: 'Preset' }, { value: 'drum_kit', label: 'Drum Kit' }, { value: 'midi', label: 'MIDI' }, { value: 'plugin', label: 'Plugin' }, { value: 'template', label: 'Template' }, { value: 'project', label: 'Projeto' }, { value: 'ebook', label: 'E-book' }, { value: 'other', label: 'Outro' },
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
    if (!(file instanceof File) || !file.size) return;
    setSaving(true);
    try {
      await producerService.createProduct({ title: String(form.get('title')).trim(), slug: String(form.get('slug')).trim().toLowerCase(), description: String(form.get('description')).trim(), productType: String(form.get('productType')) as SellerProductType, priceCents: Math.max(0, Number(form.get('priceCents')) || 0), file });
      formElement.reset();
      await queryClient.invalidateQueries({ queryKey: ['producer-products'] });
      toast({ title: 'Produto criado como rascunho' });
    } catch (error) { toast({ title: 'Não foi possível criar', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }); } finally { setSaving(false); }
  };

  const changeStatus = async (id: string, status: 'published' | 'archived') => {
    setChanging(id);
    try { await producerService.setProductStatus(id, status); await queryClient.invalidateQueries({ queryKey: ['producer-products'] }); toast({ title: status === 'published' ? 'Produto publicado' : 'Produto arquivado' }); }
    catch (error) { toast({ title: 'Não foi possível alterar', description: error instanceof Error ? error.message : 'Revise o produto.', variant: 'destructive' }); }
    finally { setChanging(null); }
  };

  return <ProducerLayout>
    <PageHeader title="Produtos digitais" subtitle="Cadastre presets, kits, MIDI, plugins, templates, projetos e e-books." />
    <Card className="mb-6"><CardHeader><CardTitle className="text-lg">Novo produto</CardTitle></CardHeader><CardContent><form onSubmit={create} className="grid gap-4 md:grid-cols-2">
      <div><Label htmlFor="product-title">Título</Label><Input id="product-title" name="title" required minLength={3} /></div>
      <div><Label htmlFor="product-slug">Slug</Label><Input id="product-slug" name="slug" required pattern="[a-z0-9-]+" /></div>
      <div><Label htmlFor="product-type">Tipo</Label><select id="product-type" name="productType" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{productTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
      <div><Label htmlFor="product-price">Preço em centavos</Label><Input id="product-price" name="priceCents" type="number" min="0" required /></div>
      <div className="md:col-span-2"><Label htmlFor="product-description">Descrição</Label><Textarea id="product-description" name="description" required minLength={20} /></div>
      <div className="md:col-span-2"><Label htmlFor="product-file">Arquivo entregue (até 500 MB)</Label><Input id="product-file" name="file" type="file" required /></div>
      <Button className="md:col-span-2" disabled={saving}>{saving ? 'Enviando...' : 'Criar produto'}</Button>
    </form></CardContent></Card>
    {isError && <p className="mb-4 text-sm text-destructive">Não foi possível carregar os produtos.</p>}
    <DataTable rows={data ?? []} rowKey={(item) => item.id} emptyLabel="Nenhum produto cadastrado." columns={[
      { header: 'Produto', cell: (item) => item.title }, { header: 'Tipo', cell: (item) => item.productType }, { header: 'Preço', cell: (item) => formatPrice(item.priceCents, item.currency) }, { header: 'Arquivos', cell: (item) => String(item.fileCount) }, { header: 'Status', cell: (item) => <StatusBadge status={item.status} label={item.status === 'published' ? 'Publicado' : item.status === 'archived' ? 'Arquivado' : 'Rascunho'} /> },
      { header: '', cell: (item) => item.status !== 'published' ? <Button size="sm" disabled={changing === item.id} onClick={() => changeStatus(item.id, 'published')}>Publicar</Button> : <Button size="sm" variant="outline" disabled={changing === item.id} onClick={() => changeStatus(item.id, 'archived')}>Arquivar</Button> },
    ]} />
  </ProducerLayout>;
};

export default ProducerProductsPage;
