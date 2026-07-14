import { CheckCircle, Home, ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";

const Verified = () => {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          </div>
          <CardTitle className="text-xl">
            E-mail verificado!
          </CardTitle>
          <CardDescription>
            Sua conta foi verificada com sucesso. Você já pode acessar todos os recursos da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 border border-border rounded-lg p-4 text-left">
            <h3 className="text-sm font-semibold mb-2 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
              Conta ativada
            </h3>
            <p className="text-sm text-muted-foreground">
              Sua conta está agora totalmente ativada e você pode começar a usar todos os recursos da nossa plataforma de produção musical.
            </p>
          </div>

          <div className="space-y-3">
            <Link to={ROUTES.dashboard} className="block">
              <Button className="w-full">
                <ArrowRight className="w-4 h-4 mr-2" />
                Ir para dashboard
              </Button>
            </Link>

            <Link to={ROUTES.login} className="block">
              <Button variant="outline" className="w-full">
                Fazer login
              </Button>
            </Link>

            <Link to={ROUTES.home} className="block">
              <Button variant="secondary" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao início
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Bem-vindo à nossa plataforma! Agora você pode explorar todos os cursos e recursos disponíveis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default Verified;
