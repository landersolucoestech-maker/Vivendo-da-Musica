import type { CourseModule } from '@/modules/modules-manager/types/courseModule';
import type { Lesson } from '@/modules/lessons/types/lesson';
import type { LessonProgress } from '@/modules/lessons/hooks/useUserProgress';
import type { RecentActivity } from '@/modules/dashboard/hooks/useRecentActivities';
import type { UserProfile } from '@/modules/profile/hooks/useUserProfile';

/**
 * Fake content used only when VITE_DEV_BYPASS_AUTH is active, so the
 * dashboard/lesson UI has something to render without a real logged-in,
 * enrolled Supabase user. Never used in production (gated by
 * isDevAuthBypassEnabled wherever it's imported).
 */
export const MOCK_MODULES: CourseModule[] = [
  {
    id: 'mock-module-1',
    title: 'Fundamentos da Produção Musical',
    description: 'Aprenda os conceitos básicos da produção musical',
    progress: 66,
    lessons: [
      {
        id: 'mock-lesson-1',
        title: 'Introdução ao Curso',
        description: 'Bem-vindo ao curso de produção de funk!',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: '15:00',
        completed: true,
        order_index: 1,
        module_id: 'mock-module-1',
      },
      {
        id: 'mock-lesson-2',
        title: 'Configurando seu Home Studio',
        description: 'Aprenda a configurar seu estúdio em casa',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: '25:00',
        completed: true,
        order_index: 2,
        module_id: 'mock-module-1',
      },
      {
        id: 'mock-lesson-3',
        title: 'Conhecendo o FL Studio',
        description: 'Uma introdução completa ao FL Studio',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: '30:00',
        completed: false,
        order_index: 3,
        module_id: 'mock-module-1',
      },
    ],
  },
  {
    id: 'mock-module-2',
    title: 'Criação de Beats e Samples',
    description: 'Domine a arte de criar beats únicos',
    progress: 0,
    lessons: [
      {
        id: 'mock-lesson-4',
        title: 'Drum Patterns Essenciais',
        description: 'Domine os padrões rítmicos fundamentais do funk carioca',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: '25:00',
        completed: false,
        order_index: 1,
        module_id: 'mock-module-2',
      },
      {
        id: 'mock-lesson-5',
        title: 'Estrutura de um Beat',
        description: 'Entenda como estruturar um beat profissional',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: '35:00',
        completed: false,
        order_index: 2,
        module_id: 'mock-module-2',
      },
    ],
  },
  {
    id: 'mock-module-3',
    title: 'Mixagem e Masterização',
    description: 'Finalize suas produções com qualidade profissional',
    progress: 0,
    lessons: [
      {
        id: 'mock-lesson-6',
        title: 'Fundamentos da Mixagem',
        description: 'Aprenda os conceitos fundamentais da mixagem',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: '40:00',
        completed: false,
        order_index: 1,
        module_id: 'mock-module-3',
      },
    ],
  },
];

export const MOCK_LESSONS: Lesson[] = MOCK_MODULES.flatMap((module) =>
  module.lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    video_url: lesson.videoUrl,
    videoUrl: lesson.videoUrl,
    duration: lesson.duration,
    order_index: lesson.order_index,
    module_id: module.id,
    completed: lesson.completed,
  }))
);

export const MOCK_PROGRESS: LessonProgress[] = MOCK_LESSONS.filter((lesson) => lesson.completed).map(
  (lesson) => ({
    id: `mock-progress-${lesson.id}`,
    user_id: 'mock-user',
    lesson_id: lesson.id,
    completed: true,
    progress_percentage: 100,
    watched_seconds: 0,
    last_viewed_at: new Date().toISOString(),
  })
);

export const MOCK_ACTIVITIES: RecentActivity[] = [
  {
    activity: 'Completou "Introdução ao Curso" em Fundamentos da Produção Musical',
    time: 'Há 2 horas atrás',
    type: 'lesson_completed',
  },
  {
    activity: 'Assistiu 40% de "Conhecendo o FL Studio"',
    time: '1 dia atrás',
    type: 'lesson_started',
  },
];

export const MOCK_PROFILE: UserProfile = {
  id: 'mock-profile',
  user_id: 'mock-user',
  avatar_url: null,
  full_name: 'Usuário de Teste',
  role: 'student',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const MOCK_LESSON_FILE = {
  id: 'mock-lesson-file',
  lesson_id: 'mock-lesson-1',
  samples_file_path: 'mock/samples.zip',
  project_file_path: 'mock/project.als',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
