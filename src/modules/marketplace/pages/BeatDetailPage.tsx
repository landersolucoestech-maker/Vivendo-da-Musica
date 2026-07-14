import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Download, FileCheck2, Play, Receipt, ShieldCheck, ShoppingCart } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import BeatCard from "@/modules/marketplace/components/BeatCard";
import EmptyState from "@/shared/components/EmptyState";
import LoadingState from "@/shared/components/LoadingState";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { useCart } from "@/modules/checkout/store/CartContext";
import { useBeatDetail } from "@/modules/marketplace/hooks/useBeats";
import { marketplaceService } from "@/modules/marketplace/services/marketplace.service";
import { formatPrice } from "@/shared/utils/formatters";
import { ROUTES } from "@/shared/constants/routes";
import type { BeatLicense } from "@/modules/marketplace/types/product";

const BeatDetailPage = () => {
  const { beatSlug } = useParams();
  const { addItem } = useCart();
  const { data, isLoading } = useBeatDetail(beatSlug);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const viewedBeatIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const beatId = data?.beat.id;
    if (!beatId || viewedBeatIdRef.current === beatId) return;

    viewedBeatIdRef.current = beatId;
    void marketplaceService.recordBeatEvent(beatId, "view").catch(() => {
      viewedBeatIdRef.current = null;
    });
  }, [data?.beat.id]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [data?.beat.id]);

  const selectedLicense = useMemo<BeatLicense | undefined>(() => {
    if (!data?.beat) return undefined;
    return data.beat.licenses.find((license) => license.id === selectedLicenseId)
      ?? data.beat.licenses.find((license) => license.available);
  }, [data?.beat, selectedLicenseId]);

  const handlePreview = async () => {
    if (!data?.beat.audioPreviewUrl) return;

    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPreviewPlaying(false);
      return;
    }

    const audio = audioRef.current ?? new Audio(data.beat.audioPreviewUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPreviewPlaying(false);
    audio.onpause = () => setIsPreviewPlaying(false);

    try {
      await audio.play();
      setIsPreviewPlaying(true);
      void marketplaceService.recordBeatEvent(data.beat.id, "play").catch(() => undefined);
    } catch {
      setIsPreviewPlaying(false);
    }
  };

  if (isLoading) {
    return <PublicLayout><LoadingState rows={5} className="h-20 rounded-lg" /></PublicLayout>;
  }

  if (!data) {
    return (
      <PublicLayout>
        <EmptyState
          title="Beat nao encontrado"
          description="Esse beat pode ter sido vendido em exclusivo ou removido."
          action={<Link to={ROUTES.marketplaceBeats}><Button>Ver beats</Button></Link>}
        />
      </PublicLayout>
    );
  }

  const { beat, related } = data;

  return (
    <PublicLayout>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <main className="min-w-0">
          <div
            className="mb-5 flex aspect-video items-center justify-center rounded-lg"
            style={{ background: `linear-gradient(135deg, ${beat.gradientFrom}, ${beat.gradientTo})` }}
          >
            <Button
              size="lg"
              className="rounded-full"
              disabled={!beat.audioPreviewUrl}
              onClick={() => void handlePreview()}
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              {!beat.audioPreviewUrl
                ? "Preview indisponivel"
                : isPreviewPlaying
                  ? "Pausar preview"
                  : "Ouvir preview"}
            </Button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="secondary">{beat.genre}</Badge>
            <Badge variant="outline">{beat.bpm} BPM</Badge>
            <Badge variant="outline">Tom {beat.key}</Badge>
            <Badge variant="outline">{beat.mood}</Badge>
          </div>

          <h1 className="text-3xl font-bold">{beat.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Produzido por {beat.producerName}. Licenciamento automatizado com contrato, comprovante, entrega dos arquivos e rastreabilidade da transacao.
          </p>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Licencas disponiveis</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {beat.licenses.map((license) => {
                const isSelected = selectedLicense?.id === license.id;

                return (
                  <button
                    key={license.id}
                    type="button"
                    disabled={!license.available}
                    onClick={() => setSelectedLicenseId(license.id)}
                    className={`rounded-lg border bg-card p-4 text-left transition-colors ${
                      isSelected ? "border-brand-medium" : "border-border hover:border-brand-medium/60"
                    } ${!license.available ? "opacity-50" : ""}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{license.name}</p>
                        <p className="text-sm font-bold text-brand-medium">{formatPrice(license.priceCents, license.currency)}</p>
                      </div>
                      {license.isExclusive && <Badge>Exclusiva</Badge>}
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {license.usageRights.slice(0, 3).map((right) => (
                        <li key={right} className="flex gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          {right}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <ShieldCheck className="mb-2 h-5 w-5 text-emerald-500" />
              <p className="font-medium">Protecao autoral</p>
              <p className="mt-1 text-sm text-muted-foreground">Hash, timestamp e evidencia documental no ato da publicacao.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <Download className="mb-2 h-5 w-5 text-brand-medium" />
              <p className="font-medium">Entrega automatica</p>
              <p className="mt-1 text-sm text-muted-foreground">Arquivos liberados apos pagamento aprovado e licenca emitida.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <Receipt className="mb-2 h-5 w-5 text-brand-medium" />
              <p className="font-medium">Comprovantes</p>
              <p className="mt-1 text-sm text-muted-foreground">Historico, nota de transacao e contrato ficam vinculados ao comprador.</p>
            </div>
          </section>

          {related.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 text-lg font-semibold">Beats relacionados</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((item) => <BeatCard key={item.id} beat={item} />)}
              </div>
            </section>
          )}
        </main>

        <aside>
          <div className="sticky top-20 rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Licenca selecionada</p>
            <h2 className="mt-1 text-xl font-semibold">{selectedLicense?.name}</h2>
            <p className="mt-2 text-2xl font-bold text-brand-medium">
              {selectedLicense ? formatPrice(selectedLicense.priceCents, selectedLicense.currency) : "Indisponivel"}
            </p>

            <div className="mt-5 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Conversao</span>
                  <span>{beat.conversionRate}%</span>
                </div>
                <Progress value={beat.conversionRate * 10} className="h-2" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-muted p-2"><p className="font-semibold">{beat.views}</p><p className="text-muted-foreground">views</p></div>
                <div className="rounded-md bg-muted p-2"><p className="font-semibold">{beat.plays}</p><p className="text-muted-foreground">plays</p></div>
                <div className="rounded-md bg-muted p-2"><p className="font-semibold">{beat.sales}</p><p className="text-muted-foreground">vendas</p></div>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-border p-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <FileCheck2 className="h-4 w-4 text-emerald-500" />
                Registro autoral
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {beat.copyrightEvidenceId ?? "Registro em processamento automatico"}
              </p>
            </div>

            <Button
              className="mt-5 w-full"
              disabled={!selectedLicense?.available}
              onClick={() => selectedLicense && addItem({
                kind: "beat_license",
                id: selectedLicense.id,
                title: `${beat.title} - ${selectedLicense.name}`,
                priceCents: selectedLicense.priceCents,
                currency: selectedLicense.currency,
              })}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Adicionar licenca ao carrinho
            </Button>
          </div>
        </aside>
      </div>
    </PublicLayout>
  );
};

export default BeatDetailPage;
