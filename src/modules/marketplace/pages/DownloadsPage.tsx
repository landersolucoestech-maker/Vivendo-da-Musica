import { useMemo, useState } from 'react';
import { Download as DownloadIcon, FileAudio, FileText, Loader2, Lock, PackageOpen, Search } from 'lucide-react';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useDownloads } from '@/modules/marketplace/hooks/useDownloads';
import { downloadsService } from '@/modules/marketplace/services/downloads.service';
import EmptyState from '@/shared/components/EmptyState';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useToast } from '@/shared/hooks/use-toast';

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : 'Sem prazo';

const DownloadsPage = () => {
  const { toast } = useToast();
  const { data: downloads, isLoading, error, refetch } = useDownloads();
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = downloads ?? [];
    if (!query) return list;
    return list.filter((item) => `${item.title} ${item.category} ${item.kind === 'beat' ? item.licenseName : item.fileName}`.toLowerCase().includes(query));
  }, [downloads, search]);

  const downloadFile = async (item: NonNullable<typeof downloads>[number]) => {
    setDownloadingId(item.id);
    try {
      const url = await downloadsService.getDownloadUrl(item.kind === 'beat' ? 'beat' : 'product', item.id);
      window.location.assign(url);
      await refetch();
      toast({ title: 'Download autorizado', description: `${item.title}: o link temporário foi emitido por cinco minutos.` });
    } catch (downloadError) {
      toast({
        variant: 'destructive',
        title: 'Download indisponível',
        description: downloadError instanceof Error ? downloadError.message : 'Tente novamente mais tarde.',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadContract = async (deliveryId: string, contractNumber: string) => {
    setContractId(deliveryId);
    try {
      const blob = await downloadsService.getBeatLicenseContract(deliveryId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${contractNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Contrato emitido', description: contractNumber });
    } catch (contractError) {
      toast({
        variant: 'destructive',
        title: 'Contrato indisponível',
        description: contractError instanceof Error ? contractError.message : 'Tente novamente mais tarde.',
      });
    } finally {
      setContractId(null);
    }
  };

  return (
    <StudentLayout>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="vdm-eyebrow">Entregas digitais</p>
          <h1 className="vdm-page-title mt-2">Downloads</h1>
          <p className="vdm-page-description">Acesse arquivos protegidos, contratos e materiais vinculados às suas compras.</p>
        </div>
        <div className="vdm-surface flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
          <PackageOpen className="size-4 text-primary" />
          {downloads?.length ?? 0} entregas disponíveis
        </div>
      </header>

      <div className="relative mb-7 max-w-lg">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por beat, arquivo ou licença..." className="pl-9" />
      </div>

      {isLoading ? (
        <div className="vdm-surface flex items-center justify-center gap-3 py-14 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" />
          Carregando suas entregas...
        </div>
      ) : error ? (
        <EmptyState title="Não foi possível carregar seus downloads" description={error instanceof Error ? error.message : 'Tente novamente mais tarde.'} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhum download encontrado" description="As entregas aparecem aqui depois que o pagamento e o direito de acesso são confirmados." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="vdm-surface-interactive flex min-h-[340px] flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="vdm-icon-button border-primary/25 bg-primary/10 text-primary">
                  {item.kind === 'beat' ? <FileAudio className="size-5" /> : <DownloadIcon className="size-5" />}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {item.category}
                </span>
              </div>

              <div className="mt-6">
                <h2 className="font-display text-lg font-semibold leading-snug text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.kind === 'beat' ? item.licenseName : item.fileName}</p>
              </div>

              <dl className="mt-5 space-y-3 rounded-xl border border-white/8 bg-white/[0.02] p-4 text-xs text-muted-foreground">
                {item.kind === 'beat' && <div className="flex justify-between gap-3"><dt>Contrato</dt><dd className="text-right text-white">{item.contractNumber}</dd></div>}
                <div className="flex justify-between gap-3"><dt>Compra</dt><dd className="text-right text-white">{formatDate(item.purchasedAt)}</dd></div>
                {item.kind === 'beat' && <div className="flex justify-between gap-3"><dt>Disponível até</dt><dd className="text-right text-white">{formatDate(item.expiresAt)}</dd></div>}
                {item.kind === 'beat' && <div className="flex justify-between gap-3"><dt>Downloads realizados</dt><dd className="text-right text-white">{item.downloadCount}</dd></div>}
              </dl>

              <div className="mt-auto space-y-3 pt-6">
                {item.kind === 'beat' && (
                  <Button size="sm" variant="outline" className="w-full" disabled={contractId === item.id} onClick={() => void downloadContract(item.id, item.contractNumber)}>
                    {contractId === item.id ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                    Baixar contrato
                  </Button>
                )}
                <Button size="sm" className="w-full" disabled={(item.kind === 'beat' && item.isExpired) || downloadingId === item.id} onClick={() => void downloadFile(item)}>
                  {downloadingId === item.id ? <Loader2 className="size-4 animate-spin" /> : item.kind === 'beat' && item.isExpired ? <Lock className="size-4" /> : <DownloadIcon className="size-4" />}
                  {item.kind === 'beat' && item.isExpired ? 'Prazo expirado' : 'Baixar arquivo'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </StudentLayout>
  );
};

export default DownloadsPage;
