import StatusBadge from "@/shared/components/StatusBadge";
import type { AcademyContentStatus } from "@/modules/courses/types/academyContent.types";

const AcademyContentStatusBadge = ({ status }: { status: AcademyContentStatus }) => (
  <StatusBadge status={status} label={status === 'published' ? 'Publicado' : 'Rascunho'} />
);

export default AcademyContentStatusBadge;
