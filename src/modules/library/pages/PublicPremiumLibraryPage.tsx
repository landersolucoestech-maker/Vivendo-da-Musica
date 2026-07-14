import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import { Button } from "@/shared/components/ui/button";
import { useLibraryItems } from "@/modules/library/hooks/useLibrary";
import { ROUTES } from "@/shared/constants/routes";

const PublicPremiumLibraryPage = () => {
  const { data: libraryItems } = useLibraryItems();
  const preview = (libraryItems ?? []).slice(0, 9);

  return (
    <PublicLayout>
      <div className="text-center max-w-xl mx-auto mb-10">
        <p className="text-brand-medium font-medium mb-2">Biblioteca Premium</p>
        <h1 className="text-2xl font-bold mb-3">{libraryItems?.length ?? 0} itens exclusivos para assinantes</h1>
        <p className="text-muted-foreground mb-6">
          Aulas extras, templates, presets e samples liberados conforme você avança no plano Premium.
        </p>
        <Link to={ROUTES.vipArea}>
          <Button size="lg">Assinar Premium</Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {preview.map((item) => (
          <div key={item.id} className="relative rounded-lg border border-border bg-card p-5 overflow-hidden">
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <span className="text-xs text-brand-medium font-medium">{item.type}</span>
            <p className="font-medium mt-2">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.category}</p>
          </div>
        ))}
      </div>
    </PublicLayout>
  );
};

export default PublicPremiumLibraryPage;
