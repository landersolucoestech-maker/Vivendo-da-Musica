import { useState } from 'react';
import { ArrowUpRight, Clock3, Mail, MessageSquareText, Send } from 'lucide-react';

import PublicLayout from '@/app/layouts/PublicLayout';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';

const CONTACT_EMAIL = 'contato@vivendodamusica.com';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const { toast } = useToast();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const subject = encodeURIComponent(`[Vivendo da Música] ${formData.subject}`);
    const body = encodeURIComponent(
      `Nome: ${formData.name}\nE-mail: ${formData.email}\n\n${formData.message}`,
    );

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    toast({
      title: 'Mensagem preparada',
      description: 'Seu aplicativo de e-mail foi aberto com os dados preenchidos.',
    });
  };

  return (
    <PublicLayout>
      <section className="relative overflow-hidden border-b border-white/8 py-16 sm:py-20">
        <div className="absolute inset-0 vdm-pattern-dots opacity-20" />
        <div className="absolute -right-40 top-0 size-96 rounded-full bg-primary/14 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="vdm-eyebrow">Atendimento</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
            Fale com a equipe Vivendo da Música.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Envie sua dúvida, solicitação comercial ou pedido de suporte pelos canais oficiais da plataforma.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary">
                  <Mail className="size-5" />
                </span>
                <CardTitle className="text-xl">E-mail oficial</CardTitle>
                <CardDescription>Canal central para suporte, parcerias e informações institucionais.</CardDescription>
              </CardHeader>
              <CardContent>
                <a href={`mailto:${CONTACT_EMAIL}`} className="link-vdm inline-flex items-center gap-2 text-sm font-semibold">
                  {CONTACT_EMAIL}
                  <ArrowUpRight className="size-4" />
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary">
                  <Clock3 className="size-5" />
                </span>
                <CardTitle className="text-xl">Prazo de atendimento</CardTitle>
                <CardDescription>
                  As mensagens são organizadas por assunto e respondidas conforme a prioridade operacional.
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="vdm-surface p-5 text-sm leading-6 text-muted-foreground">
              Para agilizar o atendimento, informe o e-mail da conta, a área da plataforma e uma descrição objetiva do problema.
            </div>
          </div>

          <Card className="border-white/12 bg-card/95 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
            <CardHeader>
              <span className="vdm-icon-button mb-3 border-primary/25 bg-primary/10 text-primary">
                <MessageSquareText className="size-5" />
              </span>
              <CardTitle className="text-2xl">Envie sua mensagem</CardTitle>
              <CardDescription>Preencha os campos para preparar o contato no seu aplicativo de e-mail.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Seu nome" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="seu@email.com" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto</Label>
                  <Input id="subject" name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Ex.: suporte ao acesso" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea id="message" name="message" value={formData.message} onChange={handleInputChange} placeholder="Descreva sua solicitação com os detalhes necessários." rows={7} className="resize-none" required />
                </div>

                <Button type="submit" size="lg" className="w-full">
                  <Send className="size-4" />
                  Preparar mensagem
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Contact;
