
-- Enable RLS on tables that don't have it enabled yet (skip if already enabled)
DO $$ 
BEGIN
    -- Enable RLS on modulos if not already enabled
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'modulos' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on aulas if not already enabled
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'aulas' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on progresso_aulas if not already enabled
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'progresso_aulas' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER TABLE public.progresso_aulas ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on lesson_files if not already enabled
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'lesson_files' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER TABLE public.lesson_files ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on user_profiles if not already enabled
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_profiles' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on user_subscriptions if not already enabled
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_subscriptions' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing overly permissive policies (if they exist)
DROP POLICY IF EXISTS "Módulos são visíveis para todos" ON public.modulos;
DROP POLICY IF EXISTS "Aulas são visíveis para todos" ON public.aulas;
DROP POLICY IF EXISTS "Anyone can view lesson files" ON public.lesson_files;
DROP POLICY IF EXISTS "Authenticated users can manage lesson files" ON public.lesson_files;

-- Drop and recreate progresso_aulas policies with better names
DROP POLICY IF EXISTS "Usuários podem ver seu próprio progresso" ON public.progresso_aulas;
DROP POLICY IF EXISTS "Usuários podem inserir seu próprio progresso" ON public.progresso_aulas;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio progresso" ON public.progresso_aulas;

-- Create secure RLS policies (only if they don't exist)
DO $$ 
BEGIN
    -- Policies for modulos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'modulos' AND policyname = 'Authenticated users can view modules') THEN
        EXECUTE 'CREATE POLICY "Authenticated users can view modules" ON public.modulos FOR SELECT TO authenticated USING (true)';
    END IF;
    
    -- Policies for aulas
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'aulas' AND policyname = 'Authenticated users can view lessons') THEN
        EXECUTE 'CREATE POLICY "Authenticated users can view lessons" ON public.aulas FOR SELECT TO authenticated USING (true)';
    END IF;
    
    -- Policies for progresso_aulas
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'progresso_aulas' AND policyname = 'Users can view their own progress') THEN
        EXECUTE 'CREATE POLICY "Users can view their own progress" ON public.progresso_aulas FOR SELECT TO authenticated USING (auth.uid() = user_id)';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'progresso_aulas' AND policyname = 'Users can insert their own progress') THEN
        EXECUTE 'CREATE POLICY "Users can insert their own progress" ON public.progresso_aulas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'progresso_aulas' AND policyname = 'Users can update their own progress') THEN
        EXECUTE 'CREATE POLICY "Users can update their own progress" ON public.progresso_aulas FOR UPDATE TO authenticated USING (auth.uid() = user_id)';
    END IF;
    
    -- Policies for lesson_files
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lesson_files' AND policyname = 'Authenticated users can view lesson files') THEN
        EXECUTE 'CREATE POLICY "Authenticated users can view lesson files" ON public.lesson_files FOR SELECT TO authenticated USING (true)';
    END IF;
    
    -- Policies for user_subscriptions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_subscriptions' AND policyname = 'Users can view their own subscription') THEN
        EXECUTE 'CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id)';
    END IF;
END $$;

-- Make user_id columns NOT NULL where they should be required (skip if already set)
DO $$ 
BEGIN
    -- Check and update progresso_aulas.user_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'progresso_aulas' AND column_name = 'user_id' AND is_nullable = 'YES') THEN
        -- First, clean up any rows with NULL user_id
        DELETE FROM public.progresso_aulas WHERE user_id IS NULL;
        ALTER TABLE public.progresso_aulas ALTER COLUMN user_id SET NOT NULL;
    END IF;
    
    -- Check and update user_profiles.user_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'user_id' AND is_nullable = 'YES') THEN
        -- First, clean up any rows with NULL user_id
        DELETE FROM public.user_profiles WHERE user_id IS NULL;
        ALTER TABLE public.user_profiles ALTER COLUMN user_id SET NOT NULL;
    END IF;
    
    -- Check and update user_subscriptions.user_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_subscriptions' AND column_name = 'user_id' AND is_nullable = 'YES') THEN
        -- First, clean up any rows with NULL user_id
        DELETE FROM public.user_subscriptions WHERE user_id IS NULL;
        ALTER TABLE public.user_subscriptions ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- Add unique constraint to user_profiles to ensure one profile per user (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND table_name = 'user_profiles' AND constraint_name = 'user_profiles_user_id_unique') THEN
        -- Remove any duplicate profiles first using a more compatible approach
        DELETE FROM public.user_profiles WHERE ctid NOT IN (
            SELECT ctid FROM (
                SELECT ctid, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
                FROM public.user_profiles
            ) t WHERE rn = 1
        );
        ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);
    END IF;
END $$;
