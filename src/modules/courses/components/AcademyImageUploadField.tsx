import { ImagePlus, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { useAcademyContentUpload } from "@/modules/courses/hooks/useAcademyContentUpload";

interface AcademyImageUploadFieldProps {
  id: string;
  label: string;
  contentId?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
}

const AcademyImageUploadField = ({ id, label, contentId, value, onChange }: AcademyImageUploadFieldProps) => {
  const { toast } = useToast();
  const upload = useAcademyContentUpload();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = await upload.mutateAsync({ file, kind: 'image', contentId });
      onChange(result.url);
      toast({ title: "Imagem enviada", description: result.fileName });
    } catch (error) {
      toast({
        title: "Falha no upload da imagem",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        {value ? (
          <div className="space-y-3">
            <img src={value} alt={label} className="w-full aspect-video object-cover rounded-md" />
            <Button type="button" variant="outline" className="border-border" onClick={() => onChange(null)}>
              <X className="w-4 h-4 mr-2" />
              Remover imagem
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">JPEG, PNG ou WebP com ate 10MB.</p>
        )}
        <label className="inline-flex">
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <span className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium cursor-pointer">
            <ImagePlus className="w-4 h-4 mr-2" />
            {upload.isPending ? 'Enviando...' : value ? 'Substituir imagem' : 'Enviar imagem'}
          </span>
        </label>
      </div>
    </div>
  );
};

export default AcademyImageUploadField;
