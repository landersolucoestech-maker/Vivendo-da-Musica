import StudentLayout from "@/app/layouts/StudentLayout";
import PageHeader from "@/shared/components/PageHeader";
import CommunityFeed from "@/modules/community/components/CommunityFeed";

const CommunityPage = () => (
  <StudentLayout>
    <PageHeader title="Comunidade" subtitle="Conecte-se com outros produtores e compartilhe sua jornada." />
    <CommunityFeed />
  </StudentLayout>
);

export default CommunityPage;
