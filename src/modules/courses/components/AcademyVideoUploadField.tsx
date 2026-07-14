import { Upload, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { useAcademyContentUpload } from "@/modules/courses/hooks/useAcademyContentUpload";
import type { AcademyUploadResult } from "@/modules/courses/types/academyContent.types";
import { formatFileSize } from "@/modules/courses/utils/academyContentUpload";

interface AcademyVideoUploadFieldProps {
  contentId?: string;
  value?: {
    url?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    size?: number | null;
  };
  onChange: (upload: AcademyUploadResult | null) => void;
}

const AcademyVideoUploadField = ({ contentId, value, onChange }: AcademyVideoUploadFieldProps) => {
  const { toast } = useToast();
  const upload = useAcademyContentUpload();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await upload.mutateAsync({ file, kind: 'video', contentId });
      onChange(result);
      toast({ title: "Video enviado", description: result.fileName });
    } catch (error) {
      toast({
        title: "Falha no upload do video",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="academy-video">Video proprio</Label>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        {value?.url ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium">{value.fileName || 'Video enviado'}</p>
              <p className="text-muted-foreground">{value.mimeType || 'video'}{value.size ? ` - ${formatFileSize(value.size)}` : ''}</p>
            </div>
            <Button type="button" variant="outline" className="border-border" onClick={() => onChange(null)}>
              <X className="w-4 h-4 mr-2" />
              Remover
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Envie um arquivo MP4, WebM ou QuickTime com ate 500MB.</p>
        )}
        <label className="inline-flex">
          <input
            id="academy-video"
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <span className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            {upload.isPending ? 'Enviando...' : value?.url ? 'Substituir video' : 'Enviar video'}
          </span>
        </label>
      </div>
    </div>
  );
};

export default AcademyVideoUploadField;
