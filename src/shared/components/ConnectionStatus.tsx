
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { CheckCircle, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    // Testar conexão com Supabase
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('course_modules').select('count').limit(1);
        if (error) throw error;
        setIsConnected(true);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Erro de conexão:', error);
        setIsConnected(false);
      }
    };

    // Testar conexão inicial
    testConnection();

    // Testar conexão a cada 30 segundos
    const interval = setInterval(testConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isConnected) {
    return (
      <Alert className="bg-green-500/10 border-green-500/20">
        <CheckCircle className="h-4 w-4 text-green-400" />
        <AlertDescription className="text-green-300">
          Conectado ao Supabase • Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-red-500/10 border-red-500/20">
      <AlertCircle className="h-4 w-4 text-red-400" />
      <AlertDescription className="text-red-300">
        Problema de conexão com o banco de dados. Verifique sua internet.
      </AlertDescription>
    </Alert>
  );
};

export default ConnectionStatus;
