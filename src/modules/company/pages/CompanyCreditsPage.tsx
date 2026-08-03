import { Coins, Clock3, ReceiptText } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';

import CompanyLayout from '@/app/layouts/CompanyLayout';
import { jobCreditCheckoutService } from '@/modules/company/services/jobCreditCheckout.service';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import LoadingState from '@/shared/components/LoadingState';
import PageHeader from '@/shared/components/PageHeader';
import StatCard from '@/shared/components/StatCard';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';
import { formatPrice } from '@/shared/utils/formatters';

const CompanyCreditsPage = () => {
  const { toast } = useToast();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['company-credit-checkout'],
    queryFn: () => jobCreditCheckoutService.getData(),
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ companyId, offerId }: { companyId: string; offerId: string }) =>
      jobCreditCheckoutService.checkout(companyId, offerId),
    onSuccess: (checkoutUrl) => window.location.assign(checkoutUrl),
    onError: (checkoutError) => toast({
      title: 'Compra não iniciada',
      description: checkoutError instanceof Error ? checkoutError.message : 'Tente novamente.',
      variant: 'destructive',
    }),
  });

  return (
    <CompanyLayout>
      <PageHeader title="Créditos de vagas" subtitle="Compre créditos avulsos para publicar ou renovar oportunidades." />

      {isLoading ? (
        <LoadingState rows={4} className="h-44 rounded-xl" />
      ) : isError ? (
        <ErrorState description={error.message} onRetry={() => void refetch()} />
      ) : data ? (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Créditos disponíveis" value={String(data.availableCredits)} icon={Coins} />
            <StatCard label="Créditos próximos do vencimento" value={String(data.expiringCredits)} icon={Clock3} />
            <StatCard label="Empresa" value={data.companyName} icon={ReceiptText} />
          </div>

          {!data.packs.length ? (
            <EmptyState
              icon={Coins}
              title="Nenhum pacote disponível"
              description="Os pacotes ativos configurados pelo administrador aparecerão aqui."
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {data.packs.map((pack) => (
                <Card key={pack.id}>
                  <CardContent className="flex h-full flex-col p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{pack.credits} créditos</p>
                    <h2 className="mt-3 font-display text-xl font-semibold text-white">{pack.name}</h2>
                    {pack.description && <p className="mt-3 text-sm leading-6 text-muted-foreground">{pack.description}</p>}
                    <div className="mt-5">
                      <p className="font-display text-3xl font-bold text-white">{formatPrice(pack.priceCents, pack.currency)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatPrice(Math.round(pack.priceCents / pack.credits), pack.currency)} por publicação · validade de {pack.validityDays} dias
                      </p>
                    </div>
                    <Button
                      className="mt-auto w-full pt-0"
                      disabled={!pack.offerId || checkoutMutation.isPending}
                      onClick={() => pack.offerId && checkoutMutation.mutate({ companyId: data.companyId, offerId: pack.offerId })}
                    >
                      {checkoutMutation.isPending ? 'Abrindo pagamento...' : 'Comprar créditos'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
            <p><strong className="text-white">Regra de consumo:</strong> uma publicação consome um crédito; renovar uma vaga expirada consome outro crédito.</p>
            <p className="mt-2">Editar ou excluir uma oportunidade não devolve automaticamente o crédito utilizado. Não existe renovação automática nem cobrança mensal.</p>
          </div>
        </>
      ) : null}
    </CompanyLayout>
  );
};

export default CompanyCreditsPage;
