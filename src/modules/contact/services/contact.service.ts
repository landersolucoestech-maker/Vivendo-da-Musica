import { supabase } from '@/integrations/supabase/client';

export interface ContactMessageInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const normalize = (value: string) => value.trim();

export const contactService = {
  async submit(input: ContactMessageInput): Promise<void> {
    const payload = {
      name: normalize(input.name),
      email: normalize(input.email).toLowerCase(),
      subject: normalize(input.subject),
      message: normalize(input.message),
      status: 'new',
      source: 'public_contact',
    };

    if (payload.name.length < 2) throw new Error('Informe seu nome completo.');
    if (!/^\S+@\S+\.\S+$/.test(payload.email)) throw new Error('Informe um e-mail válido.');
    if (payload.subject.length < 3) throw new Error('Informe um assunto válido.');
    if (payload.message.length < 10) throw new Error('A mensagem deve conter pelo menos 10 caracteres.');

    const { error } = await supabase.from('contact_messages').insert(payload);
    if (error) throw error;
  },
};
