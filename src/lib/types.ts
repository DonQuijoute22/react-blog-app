// src/lib/types.ts
export interface FileAttachment {
  id?: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  comment_id?: string;
  uploaded_at?: string;
}

export interface Comment {
  id: string;
  blog_id: string;
  author_id: string;
  author_email: string;
  content: string;
  attachments: FileAttachment[];
  created_at: string;
  updated_at: string;
}

export interface Blog {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_email: string;
  image_url?: string;
  image_path?: string;
  created_at: string;
  updated_at: string;
}