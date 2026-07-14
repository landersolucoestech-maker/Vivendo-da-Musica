import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil } from "lucide-react";
import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import DataTable from "@/shared/components/DataTable";
import SearchInput from "@/shared/components/SearchInput";
import FilterBar from "@/shared/components/FilterBar";
import { Button } from "@/shared/components/ui/button";
import { useProducts, useProductCategories } from "@/modules/marketplace/hooks/useProducts";
import { ROUTES } from "@/shared/constants/routes";
import { formatPrice } from "@/shared/utils/formatters";

const AdminProductsPage = () => {
  const { data: products } = useProducts();
  const { data: categories } = useProductCategories();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');

  const filtered = useMemo(() => {
    return (products ?? []).filter((product) => {
      const matchesCategory = category === 'Todos' || product.category === category;
      const matchesQuery = !search.trim() || product.title.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [products, search, category]);

  return (
    <AdminLayout>
      <PageHeader
        title="Produtos"
        subtitle="Catálogo do Marketplace."
        actions={
          <Link to={ROUTES.adminProductNew}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo produto
            </Button>
          </Link>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de produtos" value={String(products?.length ?? 0)} />
        <StatCard label="Em promoção" value={String(products?.filter((p) => p.originalPriceCents).length ?? 0)} />
        <StatCard label="Categorias" value={String(categories?.length ?? 0)} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
            header: '',
            cell: (product) => (
              <Link to={ROUTES.adminProductEdit(product.id)}>
                <Button size="sm" variant="outline" className="border-border">
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </Link>
            ),
          },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminProductsPage;
