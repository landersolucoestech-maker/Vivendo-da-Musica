import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export type CourseStatus = 'draft' | 'published' | 'archived';
export type CourseVisibility = 'public' | 'private' | 'unlisted';
export type LessonStatus = 'draft' | 'published' | 'archived';
export type MaterialType = 'audio_project' | 'wav' | 'mp3' | 'pdf' | 'document' | 'archive' | 'other';

export interface LessonMaterialRecord {
  id: string;
  lesson_id: string;
  name: string;
  description: string | null;
  material_type: MaterialType;
  file_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  order_index: number;
}

export interface LessonRecord {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  status: LessonStatus;
  lesson_materials: LessonMaterialRecord[];
}

export interface CourseModuleRecord {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: LessonRecord[];
}

export interface ManagedCourse {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  original_price_cents: number;
  discount_cents: number;
  price_cents: number;
  currency: string;
  status: CourseStatus;
  visibility: CourseVisibility;
  instructor_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  course_modules: CourseModuleRecord[];
}

export interface CourseInput {
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  original_price_cents: number;
  discount_cents: number;
  currency: string;
  status: CourseStatus;
  visibility: CourseVisibility;
}

export interface ModuleInput {
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
}

export interface LessonInput {
  module_id: string;
  title: string;
  slug: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  status: LessonStatus;
}

export interface MaterialInput {
  lesson_id: string;
  name: string;
  description: string | null;
  material_type: MaterialType;
  file_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  order_index: number;
}

const assertConfiguration = () => {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error('As variáveis do Supabase DEV não estão configuradas.');
  }
};

const getAuthorizationToken = async (): Promise<string> => {
  if (isDevAuthBypassEnabled) return env.supabasePublishableKey;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (!data.session?.access_token) throw new Error('Sessão autenticada não encontrada.');
  return data.session.access_token;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  assertConfiguration();
  const authorizationToken = await getAuthorizationToken();

  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.supabasePublishableKey,
      Authorization: `Bearer ${authorizationToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Falha ao acessar o Supabase (${response.status}).`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

const normalizeCourse = (course: ManagedCourse): ManagedCourse => ({
  ...course,
  price_cents: course.price_cents ?? Math.max(0, course.original_price_cents - course.discount_cents),
  course_modules: (course.course_modules ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((module) => ({
      ...module,
      lessons: (module.lessons ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((lesson) => ({
          ...lesson,
          lesson_materials: (lesson.lesson_materials ?? [])
            .slice()
            .sort((a, b) => a.order_index - b.order_index),
        })),
    })),
});

const courseSelection = [
  'id',
  'title',
  'slug',
  'short_description',
  'description',
  'thumbnail_url',
  'category',
  'original_price_cents',
  'discount_cents',
  'price_cents',
  'currency',
  'status',
  'visibility',
  'instructor_id',
  'published_at',
  'created_at',
  'updated_at',
  'course_modules(id,course_id,title,description,order_index,lessons(id,module_id,title,slug,description,video_url,thumbnail_url,duration_minutes,order_index,status,lesson_materials(id,lesson_id,name,description,material_type,file_url,mime_type,size_bytes,order_index)))',
].join(',');

export const courseManagementApi = {
  async listCourses(): Promise<ManagedCourse[]> {
    const courses = await request<ManagedCourse[]>(
      `courses?select=${encodeURIComponent(courseSelection)}&order=created_at.desc`,
    );
    return courses.map(normalizeCourse);
  },

  async getCourse(id: string): Promise<ManagedCourse> {
    const courses = await request<ManagedCourse[]>(
      `courses?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(courseSelection)}&limit=1`,
    );
    const course = courses[0];
    if (!course) throw new Error('Curso não encontrado.');
    return normalizeCourse(course);
  },

  async createCourse(input: CourseInput): Promise<ManagedCourse> {
    const [course] = await request<ManagedCourse[]>('courses?select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(input),
    });
    return { ...course, course_modules: [] };
  },

  async updateCourse(id: string, input: CourseInput): Promise<ManagedCourse> {
    const [course] = await request<ManagedCourse[]>(`courses?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(input),
    });
    return this.getCourse(course.id);
  },

  async createModule(input: ModuleInput): Promise<CourseModuleRecord> {
    const [module] = await request<CourseModuleRecord[]>('course_modules?select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(input),
    });
    return { ...module, lessons: [] };
  },

  async updateModule(id: string, input: ModuleInput): Promise<CourseModuleRecord> {
    const [module] = await request<CourseModuleRecord[]>(`course_modules?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(input),
    });
    return { ...module, lessons: [] };
  },

  async deleteModule(id: string): Promise<void> {
    await request<void>(`course_modules?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async createLesson(input: LessonInput): Promise<LessonRecord> {
    const [lesson] = await request<LessonRecord[]>('lessons?select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(input),
    });
    return { ...lesson, lesson_materials: [] };
  },

  async updateLesson(id: string, input: LessonInput): Promise<LessonRecord> {
    const [lesson] = await request<LessonRecord[]>(`lessons?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(input),
    });
    return { ...lesson, lesson_materials: [] };
  },

  async deleteLesson(id: string): Promise<void> {
    await request<void>(`lessons?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async createMaterial(input: MaterialInput): Promise<LessonMaterialRecord> {
    const [material] = await request<LessonMaterialRecord[]>('lesson_materials?select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(input),
    });
    return material;
  },

  async deleteMaterial(id: string): Promise<void> {
    await request<void>(`lesson_materials?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
