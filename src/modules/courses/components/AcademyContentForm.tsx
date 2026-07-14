import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import AcademyImageUploadField from "@/modules/courses/components/AcademyImageUploadField";
import AcademyMaterialUploadField from "@/modules/courses/components/AcademyMaterialUploadField";
import AcademyVideoUploadField from "@/modules/courses/components/AcademyVideoUploadField";
import type {
  AcademyContent,
  AcademyContentAttachment,
  AcademyContentInput,
  AcademyUploadResult,
} from "@/modules/courses/types/academyContent.types";

interface AcademyContentFormProps {
  content?: AcademyContent | null;
  isSaving: boolean;
  onSubmit: (input: AcademyContentInput, pendingMaterials: AcademyUploadResult[]) => Promise<void>;
  onRemoveAttachment: (attachment: AcademyContentAttachment) => void;
  onCancel: () => void;
}

const slugify = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const emptyAttachments: AcademyContentAttachment[] = [];

const AcademyContentForm = ({
  content,
  isSaving,
  onSubmit,
  onRemoveAttachment,
  onCancel,
}: AcademyContentFormProps) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [video, setVideo] = useState<{
    url?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    size?: number | null;
  } | null>(null);
  const [pendingMaterials, setPendingMaterials] = useState<AcademyUploadResult[]>([]);

  useEffect(() => {
    setTitle(content?.title ?? '');
    setSlug(content?.slug ?? '');
    setSubtitle(content?.subtitle ?? '');
    setDescription(content?.description ?? '');
    setBody(content?.body ?? '');
    setCategory(content?.category ?? '');
    setTags((content?.tags ?? []).join(', '));
    setStatus(content?.status ?? 'draft');
    setThumbnailUrl(content?.thumbnailUrl ?? null);
    setBannerUrl(content?.bannerUrl ?? null);
    setVideo(content?.videoUrl ? {
      url: content.videoUrl,
      fileName: content.videoFileName,
      mimeType: content.videoMimeType,
      size: content.videoSize,
    } : null);
    setPendingMaterials([]);
  }, [content]);

  const visibleAttachments = useMemo<AcademyContentAttachment[]>(() => [
    ...(content?.attachments ?? emptyAttachments),
    ...pendingMaterials.map((material) => ({
      id: material.path,
      contentId: content?.id ?? 'pending',
      name: material.fileName,
      fileUrl: material.url,
      mimeType: material.mimeType,
      size: material.size,
      createdAt: new Date().toISOString(),
    })),
  ], [content?.attachments, content?.id, pendingMaterials]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({
      title,
      slug,
      subtitle,
      description,
      body,
      category,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      thumbnailUrl: thumbnailUrl ?? undefined,
      bannerUrl: bannerUrl ?? undefined,
      videoUrl: video?.url ?? undefined,
      videoFileName: video?.fileName ?? undefined,
      videoMimeType: video?.mimeType ?? undefined,
      videoSize: video?.size ?? undefined,
      status,
    }, pendingMaterials);
    setPendingMaterials([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="academy-title">Titulo</Label>
          <Input
            id="academy-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!content) setSlug(slugify(event.target.value));
            }}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="academy-slug">Slug</Label>
          <Input id="academy-slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} required />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="academy-subtitle">Subtitulo</Label>
          <Input id="academy-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="academy-category">Categoria</Label>
          <Input id="academy-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Producao Musical" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="academy-description">Descricao curta</Label>
        <Textarea id="academy-description" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="academy-body">Conteudo escrito</Label>
        <Textarea id="academy-body" value={body} onChange={(event) => setBody(event.target.value)} className="min-h-40" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="academy-tags">Tags</Label>
          <Input id="academy-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="mixagem, carreira, samples" />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value: 'draft' | 'published') => setStatus(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <AcademyImageUploadField id="academy-thumbnail" label="Thumbnail" contentId={content?.id} value={thumbnailUrl} onChange={setThumbnailUrl} />
        <AcademyImageUploadField id="academy-banner" label="Banner" contentId={content?.id} value={bannerUrl} onChange={setBannerUrl} />
      </div>

      <AcademyVideoUploadField
        contentId={content?.id}
        value={video ?? undefined}
        onChange={(upload) => setVideo(upload ? {
          url: upload.url,
          fileName: upload.fileName,
          mimeType: upload.mimeType,
          size: upload.size,
        } : null)}
      />

      <AcademyMaterialUploadField
        contentId={content?.id}
        attachments={visibleAttachments}
        onUploaded={(upload) => setPendingMaterials((current) => [...current, upload])}
        onRemove={(attachment) => {
          if (pendingMaterials.some((material) => material.path === attachment.id)) {
            setPendingMaterials((current) => current.filter((material) => material.path !== attachment.id));
            return;
          }
          onRemoveAttachment(attachment);
        }}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="submit" disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : status === 'published' ? 'Salvar e publicar' : 'Salvar rascunho'}
        </Button>
        <Button type="button" variant="outline" className="border-border" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default AcademyContentForm;
