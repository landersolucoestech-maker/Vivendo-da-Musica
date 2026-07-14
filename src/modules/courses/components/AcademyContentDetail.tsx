import { Download, FileText, Video } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { AcademyContent } from "@/modules/courses/types/academyContent.types";
import { getAcademyVideoFallbackLabel } from "@/modules/courses/utils/academyContentDisplay";
import { formatFileSize } from "@/modules/courses/utils/academyContentUpload";

const AcademyContentDetail = ({ content }: { content: AcademyContent }) => {
  const heroImage = content.bannerUrl || content.thumbnailUrl;
  const videoFallback = getAcademyVideoFallbackLabel(content);

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-10">
      <main>
        <div className="aspect-[5/2] rounded-lg bg-gradient-brand overflow-hidden flex items-center justify-center mb-6">
          {heroImage ? (
            <img src={heroImage} alt={content.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-xl text-center px-6">{content.category || 'Academia'}</span>
          )}
        </div>

        <p className="text-sm text-brand-medium font-medium mb-2">{content.category || 'Conteudo educacional'}</p>
        <h1 className="text-3xl font-bold mb-3">{content.title}</h1>
        {content.subtitle && <p className="text-lg text-muted-foreground mb-3">{content.subtitle}</p>}
        {content.description && <p className="text-muted-foreground mb-8">{content.description}</p>}

        <section className="mb-8" aria-labelledby="academy-video-title">
          <h2 id="academy-video-title" className="text-lg font-semibold mb-4">Aula em video</h2>
          <div className="aspect-video rounded-lg border border-border bg-card overflow-hidden">
            {content.videoUrl ? (
              <video controls preload="metadata" poster={content.thumbnailUrl || undefined} className="w-full h-full bg-black">
                <source src={content.videoUrl} type={content.videoMimeType || undefined} />
                Seu navegador nao suporta a reproducao deste video.
              </video>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <Video className="w-8 h-8 mb-3" />
                <p>{videoFallback}</p>
              </div>
            )}
          </div>
        </section>

        <section className="prose prose-invert max-w-none mb-8" aria-labelledby="academy-body-title">
          <h2 id="academy-body-title">Conteudo escrito</h2>
          {content.body ? (
            <p className="whitespace-pre-line">{content.body}</p>
          ) : (
            <p className="text-muted-foreground">O texto deste conteudo ainda nao foi publicado.</p>
          )}
        </section>
      </main>

      <aside>
        <div className="rounded-lg border border-border bg-card p-5 sticky top-20 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Informacoes</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Status: publicado</p>
              {content.publishedAt && <p>Publicado em {new Date(content.publishedAt).toLocaleDateString('pt-BR')}</p>}
              {!!content.tags?.length && <p>Tags: {content.tags.join(', ')}</p>}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Materiais para download</h2>
            {!content.attachments?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum material anexado.</p>
            ) : (
              <div className="space-y-3">
                {content.attachments.map((attachment) => (
                  <div key={attachment.id} className="rounded-md border border-border p-3">
                    <div className="flex items-start gap-2 mb-3">
                      <FileText className="w-4 h-4 text-brand-medium mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.name}</p>
                        <p className="text-xs text-muted-foreground">{attachment.mimeType} - {formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                    <a href={attachment.fileUrl} download>
                      <Button size="sm" variant="outline" className="border-border w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default AcademyContentDetail;
