import { useState } from "react";
import StudentLayout from "@/app/layouts/StudentLayout";
import PageHeader from "@/shared/components/PageHeader";
import EmptyState from "@/shared/components/EmptyState";
import CertificateCard from "@/shared/components/CertificateCard";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/components/ui/dialog";
import { useCertificates } from "@/modules/certificates/hooks/useCertificates";
import type { CourseCertificate } from "@/modules/certificates/types/certificate.types";

const CertificatesPage = () => {
  const { data: certificates } = useCertificates();
  const [validating, setValidating] = useState<CourseCertificate | null>(null);

  return (
    <StudentLayout>
      <PageHeader title="Certificados" subtitle="Certificados emitidos após a conclusão dos seus cursos." />

      {!certificates?.length ? (
        <EmptyState title="Você ainda não concluiu nenhum curso" description="Conclua um curso para gerar seu primeiro certificado." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert) => (
            <CertificateCard key={cert.id} certificate={cert} onValidate={setValidating} />
          ))}
        </div>
      )}

      <Dialog open={!!validating} onOpenChange={(open) => !open && setValidating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validação de certificado</DialogTitle>
            <DialogDescription>
              Código: <span className="font-mono text-foreground">{validating?.code}</span>
              <br />
              Este código pode ser consultado no validador público da plataforma para confirmar a autenticidade.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default CertificatesPage;
