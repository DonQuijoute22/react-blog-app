import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { type RootState } from "../store/store";
import { supabase } from "../lib/supabase";
import ImageUpload from '../components/ImageUpload'; 

interface BlogData {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_email?: string; 
  image_url?: string; 
  image_path?: string;
  created_at: string;
  updated_at: string;
}

export default function EditBlog() {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!id) {
      setError("No blog ID provided");
      setLoading(false);
      return;
    }

    fetchBlog();
  }, [id]);

  const fetchBlog = async () => {
    try {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const blogData = data as BlogData;

      // To check if user owns this blog
      if (data.author_id !== user?.id) {
        setError("You don't have permission to edit this blog");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      setTitle(data.title);
      setContent(data.content);
      setImageUrl(data.image_url || "");
      setImagePath(data.image_path || "");

    console.log("Existing author email:", blogData.author_email);

    } catch (err: any) {
      setError(err.message || "Failed to load blog");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (url: string, path: string) => {
    setImageUrl(url);
    setImagePath(path);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!content.trim()) {
      setError("Please enter blog content");
      return;
    }

    if (!user) {
    setError("You must be logged in to edit a blog");
    return;
  }

  if (!user.email) {
    setError("User email not found. Please check your account.");
    return;
  }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("blogs")
        .update({
          title: title.trim(),
          content: content.trim(),
          author_email: user.email,
          image_url: imageUrl,
          image_path: imagePath, 
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setSuccess("Blog updated successfully!");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to update blog");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this blog? This action cannot be undone.")) {
      return;
    }

    try {
       // Delete image if exists
      if (imagePath) {
        const { error: storageError } = await supabase.storage
          .from('blog-images')
          .remove([imagePath]);
        
        if (storageError) console.error('Failed to delete image:', storageError);
      }
      
      // Delete blog
      const { error } = await supabase.from("blogs").delete().eq("id", id);
      if (error) throw error;
      navigate("/");
    } catch (err: any) {
      setError("Failed to delete blog: " + err.message);
    }
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to discard changes?")) {
      navigate("/");
    }
  };

   const handleDeleteImage = async () => {
    if (!imagePath) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('blog-images')
        .remove([imagePath]);

      if (storageError) throw storageError;

      // Clear image state
      setImageUrl('');
      setImagePath('');

    } catch (err: any) {
      setError('Failed to delete image: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 text-lg">Loading blog...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Edit Blog Post
              </h1>
              <p className="text-gray-600">
                Update your existing blog post
              </p>
            </div>
            <button
              onClick={handleDelete}
              className="inline-flex items-center bg-red-50 hover:bg-red-100 text-red-600 font-medium px-4 py-2 rounded-lg transition"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Delete Blog
            </button>
          </div>
        </div>

         {/* ADD IMAGE UPLOAD SECTION */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-lg font-medium text-gray-900">
                    Blog Cover Image (Optional)
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={handleDeleteImage}
                      className="text-sm text-red-600 hover:text-red-800"
                      disabled={saving}
                    >
                      Remove Image
                    </button>
                  )}
                </div>
                <ImageUpload 
                  onImageUpload={handleImageUpload}
                  currentImage={imageUrl}
                  disabled={saving}
                />
              </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-green-700 font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Title Input */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-lg font-medium text-gray-900 mb-3"
                >
                  Blog Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-lg"
                  placeholder="Enter a compelling title..."
                  disabled={saving}
                  maxLength={100}
                />
                <div className="flex justify-between mt-2">
                  <p className="text-sm text-gray-500">
                    Make it catchy and descriptive
                  </p>
                  <p className="text-sm text-gray-500">
                    {title.length}/100 characters
                  </p>
                </div>
              </div>

              {/* Content Textarea */}
              <div>
                <label
                  htmlFor="content"
                  className="block text-lg font-medium text-gray-900 mb-3"
                >
                  Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="block w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition min-h-[400px] resize-y font-sans"
                  placeholder="Write your amazing content here..."
                  disabled={saving}
                />
                <div className="flex justify-between mt-2">
                  <p className="text-sm text-gray-500">
                    Update your blog content
                  </p>
                  <p className="text-sm text-gray-500">
                    {content.length} characters
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      Update Blog
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-4 px-6 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50"
                  disabled={saving}
                >
                  <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}