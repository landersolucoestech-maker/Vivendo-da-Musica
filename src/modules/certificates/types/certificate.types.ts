export interface CourseCertificate {
  id: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  status: 'emitido' | 'revogado';
  issuedAt: string;
  code: string;
}

export interface CertificateValidation {
  valid: boolean;
  revoked?: boolean;
  certificate?: {
    code: string;
    studentName: string;
    courseTitle: string;
    issuedAt: string;
  };
}
