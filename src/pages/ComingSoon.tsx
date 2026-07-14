import { Clock, Home } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";

const ComingSoon = () => {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
          <CardTitle className="text-xl">
            Você ainda não tem acesso a este curso
          </CardTitle>
          <CardDescription>
            A matrícula neste curso ainda não foi liberada para a sua conta. Entre em contato com o suporte ou aguarde a abertura das vendas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link to={ROUTES.contact} className="block">
            <Button className="w-full">Falar com o suporte</Button>
          </Link>
          <Link to={ROUTES.home} className="block">
            <Button variant="secondary" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoon;
