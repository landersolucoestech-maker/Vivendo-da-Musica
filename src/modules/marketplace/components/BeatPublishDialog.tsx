import { FormEvent, useState } from "react";
import { Music2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";
import { marketplaceService } from "@/modules/marketplace/services/marketplace.service";

interface BeatPublishDialogProps {
  onPublished: () => void;
}

const BeatPublishDialog = ({ onPublished }: BeatPublishDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const previewFile = data.get("previewFile");
    const masterFile = data.get("masterFile");
    const stemsFile = data.get("stemsFile");
    if (!(previewFile instanceof File) || !previewFile.size || !(masterFile instanceof File) || !masterFile.size) return;

    setSubmitting(true);
    try {
      await marketplaceService.createBeat({
        title: String(data.get("title")),
        genre: String(data.get("genre")),
        bpm: Number(data.get("bpm")),
        musicalKey: String(data.get("musicalKey")),
        mood: String(data.get("mood")),
        description: String(data.get("description") || ""),
        previewFile,
        masterFile,
        ...(stemsFile instanceof File && stemsFile.size ? { stemsFile } : {}),
      });
      form.reset();
      setOpen(false);
      onPublished();
      toast({ title: "Beat salvo", description: "O beat foi enviado como rascunho com as licencas padrao." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Falha ao publicar beat",
        description: error instanceof Error ? error.message : "Nao foi possivel concluir o cadastro.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Music2 className="mr-2 h-4 w-4" />Publicar beat</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo beat</DialogTitle>
          <DialogDescription>Envie o preview e os arquivos comerciais. O cadastro inicia como rascunho.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="beat-title">Titulo</Label><Input id="beat-title" name="title" required maxLength={120} /></div>
          <div className="space-y-2"><Label htmlFor="beat-genre">Genero</Label><Input id="beat-genre" name="genre" required maxLength={60} /></div>
          <div className="space-y-2"><Label htmlFor="beat-bpm">BPM</Label><Input id="beat-bpm" name="bpm" type="number" required min={40} max={300} /></div>
          <div className="space-y-2"><Label htmlFor="beat-key">Tom</Label><Input id="beat-key" name="musicalKey" required maxLength={12} placeholder="F#m" /></div>
          <div className="space-y-2"><Label htmlFor="beat-mood">Mood</Label><Input id="beat-mood" name="mood" required maxLength={40} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="beat-description">Descricao</Label><Textarea id="beat-description" name="description" maxLength={2000} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="beat-preview">Preview publico (audio, ate 20 MB)</Label><Input id="beat-preview" name="previewFile" type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav" required /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="beat-master">Master privado (ate 200 MB)</Label><Input id="beat-master" name="masterFile" type="file" accept="audio/mpeg,audio/wav,audio/flac,.zip" required /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="beat-stems">Stems privados ZIP (opcional, ate 1 GB)</Label><Input id="beat-stems" name="stemsFile" type="file" accept=".zip,application/zip" /></div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Salvar rascunho"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BeatPublishDialog;
