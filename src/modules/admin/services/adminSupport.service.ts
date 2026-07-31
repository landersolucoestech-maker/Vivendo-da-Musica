import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export type SupportMessageStatus = 'new' | 'in_progress' | 'resolved' | 'archived';

export interface AdminSupportMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: SupportMessageStatus;
  source: string;
  created_at: string;
  updated_at: string;
}

export const adminSupportService = {
  async listMessages(): Promise<AdminSupportMessage[]> {
    if (isDevAuthBypassEnabled) {
      const { data, error } = await supabase.rpc('list_demo_contact_messages');
      if (error) throw error;
      return (data ?? []) as AdminSupportMessage[];
    }

    const { data, error } = await supabase
      .from('contact_messages')
      .select('id, name, email, subject, message, status, source, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as AdminSupportMessage[];
  },

  async updateStatus(id: string, status: SupportMessageStatus): Promise<void> {
    if (isDevAuthBypassEnabled) {
      const { error } = await supabase.rpc('update_demo_contact_message_status', {
        target_message_id: id,
        target_status: status,
      });
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('contact_messages')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};
