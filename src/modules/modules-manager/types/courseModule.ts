export interface ModuleLesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  completed: boolean;
  order_index: number;
  module_id: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  progress: number;
  lessons: ModuleLesson[];
}
