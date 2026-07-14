import { FormEvent, useState } from "react";
import { Award, CheckCircle2, XCircle } from "lucide-react";
import { certificatesService } from "@/modules/certificates/services/certificates.service";
import type { CertificateValidation } from "@/modules/certificates/types/certificate.types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";

const ValidateCertificatePage = () => {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CertificateValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      setResult(await certificatesService.validateCertificate(code));
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "Não foi possível validar o certificado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <Award className="w-10 h-10 text-brand-medium mx-auto mb-2" />
          <CardTitle>Validar certificado</CardTitle>
          <CardDescription>Digite o código impresso no certificado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={validate} className="flex gap-2">
            <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="VDM-0000000000000000" className="font-mono" required />
            <Button type="submit" disabled={loading}>{loading ? "Validando..." : "Validar"}</Button>
          </form>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && (
            <div className={`rounded-lg border p-4 ${result.valid ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}>
              <div className="flex items-center gap-2 font-semibold">
                {result.valid ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-destructive" />}
                {result.valid ? "Certificado autêntico" : result.revoked ? "Certificado revogado" : "Certificado não encontrado"}
              </div>
              {result.certificate && (
                <dl className="mt-4 grid gap-2 text-sm">
                  <div><dt className="text-muted-foreground">Aluno</dt><dd>{result.certificate.studentName}</dd></div>
                  <div><dt className="text-muted-foreground">Curso</dt><dd>{result.certificate.courseTitle}</dd></div>
                  <div><dt className="text-muted-foreground">Emissão</dt><dd>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(result.certificate.issuedAt))}</dd></div>
                </dl>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default ValidateCertificatePage;
