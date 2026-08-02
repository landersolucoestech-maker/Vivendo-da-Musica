import { useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';

import AdminLayout from '@/app/layouts/AdminLayout';
import ProductManagementDialog from '@/modules/admin/components/ProductManagementDialog';
import { useProductCategories, useProducts } from '@/modules/marketplace/hooks/useProducts';
import DataTable from '@/shared/components/DataTable';
import FilterBar from '@/shared/components/FilterBar';
import PageHeader from '@/shared/components/PageHeader';
import SearchInput from '@/shared/components/SearchInput';
import StatCard from '@/shared/components/StatCard';
import { Button } from '@/shared/components/ui/button';
import { formatPrice } from '@/shared/utils/formatters';

const AdminProductsPage = () => {
  const { data: products } = useProducts();
  const { data: categories } = useProductCategories();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return (products ?? []).filter((product) => {
      const matchesCategory = category === 'Todos' || product.category === category;
      const matchesQuery = !search.trim() || product.title.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [products, search, category]);

  const openCreateDialog = () => {
    setSelectedProductId(null);
    setDialogOpen(true);
  };

  const openEditDialog = (productId: string) => {
    setSelectedProductId(productId);
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Produtos"
        subtitle="Catálogo do Marketplace."
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Novo produto
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total de produtos" value={String(products?.length ?? 0)} />
        <StatCard label="Em promoção" value={String(products?.filter((product) => product.originalPriceCents).length ?? 0)} />
        <StatCard label="Categorias" value={String(categories?.length ?? 0)} />
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar produtos..." className="flex-1" />
        <FilterBar options={['Todos', ...(categories ?? [])]} value={category} onChange={setCategory} />
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
            header: 'Ações',
            cell: (product) => (
              <Button size="sm" variant="outline" className="border-border" onClick={() => openEditDialog(product.id)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            ),
          },
        ]}
      />

      <ProductManagementDialog
        open={dialogOpen}
        productId={selectedProductId}
        onOpenChange={setDialogOpen}
      />
    </AdminLayout>
  );
};

export default AdminProductsPage;
