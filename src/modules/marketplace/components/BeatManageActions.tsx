import { FormEvent, useState } from 'react';
import { Archive, Edit3, Eye, RotateCcw, Send } from 'lucide-react';

import { beatService } from '@/modules/marketplace/services/beat.service';
import type { Beat } from '@/modules/marketplace/types/product';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { formatPrice } from '@/shared/utils/formatters';

const BeatManageActions = ({ beat, onChanged }: { beat: Beat; onChanged: () => void }) => {
  const { toast } = useToast();
  const [viewing, setViewing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const changeStatus = async (status: Beat['status']) => {
    setBusy(true);
    try {
      await beatService.setBeatStatus(beat.id, status);
      onChanged();
      toast({ title: status === 'published' ? 'Beat publicado' : status === 'archived' ? 'Beat arquivado' : 'Beat restaurado como rascunho' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Falha ao alterar status', description: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await beatService.updateBeat(beat.id, {
        title: String(data.get('title')).trim(),
        genre: String(data.get('genre')).trim(),
        bpm: Number(data.get('bpm')),
        musicalKey: String(data.get('musicalKey')).trim(),
        mood: String(data.get('mood')).trim(),
      });
      setEditing(false);
      onChanged();
      toast({ title: 'Beat atualizado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Falha ao editar', description: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => setViewing(true)}>
        <Eye className="size-3.5" />
        Visualizar
      </Button>
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
        <Edit3 className="size-3.5" />
        Editar
      </Button>

      {beat.status === 'draft' && <Button size="sm" disabled={busy} onClick={() => void changeStatus('published')}><Send className="size-3.5" />Publicar</Button>}
      {beat.status === 'published' && <Button size="sm" variant="outline" disabled={busy} onClick={() => void changeStatus('archived')}><Archive className="size-3.5" />Arquivar</Button>}
      {beat.status === 'archived' && <Button size="sm" variant="outline" disabled={busy} onClick={() => void changeStatus('draft')}><RotateCcw className="size-3.5" />Restaurar</Button>}

      <Dialog open={viewing} onOpenChange={setViewing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Visualizar beat</DialogTitle>
            <DialogDescription>Dados comerciais, desempenho, proteção autoral e licenças vinculadas.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Título</p><p className="mt-1 font-semibold text-white">{beat.title}</p></div>
              <div><p className="text-xs text-muted-foreground">Gênero</p><p className="mt-1 text-white">{beat.genre}</p></div>
              <div><p className="text-xs text-muted-foreground">BPM e tom</p><p className="mt-1 text-white">{beat.bpm} BPM · {beat.key}</p></div>
              <div><p className="text-xs text-muted-foreground">Clima</p><p className="mt-1 text-white">{beat.mood}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={beat.status} label={beat.status === 'published' ? 'Publicado' : beat.status === 'archived' ? 'Arquivado' : 'Rascunho'} /></div></div>
              <div><p className="text-xs text-muted-foreground">Proteção autoral</p><p className="mt-1 text-white">{beat.copyrightStatus === 'registered' ? 'Registrada' : beat.copyrightStatus === 'failed' ? 'Falhou' : 'Pendente'}</p></div>
              <div><p className="text-xs text-muted-foreground">Visualizações</p><p className="mt-1 text-white">{beat.views.toLocaleString('pt-BR')}</p></div>
              <div><p className="text-xs text-muted-foreground">Reproduções</p><p className="mt-1 text-white">{beat.plays.toLocaleString('pt-BR')}</p></div>
              <div><p className="text-xs text-muted-foreground">Vendas e receita</p><p className="mt-1 text-white">{beat.sales} · {formatPrice(beat.revenueCents, 'BRL')}</p></div>
              <div><p className="text-xs text-muted-foreground">Conversão</p><p className="mt-1 text-white">{beat.conversionRate}%</p></div>
              <div><p className="text-xs text-muted-foreground">Exclusividade</p><p className="mt-1 text-white">{beat.exclusiveAvailable ? 'Disponível' : 'Vendida'}</p></div>
              <div><p className="text-xs text-muted-foreground">Publicado em</p><p className="mt-1 text-white">{beat.publishedAt ? new Date(beat.publishedAt).toLocaleString('pt-BR') : 'Ainda não publicado'}</p></div>
            </div>

            <section>
              <h3 className="text-sm font-semibold text-white">Licenças ({beat.licenses.length})</h3>
              <div className="mt-3 space-y-2">
                {beat.licenses.map((license) => (
                  <div key={license.id} className="flex flex-col gap-2 rounded-xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{license.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{license.type} · {license.deliverables.length} entregável(is) · {license.usageRights.length} direito(s)</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-primary">{formatPrice(license.priceCents, license.currency)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{license.available ? 'Disponível' : 'Indisponível'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="rounded-xl border border-white/10 p-4 text-xs text-muted-foreground">
              ID do beat: <span className="break-all font-mono text-white">{beat.id}</span>
              {beat.copyrightEvidenceId && <><br />Evidência autoral: <span className="break-all font-mono text-white">{beat.copyrightEvidenceId}</span></>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(false)}>Fechar</Button>
            <Button onClick={() => { setViewing(false); setEditing(true); }}><Edit3 className="size-4" />Editar beat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editing} onOpenChange={(open) => !busy && setEditing(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar beat</DialogTitle>
            <DialogDescription>Atualize os metadados principais. Licenças e contratos são gerenciados separadamente.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void saveEdit(event)}>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor={`title-${beat.id}`}>Título</Label><Input id={`title-${beat.id}`} name="title" defaultValue={beat.title} required maxLength={180} /></div>
            <div className="space-y-2"><Label htmlFor={`genre-${beat.id}`}>Gênero</Label><Input id={`genre-${beat.id}`} name="genre" defaultValue={beat.genre} required /></div>
            <div className="space-y-2"><Label htmlFor={`bpm-${beat.id}`}>BPM</Label><Input id={`bpm-${beat.id}`} name="bpm" type="number" min={30} max={300} defaultValue={beat.bpm} required /></div>
            <div className="space-y-2"><Label htmlFor={`key-${beat.id}`}>Tom</Label><Input id={`key-${beat.id}`} name="musicalKey" defaultValue={beat.key} required /></div>
            <div className="space-y-2"><Label htmlFor={`mood-${beat.id}`}>Clima</Label><Input id={`mood-${beat.id}`} name="mood" defaultValue={beat.mood} required /></div>
            <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar alterações'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BeatManageActions;
