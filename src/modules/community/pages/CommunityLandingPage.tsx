import PublicLayout from "@/app/layouts/PublicLayout";
import CommunityFeed from "@/modules/community/components/CommunityFeed";

const CommunityLandingPage = () => (
  <PublicLayout>
    <div className="mb-6">
      <h1 className="text-2xl font-bold">Comunidade</h1>
      <p className="text-muted-foreground text-sm mt-1">Conecte-se com outros produtores e compartilhe sua jornada.</p>
    </div>
    <CommunityFeed />
  </PublicLayout>
);

export default CommunityLandingPage;
