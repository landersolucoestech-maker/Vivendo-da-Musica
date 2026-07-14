import { Download, FileUp, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { useAcademyContentUpload } from "@/modules/courses/hooks/useAcademyContentUpload";
import type { AcademyContentAttachment, AcademyUploadResult } from "@/modules/courses/types/academyContent.types";
import { formatFileSize } from "@/modules/courses/utils/academyContentUpload";

interface AcademyMaterialUploadFieldProps {
  contentId?: string;
  attachments: AcademyContentAttachment[];
  onUploaded: (upload: AcademyUploadResult) => void;
  onRemove: (attachment: AcademyContentAttachment) => void;
}

const AcademyMaterialUploadField = ({
  contentId,
  attachments,
  onUploaded,
  onRemove,
}: AcademyMaterialUploadFieldProps) => {
  const { toast } = useToast();
  const upload = useAcademyContentUpload();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await upload.mutateAsync({ file, kind: 'material', contentId });
      onUploaded(result);
      toast({ title: "Material enviado", description: result.fileName });
    } catch (error) {
      toast({
        title: "Falha no upload do material",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="academy-material">Materiais para download</Label>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">PDF, ZIP, Excel ou Word com ate 100MB.</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-border p-3">
                <div className="text-sm min-w-0">
                  <p className="font-medium truncate">{attachment.name}</p>
                  <p className="text-muted-foreground">{attachment.mimeType} - {formatFileSize(attachment.size)}</p>
                </div>
                <div className="flex gap-2">
                  <a href={attachment.fileUrl} download>
                    <Button type="button" size="sm" variant="outline" className="border-border">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar
                    </Button>
                  </a>
                  <Button type="button" size="sm" variant="outline" className="border-border" onClick={() => onRemove(attachment)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <label className="inline-flex">
          <input
            id="academy-material"
            type="file"
            accept="application/pdf,application/zip,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <span className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium cursor-pointer">
            <FileUp className="w-4 h-4 mr-2" />
            {upload.isPending ? 'Enviando...' : 'Adicionar material'}
          </span>
        </label>
      </div>
    </div>
  );
};

export default AcademyMaterialUploadField;
