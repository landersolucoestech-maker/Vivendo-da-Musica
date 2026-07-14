import { useState } from "react";
import { Award, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import StatusBadge from "@/shared/components/StatusBadge";
import { useToast } from "@/shared/hooks/use-toast";
import { certificatesService } from "@/modules/certificates/services/certificates.service";
import type { CourseCertificate } from "@/modules/certificates/types/certificate.types";

interface CertificateCardProps {
  certificate: CourseCertificate;
  onValidate?: (certificate: CourseCertificate) => void;
}

const CertificateCard = ({ certificate, onValidate }: CertificateCardProps) => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await certificatesService.downloadCertificate(certificate.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${certificate.code}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Certificado baixado", description: certificate.courseTitle });
    } catch (error) {
      toast({
        title: "Não foi possível baixar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-lg bg-brand-medium/10 flex items-center justify-center">
          <Award className="w-5 h-5 text-brand-medium" />
        </div>
        <StatusBadge status={certificate.status} label={certificate.status === "emitido" ? "Emitido" : "Revogado"} />
      </div>
      <div>
        <p className="font-semibold">{certificate.courseTitle}</p>
        <p className="text-sm text-muted-foreground">Emitido em {certificate.issuedAt}</p>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" className="border-border flex-1" onClick={() => onValidate?.(certificate)}>
          <ShieldCheck className="w-4 h-4 mr-2" />
          Validar
        </Button>
        <Button size="sm" className="flex-1" disabled={downloading || certificate.status === "revogado"} onClick={() => void download()}>
          <Download className="w-4 h-4 mr-2" />
          {downloading ? "Gerando..." : "Baixar"}
        </Button>
      </div>
    </div>
  );
};

export default CertificateCard;
