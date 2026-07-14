import { Mail, RefreshCw, Home, CheckCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/shared/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ROUTES } from "@/shared/constants/routes";

const VerifyEmail = () => {
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email;

  const [email, setEmail] = useState(stateEmail || '');
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    if (!email) {
      toast({
        title: "Erro",
        description: "Informe o email usado no cadastro para reenviar a confirmação.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Email reenviado!",
        description: "Verifique sua caixa de entrada e spam."
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Mail className="w-6 h-6 text-blue-500" />
          </div>
          <CardTitle className="text-xl">
            Verifique seu e-mail
          </CardTitle>
          <CardDescription>
            Enviamos um link de verificação para seu email. Clique no link para ativar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 border border-border rounded-lg p-4 text-left">
            <h3 className="text-sm font-semibold mb-2 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
              Próximos passos
            </h3>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Verifique sua caixa de entrada</li>
              <li>2. Procure também na pasta de spam</li>
              <li>3. Clique no link de verificação</li>
              <li>4. Faça login na plataforma</li>
            </ol>
          </div>

          {!stateEmail && (
            <Input
              type="email"
              placeholder="Email usado no cadastro"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}

          <div className="space-y-3">
            <Button onClick={handleResendEmail} disabled={isResending} className="w-full">
              {isResending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              {isResending ? "Reenviando..." : "Reenviar e-mail"}
            </Button>

            <Link to={ROUTES.login} className="block">
              <Button variant="outline" className="w-full">
                Já verifiquei — Fazer login
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
              Não recebeu o email? Verifique se o endereço está correto ou entre em contato conosco.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default VerifyEmail;
