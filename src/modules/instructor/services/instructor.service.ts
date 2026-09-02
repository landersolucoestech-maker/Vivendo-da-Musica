import { supabase } from "@/integrations/supabase/client";
import type { InstructorAudienceData, InstructorCourse, InstructorCourseModule, InstructorDashboardData, InstructorReportsData } from "@/modules/instructor/types/instructor.types";

interface CourseRow { id: string; title: string; status: 'draft' | 'published' | 'archived'; created_at: string; currency: string }
interface EnrollmentRow { user_id: string }
interface SaleRow { id: string; amount_cents: number }
interface AudienceEnrollmentRow { id: string; user_id: string; course_id: string; status: 'active' | 'revoked'; source: 'manual' | 'stripe'; created_at: string }
interface ProfileRow { user_id: string; full_name: string | null }
interface ReviewRow { id: string; course_id: string; user_id: string; rating: number; comment: string; status: 'published' | 'hidden'; instructor_response: string | null; created_at: string }
interface ReportSaleRow { id: string; course_id: string; amount_cents: number }
interface ReportEnrollmentRow { id: string; course_id: string }
interface ReportCertificateRow { id: string; course_id: string }

const getUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Entre como instrutor para acessar esta area.');
  return data.user.id;
};

export const instructorService = {
  async getReports(): Promise<InstructorReportsData> {
    const courses = await this.listCourses();
    const courseIds = courses.map((course) => course.id);
    if (!courseIds.length) return { revenueCents: 0, paidSales: 0, averageTicketCents: 0, activeEnrollments: 0, certificatesIssued: 0, certificationRate: 0, currency: 'BRL', courses: [] };

    const salesTable = supabase.from as unknown as (name: 'course_order_items') => {
      select(columns: string): { in(column: string, values: string[]): { not(column: string, operator: 'is', value: null): Promise<{ data: ReportSaleRow[] | null; error: { message: string } | null }> } };
    };
    const salesResult = await salesTable('course_order_items').select('id, course_id, amount_cents').in('course_id', courseIds).not('paid_at', 'is', null);
    if (salesResult.error) throw new Error(`Nao foi possivel carregar as vendas: ${salesResult.error.message}`);

    const enrollmentsTable = supabase.from as unknown as (name: 'enrollments') => {
      select(columns: string): { in(column: string, values: string[]): { eq(column: string, value: string): Promise<{ data: ReportEnrollmentRow[] | null; error: { message: string } | null }> } };
    };
    const enrollmentResult = await enrollmentsTable('enrollments').select('id, course_id').in('course_id', courseIds).eq('status', 'active');
    if (enrollmentResult.error) throw new Error(`Nao foi possivel carregar as matriculas: ${enrollmentResult.error.message}`);

    const certificatesTable = supabase.from as unknown as (name: 'course_certificates') => {
      select(columns: string): { in(column: string, values: string[]): { is(column: string, value: null): Promise<{ data: ReportCertificateRow[] | null; error: { message: string } | null }> } };
    };
    const certificateResult = await certificatesTable('course_certificates').select('id, course_id').in('course_id', courseIds).is('revoked_at', null);
    if (certificateResult.error) throw new Error(`Nao foi possivel carregar os certificados: ${certificateResult.error.message}`);

    const sales = salesResult.data ?? [];
    const enrollments = enrollmentResult.data ?? [];
    const certificates = certificateResult.data ?? [];
    const revenueCents = sales.reduce((total, sale) => total + sale.amount_cents, 0);
    return {
      revenueCents,
      paidSales: sales.length,
      averageTicketCents: sales.length ? Math.round(revenueCents / sales.length) : 0,
      activeEnrollments: enrollments.length,
      certificatesIssued: certificates.length,
      certificationRate: enrollments.length ? Math.round((certificates.length / enrollments.length) * 100) : 0,
      currency: courses[0]?.currency ?? 'BRL',
      courses: courses.map((course) => {
        const courseSales = sales.filter((sale) => sale.course_id === course.id);
        return {
          id: course.id,
          title: course.title,
          revenueCents: courseSales.reduce((total, sale) => total + sale.amount_cents, 0),
          paidSales: courseSales.length,
          activeEnrollments: enrollments.filter((item) => item.course_id === course.id).length,
          certificatesIssued: certificates.filter((item) => item.course_id === course.id).length,
        };
      }),
    };
  },

  async setCourseStatus(courseId: string, status: 'draft' | 'published' | 'archived'): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('courses').update({ status }).eq('id', courseId).eq('instructor_id', userId);
    if (error) throw new Error(`Nao foi possivel alterar a publicacao: ${error.message}`);
  },

  async getAudience(): Promise<InstructorAudienceData> {
    const courses = await this.listCourses();
    const courseIds = courses.map((course) => course.id);
    if (!courseIds.length) return { students: [], reviews: [] };

    const enrollmentsTable = supabase.from as unknown as (name: 'enrollments') => {
      select(columns: string): { in(column: string, values: string[]): { order(column: string, options: { ascending: boolean }): Promise<{ data: AudienceEnrollmentRow[] | null; error: { message: string } | null }> } };
    };
    const enrollmentResult = await enrollmentsTable('enrollments').select('id, user_id, course_id, status, source, created_at').in('course_id', courseIds).order('created_at', { ascending: false });
    if (enrollmentResult.error) throw new Error(`Nao foi possivel carregar os alunos: ${enrollmentResult.error.message}`);
    const enrollments = enrollmentResult.data ?? [];

    const reviewsTable = supabase.from as unknown as (name: 'course_reviews') => {
      select(columns: string): { in(column: string, values: string[]): { order(column: string, options: { ascending: boolean }): Promise<{ data: ReviewRow[] | null; error: { message: string } | null }> } };
    };
    const reviewResult = await reviewsTable('course_reviews').select('id, course_id, user_id, rating, comment, status, instructor_response, created_at').in('course_id', courseIds).order('created_at', { ascending: false });
    if (reviewResult.error) throw new Error(`Nao foi possivel carregar as avaliacoes: ${reviewResult.error.message}`);
    const reviews = reviewResult.data ?? [];

    const userIds = [...new Set([...enrollments.map((item) => item.user_id), ...reviews.map((item) => item.user_id)])];
    let profiles: ProfileRow[] = [];
    if (userIds.length) {
      const profilesTable = supabase.from as unknown as (name: 'user_profiles') => {
        select(columns: string): { in(column: string, values: string[]): Promise<{ data: ProfileRow[] | null; error: { message: string } | null }> };
      };
      const profileResult = await profilesTable('user_profiles').select('user_id, full_name').in('user_id', userIds);
      if (profileResult.error) throw new Error(`Nao foi possivel carregar os perfis: ${profileResult.error.message}`);
      profiles = profileResult.data ?? [];
    }
    const courseNames = new Map(courses.map((course) => [course.id, course.title]));
    const profileNames = new Map(profiles.map((profile) => [profile.user_id, profile.full_name || 'Aluno sem nome']));
    return {
      students: enrollments.map((item) => ({ enrollmentId: item.id, userId: item.user_id, fullName: profileNames.get(item.user_id) ?? 'Aluno sem nome', courseId: item.course_id, courseTitle: String(courseNames.get(item.course_id) ?? 'Curso'), status: item.status, source: item.source, enrolledAt: item.created_at })),
      reviews: reviews.map((item) => ({ id: item.id, courseTitle: String(courseNames.get(item.course_id) ?? 'Curso'), studentName: profileNames.get(item.user_id) ?? 'Aluno sem nome', rating: item.rating, comment: item.comment, status: item.status, instructorResponse: item.instructor_response, createdAt: item.created_at })),
    };
  },

  async moderateReview(id: string, status: 'published' | 'hidden', response: string): Promise<void> {
    const table = supabase.from as unknown as (name: 'course_reviews') => {
      update(values: Record<string, unknown>): { eq(column: string, value: string): Promise<{ error: { message: string } | null }> };
    };
    const normalizedResponse = response.trim() || null;
    const { error } = await table('course_reviews').update({ status, instructor_response: normalizedResponse, responded_at: normalizedResponse ? new Date().toISOString() : null }).eq('id', id);
    if (error) throw new Error(`Nao foi possivel atualizar a avaliacao: ${error.message}`);
  },

  async listCourseStructure(courseId: string): Promise<InstructorCourseModule[]> {
    const { data, error } = await supabase
      .from('course_modules')
      .select('id, title, order_index, lessons(id, title, duration_minutes, video_url, order_index)')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    if (error) throw new Error(`Nao foi possivel carregar o conteudo: ${error.message}`);
    return (data ?? []).map((module) => ({
      id: module.id,
      title: module.title,
      orderIndex: module.order_index,
      lessons: [...(module.lessons ?? [])]
        .sort((a, b) => a.order_index - b.order_index)
        .map((lesson) => ({ id: lesson.id, title: lesson.title, durationMinutes: lesson.duration_minutes, videoUrl: lesson.video_url })),
    }));
  },

  async createModule(courseId: string, title: string, orderIndex: number): Promise<void> {
    const { error } = await supabase.from('course_modules').insert({ course_id: courseId, title, order_index: orderIndex });
    if (error) throw new Error(`Nao foi possivel criar o modulo: ${error.message}`);
  },

  async createLesson(moduleId: string, payload: { title: string; videoUrl?: string; durationMinutes?: number; orderIndex: number }): Promise<void> {
    const { error } = await supabase.from('lessons').insert({
      module_id: moduleId,
      title: payload.title,
      video_url: payload.videoUrl || null,
      duration_minutes: payload.durationMinutes ?? null,
      order_index: payload.orderIndex,
    });
    if (error) throw new Error(`Nao foi possivel criar a aula: ${error.message}`);
  },

  async uploadLessonFile(courseId: string, lessonId: string, file: File, kind: 'sample' | 'project'): Promise<void> {
    const bucket = kind === 'sample' ? 'lesson-samples' : 'lesson-projects';
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${courseId}/${lessonId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (uploadError) throw new Error(`Nao foi possivel enviar o arquivo: ${uploadError.message}`);

    const { data: existing, error: readError } = await supabase.from('lesson_files').select('id').eq('lesson_id', lessonId).maybeSingle();
    let metadataError = readError;
    if (!metadataError) {
      const updatePayload = kind === 'sample'
        ? { samples_file_path: path }
        : { project_file_path: path };
      const insertPayload = kind === 'sample'
        ? { lesson_id: lessonId, samples_file_path: path }
        : { lesson_id: lessonId, project_file_path: path };
      const result = existing
        ? await supabase.from('lesson_files').update(updatePayload).eq('id', existing.id)
        : await supabase.from('lesson_files').insert(insertPayload);
      metadataError = result.error;
    }
    if (metadataError) {
      await supabase.storage.from(bucket).remove([path]);
      throw new Error(`Nao foi possivel registrar o arquivo: ${metadataError.message}`);
    }
  },

  async listCourses(): Promise<InstructorCourse[]> {
    const userId = await getUserId();
    const { data, error } = await supabase.from('courses').select('id, title, slug, description, price_cents, currency, status').eq('instructor_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error(`Nao foi possivel carregar os cursos: ${error.message}`);
    return (data ?? []).map((course) => ({ id: course.id, title: course.title, slug: course.slug, description: course.description ?? '', priceCents: course.price_cents, currency: course.currency, status: course.status }));
  },

  async saveCourse(payload: { id?: string; title: string; slug: string; description: string; priceCents: number }): Promise<void> {
    const userId = await getUserId();
    if (payload.id) {
      const { error } = await supabase.from('courses').update({ title: payload.title, slug: payload.slug, description: payload.description, price_cents: payload.priceCents }).eq('id', payload.id).eq('instructor_id', userId);
      if (error) throw new Error(`Nao foi possivel atualizar o curso: ${error.message}`);
      return;
    }
    const { error } = await supabase.from('courses').insert({ title: payload.title, slug: payload.slug, description: payload.description, price_cents: payload.priceCents, currency: 'BRL', status: 'draft', instructor_id: userId });
    if (error) throw new Error(`Nao foi possivel criar o curso: ${error.message}`);
  },

  async getDashboard(): Promise<InstructorDashboardData> {
    const userId = await getUserId();
    const coursesTable = supabase.from as unknown as (name: 'courses') => {
      select(columns: string): { eq(column: string, value: string): { order(column: string, options: { ascending: boolean }): Promise<{ data: CourseRow[] | null; error: { message: string } | null }> } };
    };
    const coursesResult = await coursesTable('courses').select('id, title, status, created_at, currency').eq('instructor_id', userId).order('created_at', { ascending: false });
    if (coursesResult.error) throw new Error(`Nao foi possivel carregar os cursos: ${coursesResult.error.message}`);
    const courses = coursesResult.data ?? [];
    const courseIds = courses.map((course) => course.id);
    if (!courseIds.length) return { courses: 0, publishedCourses: 0, activeStudents: 0, paidSales: 0, revenueCents: 0, currency: 'BRL', recentCourses: [] };

    const enrollmentsTable = supabase.from as unknown as (name: 'enrollments') => {
      select(columns: string): { in(column: string, values: string[]): { eq(column: string, value: string): Promise<{ data: EnrollmentRow[] | null; error: { message: string } | null }> } };
    };
    const enrollmentsResult = await enrollmentsTable('enrollments').select('user_id').in('course_id', courseIds).eq('status', 'active');
    if (enrollmentsResult.error) throw new Error(`Nao foi possivel carregar os alunos: ${enrollmentsResult.error.message}`);

    const salesTable = supabase.from as unknown as (name: 'course_order_items') => {
      select(columns: string): { in(column: string, values: string[]): { not(column: string, operator: 'is', value: null): Promise<{ data: SaleRow[] | null; error: { message: string } | null }> } };
    };
    const salesResult = await salesTable('course_order_items').select('id, amount_cents').in('course_id', courseIds).not('paid_at', 'is', null);
    if (salesResult.error) throw new Error(`Nao foi possivel carregar a receita: ${salesResult.error.message}`);
    const sales = salesResult.data ?? [];

    return {
      courses: courses.length,
      publishedCourses: courses.filter((course) => course.status === 'published').length,
      activeStudents: new Set((enrollmentsResult.data ?? []).map((item) => item.user_id)).size,
      paidSales: sales.length,
      revenueCents: sales.reduce((total, sale) => total + sale.amount_cents, 0),
      currency: courses[0]?.currency ?? 'BRL',
      recentCourses: courses.slice(0, 5).map((course) => ({ id: course.id, title: course.title, status: course.status, createdAt: course.created_at })),
    };
  },
};