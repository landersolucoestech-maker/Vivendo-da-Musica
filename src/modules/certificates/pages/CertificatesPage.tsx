import { useState } from 'react';
import { Award, BadgeCheck, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useCertificates } from '@/modules/certificates/hooks/useCertificates';
import type { CourseCertificate } from '@/modules/certificates/types/certificate.types';
import CertificateCard from '@/shared/components/CertificateCard';
import EmptyState from '@/shared/components/EmptyState';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { ROUTES } from '@/shared/constants/routes';

const CertificatesPage = () => {
  const { data: certificates } = useCertificates();
  const [validating, setValidating] = useState<CourseCertificate | null>(null);

  return (
    <StudentLayout>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="vdm-eyebrow">Conquistas acadêmicas</p>
          <h1 className="vdm-page-title mt-2">Certificados</h1>
          <p className="vdm-page-description">Consulte documentos emitidos após a conclusão dos cursos elegíveis.</p>
        </div>
        <Link to={ROUTES.validateCertificate}>
          <Button variant="outline">
            <ShieldCheck className="size-4" />
            Validador público
          </Button>
        </Link>
      </header>

      <div className="mb-7 grid gap-4 sm:grid-cols-2">
        <div className="vdm-surface flex items-center gap-4 p-5">
          <span className="vdm-icon-button border-primary/25 bg-primary/10 text-primary"><Award className="size-5" /></span>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Certificados emitidos</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{certificates?.length ?? 0}</p>
          </div>
        </div>
        <div className="vdm-surface flex items-center gap-4 p-5">
          <span className="vdm-icon-button border-emerald-400/25 bg-emerald-400/10 text-emerald-300"><BadgeCheck className="size-5" /></span>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Autenticidade</p>
            <p className="mt-1 text-sm font-semibold text-white">Validação por código público</p>
          </div>
        </div>
      </div>

      {!certificates?.length ? (
        <EmptyState icon={Award} title="Nenhum certificado emitido" description="Conclua um curso elegível para receber seu primeiro certificado." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {certificates.map((certificate) => (
            <CertificateCard key={certificate.id} certificate={certificate} onValidate={setValidating} />
          ))}
        </div>
      )}

      <Dialog open={!!validating} onOpenChange={(open) => !open && setValidating(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span>
            <DialogTitle className="text-2xl">Validar certificado</DialogTitle>
            <DialogDescription>
              Utilize o código abaixo no validador público para confirmar a autenticidade do documento.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-primary/20 bg-primary/8 p-5 text-center">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Código de validação</p>
            <p className="mt-3 break-all font-mono text-lg font-bold tracking-[0.08em] text-white">{validating?.code}</p>
          </div>

          <Link to={ROUTES.validateCertificate}>
            <Button className="w-full">
              Abrir validador
              <ExternalLink className="size-4" />
            </Button>
          </Link>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default CertificatesPage;
