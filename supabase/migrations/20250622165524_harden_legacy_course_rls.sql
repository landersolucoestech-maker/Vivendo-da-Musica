DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'modulos',
    'aulas',
    'progresso_aulas',
    'lesson_files',
    'user_profiles',
    'user_subscriptions'
  ] LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.modulos') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Módulos são visíveis para todos" ON public.modulos;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'modulos'
        AND policyname = 'Authenticated users can view modules'
    ) THEN
      CREATE POLICY "Authenticated users can view modules"
      ON public.modulos FOR SELECT TO authenticated USING (true);
    END IF;
  END IF;

  IF to_regclass('public.aulas') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Aulas são visíveis para todos" ON public.aulas;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'aulas'
        AND policyname = 'Authenticated users can view lessons'
    ) THEN
      CREATE POLICY "Authenticated users can view lessons"
      ON public.aulas FOR SELECT TO authenticated USING (true);
    END IF;
  END IF;

  IF to_regclass('public.progresso_aulas') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Usuários podem ver seu próprio progresso" ON public.progresso_aulas;
    DROP POLICY IF EXISTS "Usuários podem inserir seu próprio progresso" ON public.progresso_aulas;
    DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio progresso" ON public.progresso_aulas;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'progresso_aulas'
        AND policyname = 'Users can view their own progress'
    ) THEN
      CREATE POLICY "Users can view their own progress"
      ON public.progresso_aulas FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'progresso_aulas'
        AND policyname = 'Users can insert their own progress'
    ) THEN
      CREATE POLICY "Users can insert their own progress"
      ON public.progresso_aulas FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'progresso_aulas'
        AND policyname = 'Users can update their own progress'
    ) THEN
      CREATE POLICY "Users can update their own progress"
      ON public.progresso_aulas FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
    END IF;
  END IF;

  IF to_regclass('public.lesson_files') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can view lesson files" ON public.lesson_files;
    DROP POLICY IF EXISTS "Authenticated users can manage lesson files" ON public.lesson_files;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'lesson_files'
        AND policyname = 'Authenticated users can view lesson files'
    ) THEN
      CREATE POLICY "Authenticated users can view lesson files"
      ON public.lesson_files FOR SELECT TO authenticated USING (true);
    END IF;
  END IF;

  IF to_regclass('public.user_subscriptions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'user_subscriptions'
         AND policyname = 'Users can view their own subscription'
     ) THEN
    CREATE POLICY "Users can view their own subscription"
    ON public.user_subscriptions FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'progresso_aulas'
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    DELETE FROM public.progresso_aulas WHERE user_id IS NULL;
    ALTER TABLE public.progresso_aulas ALTER COLUMN user_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    DELETE FROM public.user_profiles WHERE user_id IS NULL;
    ALTER TABLE public.user_profiles ALTER COLUMN user_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    DELETE FROM public.user_subscriptions WHERE user_id IS NULL;
    ALTER TABLE public.user_subscriptions ALTER COLUMN user_id SET NOT NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'user_profiles'
         AND column_name = 'user_id'
     )
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.user_profiles'::regclass
         AND contype = 'u'
         AND conname = 'user_profiles_user_id_unique'
     ) THEN
    DELETE FROM public.user_profiles profile
    USING public.user_profiles duplicate
    WHERE profile.user_id = duplicate.user_id
      AND profile.ctid > duplicate.ctid;

    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);
  END IF;
END;
$$;
