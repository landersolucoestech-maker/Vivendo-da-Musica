import { supabase } from "@/integrations/supabase/client";
import type { CertificateValidation, CourseCertificate } from "@/modules/certificates/types/certificate.types";

interface CertificateRow {
  id: string;
  course_id: string;
  certificate_code: string;
  student_name_snapshot: string;
  course_title_snapshot: string;
  issued_at: string;
  revoked_at: string | null;
}

const certificateTable = () => {
  const from = supabase.from as unknown as (name: "course_certificates") => {
    select(columns: string): {
      order(column: string, options: { ascending: boolean }): Promise<{
        data: CertificateRow[] | null;
        error: { message: string } | null;
      }>;
    };
  };
  return from("course_certificates");
};

const mapCertificate = (row: CertificateRow): CourseCertificate => ({
  id: row.id,
  courseId: row.course_id,
  courseTitle: row.course_title_snapshot,
  studentName: row.student_name_snapshot,
  status: row.revoked_at ? "revogado" : "emitido",
  issuedAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(row.issued_at)),
  code: row.certificate_code,
});

export const certificatesService = {
  async listCertificates(): Promise<CourseCertificate[]> {
    const { data, error } = await certificateTable()
      .select("id, course_id, certificate_code, student_name_snapshot, course_title_snapshot, issued_at, revoked_at")
      .order("issued_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCertificate);
  },

  async listRecentCertificates(limit = 2): Promise<CourseCertificate[]> {
    const certificates = await this.listCertificates();
    return certificates.slice(0, limit);
  },

  async validateCertificate(code: string): Promise<CertificateValidation> {
    const { data, error } = await supabase.functions.invoke("validate-course-certificate", { body: { code } });
    if (error) throw new Error(error.message);
    return data as CertificateValidation;
  },

  async downloadCertificate(certificateId: string): Promise<Blob> {
    const { data, error } = await supabase.functions.invoke("get-course-certificate", { body: { certificateId } });
    if (error) throw new Error(error.message);
    if (!(data instanceof Blob)) throw new Error(data?.error ?? "Certificado indisponível");
    return data;
  },
};
