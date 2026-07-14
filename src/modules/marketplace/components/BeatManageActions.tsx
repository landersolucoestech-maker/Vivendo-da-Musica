import { FormEvent, useState } from "react";
import { Archive, Edit3, RotateCcw, Send } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { marketplaceService } from "@/modules/marketplace/services/marketplace.service";
import type { Beat } from "@/modules/marketplace/types/product";

const BeatManageActions = ({ beat, onChanged }: { beat: Beat; onChanged: () => void }) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const changeStatus = async (status: Beat["status"]) => {
    setBusy(true);
    try {
      await marketplaceService.setBeatStatus(beat.id, status);
      onChanged();
      toast({ title: status === "published" ? "Beat publicado" : status === "archived" ? "Beat arquivado" : "Beat restaurado como rascunho" });
    } catch (error) {
      toast({ variant: "destructive", title: "Falha ao alterar status", description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      await marketplaceService.updateBeat(beat.id, {
        title: String(data.get("title")),
        genre: String(data.get("genre")),
        bpm: Number(data.get("bpm")),
        musicalKey: String(data.get("musicalKey")),
        mood: String(data.get("mood")),
      });
      setEditing(false);
      onChanged();
      toast({ title: "Beat atualizado" });
    } catch (error) {
      toast({ variant: "destructive", title: "Falha ao editar", description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogTrigger asChild><Button size="sm" variant="outline"><Edit3 className="mr-1 h-3.5 w-3.5" />Editar</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar beat</DialogTitle></DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void saveEdit(event)}>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor={`title-${beat.id}`}>Titulo</Label><Input id={`title-${beat.id}`} name="title" defaultValue={beat.title} required maxLength={120} /></div>
            <div className="space-y-2"><Label htmlFor={`genre-${beat.id}`}>Genero</Label><Input id={`genre-${beat.id}`} name="genre" defaultValue={beat.genre} required /></div>
            <div className="space-y-2"><Label htmlFor={`bpm-${beat.id}`}>BPM</Label><Input id={`bpm-${beat.id}`} name="bpm" type="number" min={40} max={300} defaultValue={beat.bpm} required /></div>
            <div className="space-y-2"><Label htmlFor={`key-${beat.id}`}>Tom</Label><Input id={`key-${beat.id}`} name="musicalKey" defaultValue={beat.key} required /></div>
            <div className="space-y-2"><Label htmlFor={`mood-${beat.id}`}>Mood</Label><Input id={`mood-${beat.id}`} name="mood" defaultValue={beat.mood} required /></div>
            <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      {beat.status === "draft" && <Button size="sm" disabled={busy} onClick={() => void changeStatus("published")}><Send className="mr-1 h-3.5 w-3.5" />Publicar</Button>}
      {beat.status === "published" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void changeStatus("archived")}><Archive className="mr-1 h-3.5 w-3.5" />Arquivar</Button>}
      {beat.status === "archived" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void changeStatus("draft")}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restaurar</Button>}
    </div>
  );
};

export default BeatManageActions;
