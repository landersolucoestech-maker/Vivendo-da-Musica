import { CheckCircle, Download, Home, Receipt } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Link } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";

const PaymentSuccess = () => {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          </div>
          <CardTitle className="text-xl">
            Pagamento realizado!
          </CardTitle>
          <CardDescription>
            Seu pagamento foi processado com sucesso. Você já pode acessar todo o conteúdo do curso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 border border-border rounded-lg p-4 text-left">
            <h3 className="text-sm font-semibold mb-2">O que acontece agora?</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Acesso liberado a todos os módulos</li>
              <li>• Recebimento do certificado ao final</li>
              <li>• Suporte técnico disponível</li>
              <li>• Acesso vitalício ao conteúdo</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link to={ROUTES.myCourses} className="block">
              <Button className="w-full">
                <Receipt className="w-4 h-4 mr-2" />
                Acessar meus cursos
              </Button>
            </Link>
            <Button variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Baixar comprovante
            </Button>
            <Link to="/" className="block">
              <Button variant="secondary" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao início
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Dúvidas? Entre em contato conosco pelo email: suporte@exemplo.com
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default PaymentSuccess;
