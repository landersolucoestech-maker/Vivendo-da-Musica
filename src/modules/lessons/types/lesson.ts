export interface LessonMaterial {
  id: string;
  name: string;
  description: string | null;
  material_type: string;
  file_url: string;
  mime_type: string | null;
  size_bytes: number | null;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  videoUrl: string;
  duration: string;
  order_index: number;
  module_id: string;
  materials?: LessonMaterial[];
  completed?: boolean;
}
