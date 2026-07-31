import { FormEvent, useState } from 'react';
import { Music2 } from 'lucide-react';

import { beatService } from '@/modules/marketplace/services/beat.service';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';

const BeatPublishDialog = ({ onPublished }: { onPublished: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const previewFile = data.get('previewFile');
    const masterFile = data.get('masterFile');
    const stemsFile = data.get('stemsFile');
    if (!(previewFile instanceof File) || !previewFile.size || !(masterFile instanceof File) || !masterFile.size) return;

    setSubmitting(true);
    try {
      await beatService.createBeat({
        title: String(data.get('title')).trim(),
        genre: String(data.get('genre')).trim(),
        bpm: Number(data.get('bpm')),
        musicalKey: String(data.get('musicalKey')).trim(),
        mood: String(data.get('mood')).trim(),
        description: String(data.get('description') || '').trim(),
        previewFile,
        masterFile,
        ...(stemsFile instanceof File && stemsFile.size ? { stemsFile } : {}),
      });
      form.reset();
      setOpen(false);
      onPublished();
      toast({ title: 'Beat salvo', description: 'O beat foi criado como rascunho com licenças padrão.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Falha ao cadastrar beat', description: error instanceof Error ? error.message : 'Não foi possível concluir o cadastro.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Music2 className="size-4" />Novo beat</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Novo beat</DialogTitle><DialogDescription>Envie o preview público e os arquivos comerciais. O cadastro começa como rascunho.</DialogDescription></DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="beat-title">Título</Label><Input id="beat-title" name="title" required minLength={2} maxLength={180} /></div>
          <div className="space-y-2"><Label htmlFor="beat-genre">Gênero</Label><Input id="beat-genre" name="genre" required maxLength={60} /></div>
          <div className="space-y-2"><Label htmlFor="beat-bpm">BPM</Label><Input id="beat-bpm" name="bpm" type="number" required min={30} max={300} /></div>
          <div className="space-y-2"><Label htmlFor="beat-key">Tom</Label><Input id="beat-key" name="musicalKey" required maxLength={20} placeholder="F# menor" /></div>
          <div className="space-y-2"><Label htmlFor="beat-mood">Clima</Label><Input id="beat-mood" name="mood" required maxLength={60} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="beat-description">Descrição</Label><Textarea id="beat-description" name="description" maxLength={2000} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="beat-preview">Preview público — até 50 MB</Label><Input id="beat-preview" name="previewFile" type="file" accept="audio/mpeg,audio/wav,audio/x-wav" required /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="beat-master">Master privado — até 500 MB</Label><Input id="beat-master" name="masterFile" type="file" accept="audio/mpeg,audio/wav,audio/x-wav" required /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="beat-stems">Stems ZIP — opcional</Label><Input id="beat-stems" name="stemsFile" type="file" accept=".zip,application/zip,application/x-zip-compressed" /></div>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" disabled={submitting} onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting ? 'Enviando...' : 'Salvar rascunho'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BeatPublishDialog;
