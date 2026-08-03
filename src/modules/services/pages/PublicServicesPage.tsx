import { Link } from 'react-router-dom';
import { BriefcaseBusiness, CheckCircle2, Clock3, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import PublicLayout from '@/app/layouts/PublicLayout';
import { serviceMarketplaceService } from '@/modules/services/services/serviceMarketplace.service';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import LoadingState from '@/shared/components/LoadingState';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { formatPrice } from '@/shared/utils/formatters';

const PublicServicesPage = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['public-services'],
    queryFn: () => serviceMarketplaceService.listPublic(),
  });

  return (
    <PublicLayout>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 max-w-3xl">
          <p className="vdm-eyebrow">Marketplace profissional</p>
          <h1 className="vdm-page-title mt-3">Contrate profissionais da música</h1>
          <p className="vdm-page-description mt-4">
            Compare escopo, prazo, entregáveis e reputação. O pagamento fica registrado na plataforma e a liberação ao prestador ocorre após a entrega aceita.
          </p>
        </header>

        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <LoadingState rows={3} className="h-72 rounded-2xl" />
          </div>
        ) : isError ? (
          <ErrorState description={error.message} onRetry={() => void refetch()} />
        ) : !data?.length ? (
          <EmptyState
            icon={BriefcaseBusiness}
            title="Nenhum serviço publicado"
            description="Os serviços aprovados aparecerão aqui."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.map((listing) => {
              const startingPrice = listing.packages.length
                ? Math.min(...listing.packages.map((item) => item.priceCents))
                : 0;
              const shortestDelivery = listing.packages.length
                ? Math.min(...listing.packages.map((item) => item.deliveryDays))
                : 0;

              return (
                <Card key={listing.id} className="overflow-hidden">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {listing.category && <Badge variant="secondary">{listing.category.name}</Badge>}
                      {listing.provider?.verified && (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="size-3.5 text-emerald-400" /> Verificado
                        </Badge>
                      )}
                    </div>

                    <h2 className="mt-5 font-display text-xl font-semibold text-white">{listing.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {listing.provider?.displayName ?? 'Prestador da plataforma'}
                    </p>
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#d4d4d4]">
                      {listing.shortDescription ?? listing.description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Star className="size-3.5 text-amber-300" />
                        {listing.ratingCount ? `${listing.ratingAverage.toFixed(1)} (${listing.ratingCount})` : 'Novo prestador'}
                      </span>
                      {shortestDelivery > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-3.5 text-primary" /> A partir de {shortestDelivery} dias
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-4 border-t border-white/8 pt-5">
                      <div>
                        <p className="text-xs text-muted-foreground">A partir de</p>
                        <p className="font-display text-xl font-bold text-white">{formatPrice(startingPrice)}</p>
                      </div>
                      <Button asChild>
                        <Link to={`/servicos/${listing.slug}`}>Ver serviço</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </PublicLayout>
  );
};

export default PublicServicesPage;
