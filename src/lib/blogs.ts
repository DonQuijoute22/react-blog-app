import { supabase } from "./supabase";

export type Blog = {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
};

// Fetch blogs with pagination
export const fetchBlogs = async (page = 1, limit = 5) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from("blogs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<Blog[]>();  // Use .returns() instead

  if (error) throw error;
  return data;
};

// Create blog
export const createBlog = async (title: string, content: string) => {
  const { data, error } = await supabase
    .from("blogs")
    .insert([{ title, content }])
    .select()
    .single()
    .returns<Blog>();  // Use .returns() instead

  if (error) throw error;
  return data;
};

// Update blog
export const updateBlog = async (id: string, title: string, content: string) => {
  const { data, error } = await supabase
    .from("blogs")
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
    .returns<Blog>();  // Use .returns() instead

  if (error) throw error;
  return data;
};

// Delete blog
export const deleteBlog = async (id: string) => {
  const { error } = await supabase
    .from("blogs")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
};