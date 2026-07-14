import { useMemo, useState } from "react";
import { Download as DownloadIcon, FileAudio, FileText, Loader2, Lock } from "lucide-react";
import StudentLayout from "@/app/layouts/StudentLayout";
import PageHeader from "@/shared/components/PageHeader";
import SearchInput from "@/shared/components/SearchInput";
import EmptyState from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import { useDownloads } from "@/modules/marketplace/hooks/useDownloads";
import { marketplaceService } from "@/modules/marketplace/services/marketplace.service";

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
  : "Sem prazo";

const DownloadsPage = () => {
  const { toast } = useToast();
  const { data: downloads, isLoading, error } = useDownloads();
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = downloads ?? [];
    if (!query) return list;
    return list.filter((item) => `${item.title} ${item.category} ${item.kind === "beat" ? item.licenseName : item.fileName}`.toLowerCase().includes(query));
  }, [downloads, search]);

  const downloadFile = async (item: NonNullable<typeof downloads>[number]) => {
    setDownloadingId(item.id);
    try {
      const url = item.kind === "beat"
        ? await marketplaceService.getBeatDownloadUrl(item.id)
        : await marketplaceService.getDigitalProductDownloadUrl(item.id);
      window.location.assign(url);
      toast({ title: "Download autorizado", description: `${item.title}: o link expira em 60 segundos.` });
    } catch (downloadError) {
      toast({
        variant: "destructive",
        title: "Download indisponivel",
        description: downloadError instanceof Error ? downloadError.message : "Tente novamente mais tarde.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadContract = async (purchaseId: string, contractNumber: string) => {
    setContractId(purchaseId);
    try {
      const blob = await marketplaceService.getBeatLicenseContract(purchaseId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${contractNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Contrato emitido", description: contractNumber });
    } catch (contractError) {
      toast({
        variant: "destructive",
        title: "Contrato indisponivel",
        description: contractError instanceof Error ? contractError.message : "Tente novamente mais tarde.",
      });
    } finally {
      setContractId(null);
    }
  };

  return (
    <StudentLayout>
      <PageHeader title="Downloads" subtitle="Arquivos protegidos dos beats e produtos digitais que voce comprou." />
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por beat, arquivo ou licenca..." className="mb-6 max-w-sm" />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando entregas...</div>
      ) : error ? (
        <EmptyState title="Nao foi possivel carregar seus downloads" description={error instanceof Error ? error.message : "Tente novamente mais tarde."} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Voce ainda nao possui downloads" description="As entregas aparecem aqui depois que o pagamento e confirmado pelo provedor." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                {item.kind === "beat" ? <FileAudio className="h-5 w-5 text-brand-medium" /> : <DownloadIcon className="h-5 w-5 text-brand-medium" />}
                <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{item.category}</span>
              </div>
              <div>
                <h2 className="font-medium">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.kind === "beat" ? item.licenseName : item.fileName}</p>
              </div>
              <dl className="space-y-1 text-xs text-muted-foreground">
                {item.kind === "beat" && <div className="flex justify-between gap-2"><dt>Contrato</dt><dd>{item.contractNumber}</dd></div>}
                <div className="flex justify-between gap-2"><dt>Compra</dt><dd>{formatDate(item.purchasedAt)}</dd></div>
                {item.kind === "beat" && <div className="flex justify-between gap-2"><dt>Disponivel ate</dt><dd>{formatDate(item.expiresAt)}</dd></div>}
                {item.kind === "beat" && <div className="flex justify-between gap-2"><dt>Downloads</dt><dd>{item.downloadCount}</dd></div>}
              </dl>
              {item.kind === "beat" && <Button
                size="sm"
                variant="outline"
                disabled={contractId === item.purchaseId}
                onClick={() => void downloadContract(item.purchaseId, item.contractNumber)}
              >
                {contractId === item.purchaseId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Baixar contrato PDF
              </Button>}
              <Button
                size="sm"
                className="mt-auto"
                disabled={(item.kind === "beat" && item.isExpired) || downloadingId === item.id}
                onClick={() => void downloadFile(item)}
              >
                {downloadingId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : item.kind === "beat" && item.isExpired ? <Lock className="mr-2 h-4 w-4" /> : <DownloadIcon className="mr-2 h-4 w-4" />}
                {item.kind === "beat" && item.isExpired ? "Prazo expirado" : "Baixar com seguranca"}
              </Button>
            </article>
          ))}
        </div>
      )}
    </StudentLayout>
  );
};

export default DownloadsPage;
