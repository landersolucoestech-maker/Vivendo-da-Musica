/**
 * Supplemental display data for real courses (instructor name, rating)
 * that the `courses` table doesn't carry yet — keyed by slug, merged onto
 * real `useCourses()` rows in the UI. Falls back to generic values for any
 * course slug not listed here, so it never blocks rendering.
 */
import type { CourseDisplayExtras } from "@/modules/courses/types/course.types";

export const MOCK_COURSE_EXTRAS: Record<string, CourseDisplayExtras> = {
  'vivendo-da-musica': {
    instructorName: 'Equipe Vivendo da Música',
    rating: 4.8,
    reviewCount: 312,
    level: 'Iniciante',
  },
};

export const DEFAULT_COURSE_EXTRAS: CourseDisplayExtras = {
  instructorName: 'Equipe Vivendo da Música',
  rating: 4.7,
  reviewCount: 0,
  level: 'Iniciante',
};
