import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { env } from '@/app/config/env';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey);