import { useMemo } from 'react';
import { useUserProgress } from './useUserProgress';
import type { CourseModule } from '@/modules/modules-manager/types/courseModule';

export const useProgressCalculation = (modules: CourseModule[] | undefined) => {
  const { data: userProgress } = useUserProgress();

  return useMemo(() => {
    if (!modules) return [];

    return modules.map((module) => {
      const isLessonCompleted = (lessonId: string) =>
        userProgress?.some((p) => p.lesson_id === lessonId && p.completed) ?? false;

      const totalLessons = module.lessons.length;
      const completedCount = module.lessons.filter((lesson) => isLessonCompleted(lesson.id)).length;
      const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      return {
        ...module,
        progress,
        lessons: module.lessons.map((lesson) => ({
          ...lesson,
          completed: isLessonCompleted(lesson.id),
        })),
      };
    });
  }, [modules, userProgress]);
};
