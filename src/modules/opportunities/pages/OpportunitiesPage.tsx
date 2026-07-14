import { useMemo, useState } from "react";
import { Briefcase } from "lucide-react";
import StudentLayout from "@/app/layouts/StudentLayout";
import PageHeader from "@/shared/components/PageHeader";
import FilterBar from "@/shared/components/FilterBar";
import EmptyState from "@/shared/components/EmptyState";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import OpportunityCard from "@/modules/opportunities/components/OpportunityCard";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { useOpportunities } from "@/modules/opportunities/hooks/useOpportunities";
import { opportunitiesService } from "@/modules/opportunities/services/opportunities.service";
import type { Opportunity } from "@/modules/opportunities/types/opportunity.types";

const FILTERS = ['Todas', 'aberta', 'encerrada'];

const OpportunitiesPage = () => {
  const { toast } = useToast();
  const { data: opportunities, error, isError, isLoading, refetch } = useOpportunities();
  const [filter, setFilter] = useState('Todas');
  const [applying, setApplying] = useState<Opportunity | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const list = opportunities ?? [];
    if (filter === 'Todas') return list;
    return list.filter((o) => o.status === filter);
  }, [opportunities, filter]);

  const handleApply = async () => {
    if (!applying) return;
    setBusy(true);
    try { await opportunitiesService.applyToOpportunity(applying.id, coverLetter, portfolioUrl); await refetch(); toast({ title: "Candidatura enviada!", description: applying.title }); setApplying(null); setCoverLetter(""); setPortfolioUrl(""); }
    catch(error){ toast({title:"Candidatura nao enviada",description:error instanceof Error?error.message:"Tente novamente.",variant:"destructive"}); }
    finally{setBusy(false);}
  };

  const toggleFavorite = async (opportunity: Opportunity) => { try { await opportunitiesService.toggleFavorite(opportunity.id,opportunity.isFavorite); await refetch(); } catch(error){ toast({title:"Favorito nao atualizado",description:error instanceof Error?error.message:"Tente novamente.",variant:"destructive"}); } };

  return (
    <StudentLayout>
      <PageHeader title="Oportunidades" subtitle="Vagas e parcerias para alunos da plataforma." />

      <div className="mb-6">
        <FilterBar options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {isLoading ? (
        <LoadingState rows={3} className="h-40 rounded-xl" />
      ) : isError ? (
        <ErrorState description={error.message} onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nenhuma oportunidade encontrada" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              actionLabel="Candidatar-se"
              onAction={setApplying}
              onFavorite={(opportunity) => void toggleFavorite(opportunity)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!applying} onOpenChange={(open) => !open && setApplying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Candidatar-se</DialogTitle>
            <DialogDescription>
              Enviar sua candidatura para "{applying?.title}" em {applying?.company}?
            </DialogDescription>
          </DialogHeader>
          <Textarea value={coverLetter} onChange={(event)=>setCoverLetter(event.target.value)} maxLength={5000} placeholder="Apresente sua experiencia e interesse (minimo 20 caracteres)" />
          <Input value={portfolioUrl} onChange={(event)=>setPortfolioUrl(event.target.value)} placeholder="Link do portfolio (opcional)" />
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setApplying(null)}>Cancelar</Button>
            <Button disabled={busy || coverLetter.trim().length < 20} onClick={() => void handleApply()}>{busy?"Enviando...":"Enviar candidatura"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default OpportunitiesPage;
