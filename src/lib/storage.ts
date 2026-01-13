import { supabase } from './supabase';

export const uploadBlogImage = async (file: File): Promise<{url: string, path: string}> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  const filePath = `blog-images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('blog-images')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('blog-images')
    .getPublicUrl(filePath);

  return { url: publicUrl, path: filePath };
};

export const deleteBlogImage = async (path: string): Promise<void> => {
  if (!path) return;
  
  const { error } = await supabase.storage
    .from('blog-images')
    .remove([path]);
  
  if (error) throw error;
};