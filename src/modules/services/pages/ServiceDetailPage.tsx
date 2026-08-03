import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, RotateCcw, ShieldCheck, Star } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';

import PublicLayout from '@/app/layouts/PublicLayout';
import { canonicalCheckoutService } from '@/modules/checkout/services/canonicalCheckout.service';
import { serviceMarketplaceService } from '@/modules/services/services/serviceMarketplace.service';
import ErrorState from '@/shared/components/ErrorState';
import LoadingState from '@/shared/components/LoadingState';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';
import { formatPrice } from '@/shared/utils/formatters';

const ServiceDetailPage = () => {
  const { serviceSlug = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['service-detail', serviceSlug],
    queryFn: () => serviceMarketplaceService.getBySlug(serviceSlug),
    enabled: Boolean(serviceSlug),
  });

  const checkoutMutation = useMutation({
    mutationFn: async (offerId: string) => canonicalCheckoutService.createCheckout(
      [offerId],
      { serviceSlug },
      '/pagamento-sucesso',
      `/servicos/${serviceSlug}`,
    ),
    onSuccess: (checkoutUrl) => {
      window.location.assign(checkoutUrl);
    },
    onError: (checkoutError) => {
      toast({
        title: 'Contratação não iniciada',
        description: checkoutError instanceof Error ? checkoutError.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return <PublicLayout><main className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8"><LoadingState rows={4} className="h-52 rounded-2xl" /></main></PublicLayout>;
  }
  if (isError) {
    return <PublicLayout><main className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8"><ErrorState description={error.message} onRetry={() => void refetch()} /></main></PublicLayout>;
  }
  if (!data) {
    return (
      <PublicLayout>
        <main className="mx-auto flex min-h-[60vh] w-full max-w-[1440px] flex-col items-center justify-center px-4 text-center">
          <h1 className="font-display text-3xl font-bold text-white">Serviço não encontrado</h1>
          <Button className="mt-6" onClick={() => navigate('/servicos')}>Voltar ao catálogo</Button>
        </main>
      </PublicLayout>
    );
  }

  const selectedPackage = data.packages.find((item) => item.id === selectedPackageId) ?? data.packages[0] ?? null;

  return (
    <PublicLayout>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {data.category && <Badge variant="secondary">{data.category.name}</Badge>}
              {data.provider?.verified && (
                <Badge variant="outline" className="gap-1"><CheckCircle2 className="size-3.5 text-emerald-400" />Prestador verificado</Badge>
              )}
            </div>
            <h1 className="vdm-page-title mt-5">{data.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
              <span>{data.provider?.displayName ?? 'Prestador da plataforma'}</span>
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-4 text-amber-300" />
                {data.ratingCount ? `${data.ratingAverage.toFixed(1)} em ${data.ratingCount} avaliações` : 'Ainda sem avaliações'}
              </span>
              <span>{data.completedContracts} contratos concluídos</span>
            </div>

            <section className="mt-10 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-semibold text-white">Sobre o serviço</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#d4d4d4]">{data.description}</p>
            </section>

            {!!data.requirements.length && (
              <section className="mt-6 rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-xl font-semibold text-white">O que o prestador precisa receber</h2>
                <ul className="mt-4 space-y-3 text-sm text-[#d4d4d4]">
                  {data.requirements.map((requirement) => (
                    <li key={requirement} className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />{requirement}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-semibold text-white">Escolha o pacote</h2>
                <div className="mt-5 space-y-3">
                  {data.packages.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`w-full rounded-xl border p-4 text-left transition ${selectedPackage?.id === item.id ? 'border-primary bg-primary/8' : 'border-border bg-background/40 hover:border-primary/40'}`}
                      onClick={() => setSelectedPackageId(item.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{item.name}</p>
                          {item.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>}
                        </div>
                        <p className="shrink-0 font-display text-lg font-bold text-white">{formatPrice(item.priceCents, item.currency)}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedPackage ? (
                  <div className="mt-6">
                    <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-1">
                      <span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-primary" />Entrega em {selectedPackage.deliveryDays} dias</span>
                      <span className="inline-flex items-center gap-2"><RotateCcw className="size-4 text-primary" />{selectedPackage.revisions} revisões incluídas</span>
                    </div>
                    <ul className="mt-5 space-y-2 text-sm text-[#d4d4d4]">
                      {selectedPackage.deliverables.map((deliverable) => (
                        <li key={deliverable} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />{deliverable}</li>
                      ))}
                    </ul>
                    <Button
                      className="mt-6 w-full"
                      size="lg"
                      disabled={!selectedPackage.offerId || checkoutMutation.isPending}
                      onClick={() => selectedPackage.offerId && checkoutMutation.mutate(selectedPackage.offerId)}
                    >
                      {checkoutMutation.isPending ? 'Abrindo pagamento...' : 'Contratar serviço'}
                    </Button>
                    <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                      O valor é registrado na plataforma. A participação do prestador só fica disponível após o aceite da entrega.
                    </p>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-muted-foreground">Nenhum pacote disponível.</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </PublicLayout>
  );
};

export default ServiceDetailPage;
