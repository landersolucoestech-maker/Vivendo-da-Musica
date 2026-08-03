import { Clock3, Download, FileArchive, FileAudio, FileText, FolderOpen, Loader2 } from 'lucide-react';

import { downloadLessonMaterial, useLessonFiles, type LessonMaterial } from '@/modules/lessons/hooks/useLessonFiles';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';

interface Lesson {
  id: string;
  title: string;
  duration?: string;
  completed: boolean;
  video_url?: string;
  videoUrl?: string;
  description: string;
}

interface VideoPlayerProps {
  lesson: Lesson;
}

const MATERIAL_LABELS: Record<string, string> = {
  pdf: 'PDF',
  wav: 'Áudio WAV',
  audio: 'Áudio',
  audio_project: 'Projeto de áudio',
  archive: 'Arquivo compactado',
  document: 'Documento',
  other: 'Material',
};

const MaterialIcon = ({ material }: { material: LessonMaterial }) => {
  if (material.material_type === 'pdf' || material.mime_type === 'application/pdf') return <FileText className="size-5" />;
  if (material.material_type === 'wav' || material.mime_type?.startsWith('audio/')) return <FileAudio className="size-5" />;
  if (material.material_type === 'audio_project' || material.mime_type?.includes('zip')) return <FileArchive className="size-5" />;
  return <FolderOpen className="size-5" />;
};

const formatFileSize = (sizeBytes: number | null) => {
  if (!sizeBytes) return 'Tamanho não informado';
  if (sizeBytes >= 1024 ** 3) return `${(sizeBytes / 1024 ** 3).toFixed(1)} GB`;
  if (sizeBytes >= 1024 ** 2) return `${(sizeBytes / 1024 ** 2).toFixed(1)} MB`;
  if (sizeBytes >= 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${sizeBytes} bytes`;
};

const getYouTubeVideoId = (url: string) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match?.[1] ?? null;
};

const getVimeoVideoId = (url: string) => {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] ?? null;
};

const resolveEmbedUrl = (videoUrl: string) => {
  const youtubeId = getYouTubeVideoId(videoUrl);
  if (youtubeId) return `https://www.youtube-nocookie.com/embed/${youtubeId}`;

  const vimeoId = getVimeoVideoId(videoUrl);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;

  return null;
};

const VideoPlayer = ({ lesson }: VideoPlayerProps) => {
  const { toast } = useToast();
  const { data: materials = [], isLoading: materialsLoading, isError: materialsError } = useLessonFiles(lesson.id);
  const videoUrl = lesson.video_url || lesson.videoUrl || '';
  const embedUrl = resolveEmbedUrl(videoUrl);

  const handleDownload = (material: LessonMaterial) => {
    try {
      downloadLessonMaterial(material);
      toast({ title: 'Download iniciado', description: material.name });
    } catch (error) {
      toast({
        title: 'Material indisponível',
        description: error instanceof Error ? error.message : 'Não foi possível iniciar o download.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <div className="aspect-video bg-black">
        {embedUrl ? (
          <iframe
            className="size-full"
            src={embedUrl}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : videoUrl ? (
          <video className="size-full" src={videoUrl} controls preload="metadata">
            Seu navegador não suporta a reprodução deste vídeo.
          </video>
        ) : (
          <div className="flex size-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Nenhum vídeo foi configurado para esta aula.
          </div>
        )}
      </div>

      <div className="border-t border-white/8 bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-white">{lesson.title}</h2>
            {lesson.description && <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{lesson.description}</p>}
          </div>
          {lesson.duration && (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground">
              <Clock3 className="size-3.5 text-primary" />
              {lesson.duration}
            </span>
          )}
        </div>
      </div>

      <section className="border-t border-white/8 bg-[#0b0b0b] p-5 sm:p-6">
        <div className="mb-4">
          <p className="vdm-eyebrow">Arquivos complementares</p>
          <h3 className="mt-1 font-display text-lg font-semibold text-white">Materiais da aula</h3>
        </div>

        {materialsLoading ? (
          <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Carregando materiais...
          </div>
        ) : materialsError ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/8 p-4 text-sm text-red-300">
            Não foi possível carregar os materiais desta aula.
          </div>
        ) : materials.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5 text-sm text-muted-foreground">
            Nenhum material adicional foi publicado para esta aula.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {materials.map((material) => {
              const isSynthetic = (() => {
                try {
                  return new URL(material.file_url).hostname.endsWith('.test');
                } catch {
                  return true;
                }
              })();

              return (
                <Card key={material.id} className="border-white/8 bg-white/[0.02]">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <span className="vdm-icon-button border-primary/25 bg-primary/10 text-primary">
                        <MaterialIcon material={material} />
                      </span>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        {MATERIAL_LABELS[material.material_type] ?? material.material_type}
                      </span>
                    </div>
                    <CardTitle className="pt-4 text-base">{material.name}</CardTitle>
                    <CardDescription>{material.description || formatFileSize(material.size_bytes)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(material.size_bytes)}</span>
                      {material.mime_type && <span className="truncate pl-3">{material.mime_type}</span>}
                    </div>
                    <Button variant="outline" className="w-full" disabled={isSynthetic} onClick={() => handleDownload(material)}>
                      <Download className="size-4" />
                      {isSynthetic ? 'Arquivo de demonstração' : 'Baixar material'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default VideoPlayer;
