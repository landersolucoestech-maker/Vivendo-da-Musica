export interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  videoUrl: string;
  duration: string;
  order_index: number;
  module_id: string;
  completed?: boolean;
}
