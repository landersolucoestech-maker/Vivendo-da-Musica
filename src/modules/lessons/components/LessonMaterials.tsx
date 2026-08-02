import { useState } from 'react';
import { Download, FileArchive, FileAudio, FileText } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import type { LessonMaterial } from '@/modules/lessons/types/lesson';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/use-toast';

interface LessonMaterialsProps {
  materials: LessonMaterial[];
}

const formatFileSize = (bytes: number | null) => {
  if (bytes === null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

const MaterialIcon = ({ type }: { type: string }) => {
  if (type === 'wav' || type === 'mp3' || type === 'audio_project') return <FileAudio className="size-5" />;
  if (type === 'archive') return <FileArchive className="size-5" />;
  return <FileText className="size-5" />;
};

const LessonMaterials = ({ materials }: LessonMaterialsProps) => {
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!materials.length) return null;

  const downloadMaterial = async (material: LessonMaterial) => {
    if (downloadingId) return;
    setDownloadingId(material.id);

    try {
      const target = /^https?:\/\//i.test(material.file_url)
        ? material.file_url
        : (await supabase.storage.from('lesson-materials').createSignedUrl(material.file_url, 300)).data?.signedUrl;

      if (!target) throw new Error('Não foi possível gerar o acesso temporário ao arquivo.');

      const anchor = document.createElement('a');
      anchor.href = target;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      anchor.download = material.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      toast({
        title: 'Não foi possível baixar o material',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="mt-6 vdm-surface p-5">
      <div>
        <p className="vdm-eyebrow">Materiais adicionais</p>
        <h2 className="mt-2 font-display text-xl font-bold text-white">Arquivos desta aula</h2>
        <p className="mt-1 text-sm text-muted-foreground">Os links são temporários e liberados somente para quem possui acesso ao curso.</p>
      </div>

      <div className="mt-4 space-y-3">
        {materials.map((material) => {
          const size = formatFileSize(material.size_bytes);
          return (
            <div key={material.id} className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 text-primary"><MaterialIcon type={material.material_type} /></span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{material.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {material.material_type}{size ? ` · ${size}` : ''}
                  </p>
                  {material.description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{material.description}</p>}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={downloadingId !== null}
                onClick={() => void downloadMaterial(material)}
              >
                <Download className="size-4" />
                {downloadingId === material.id ? 'Liberando...' : 'Baixar'}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default LessonMaterials;
