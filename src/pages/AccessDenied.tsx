
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link, useNavigate } from "react-router-dom";

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <CardTitle className="text-xl">
            Acesso negado
          </CardTitle>
          <CardDescription>
            Você não tem permissão para acessar esta página. Verifique se você está logado e possui as permissões necessárias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Link to="/" className="block">
              <Button className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Ir para home
              </Button>
            </Link>
            <Link to="/login" className="block">
              <Button variant="secondary" className="w-full">
                Fazer login
              </Button>
            </Link>
          </div>
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Se você acredita que isso é um erro, entre em contato com o suporte.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
