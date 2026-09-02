import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus } from 'lucide-react';

import AdminLayout from '@/app/layouts/AdminLayout';
import ProductManagementDialog, { type ProductManagementMode } from '@/modules/admin/components/ProductManagementDialog';
import { useManagedProducts, useProductCategories } from '@/modules/marketplace/hooks/useProducts';
import DataTable from '@/shared/components/DataTable';
import FilterBar from '@/shared/components/FilterBar';
import LoadingState from '@/shared/components/LoadingState';
import PageHeader from '@/shared/components/PageHeader';
import SearchInput from '@/shared/components/SearchInput';
import StatCard from '@/shared/components/StatCard';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import { formatPrice } from '@/shared/utils/formatters';

const AdminProductsPage = () => {
  const productsQuery = useManagedProducts();
  const categoriesQuery = useProductCategories();
  const products = productsQuery.data;
  const categories = categoriesQuery.data;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<ProductManagementMode>('create');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const isLoading = productsQuery.isLoading || categoriesQuery.isLoading;
  const hasError = productsQuery.isError || categoriesQuery.isError;

  const filtered = useMemo(() => {
    return (products ?? []).filter((product) => {
      const matchesCategory = category === 'Todos' || product.category === category;
      const matchesQuery = !search.trim() || product.title.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [products, search, category]);

  const openDialog = (mode: ProductManagementMode, productId: string | null = null) => {
    setDialogMode(mode);
    setSelectedProductId(productId);
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Produtos"
        subtitle="Crie, visualize e edite o catálogo do Marketplace somente em popups centralizados."
        actions={
          <Button onClick={() => openDialog('create')} disabled={isLoading || hasError}>
            <Plus className="mr-2 h-4 w-4" />
            Novo produto
          </Button>
        }
      />

      {isLoading && <LoadingState rows={6} />}
      {hasError && (
        <p className="mb-4 text-sm text-destructive">
          Não foi possível carregar o catálogo administrativo. Verifique sua sessão e tente novamente.
        </p>
      )}

      {products && categories && !isLoading && !hasError && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Total de produtos" value={String(products.length)} />
            <StatCard label="Publicados" value={String(products.filter((product) => product.status === 'published').length)} />
            <StatCard label="Categorias" value={String(categories.length)} />
          </div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar produtos..." className="flex-1" />
            <FilterBar options={['Todos', ...categories]} value={category} onChange={setCategory} />
          </div>

          <DataTable
            rows={filtered}
            rowKey={(product) => product.id}
            emptyLabel="Nenhum produto encontrado."
            columns={[
              { header: 'Produto', cell: (product) => product.title },
              { header: 'Categoria', cell: (product) => product.category },
              { header: 'Preço', cell: (product) => formatPrice(product.priceCents) },
              {
                header: 'Status',
                cell: (product) => (
                  <StatusBadge
                    status={product.status}
                    label={product.status === 'published' ? 'Publicado' : product.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                  />
                ),
              },
              {
                header: 'Ações',
                cell: (product) => (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="border-border" onClick={() => openDialog('view', product.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Button>
                    <Button size="sm" variant="outline" className="border-border" onClick={() => openDialog('edit', product.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}

      <ProductManagementDialog
        open={dialogOpen}
        mode={dialogMode}
        productId={selectedProductId}
        onModeChange={setDialogMode}
        onOpenChange={setDialogOpen}
      />
    </AdminLayout>
  );
};

export default AdminProductsPage;
