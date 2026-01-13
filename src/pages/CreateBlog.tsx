import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { type RootState } from "../store/store";
import { supabase } from "../lib/supabase";
import ImageUpload from '../components/ImageUpload'; 

export default function CreateBlog() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);


  const handleImageUpload = (url: string, path: string) => {
    setImageUrl(url);
    setImagePath(path);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

     if (!user) {
    setError("You must be logged in to create a blog");
    return;
    }

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!content.trim()) {
      setError("Please enter blog content");
      return;
    }

     if (!user.email) {
    setError("User email not found. Please check your account.");
    return;
  }

    if (!user) {
      setError("You must be logged in to create a blog");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: supabaseError } = await supabase
        .from("blogs")
        .insert([
          {
            title: title.trim(),
            content: content.trim(),
            author_id: user.id,
            author_email: user.email, 
            image_url: imageUrl,
            image_path: imagePath,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select();

      if (supabaseError) {
        throw supabaseError;
      }

      console.log("Blog created:", data);
      
      // Reset form and redirect
      setTitle("");
      setContent("");
      
      // Redirect to home page
      navigate("/");
      
      // success message
      alert("Blog created successfully!");
      
    } catch (err: any) {
      console.error("Error creating blog:", err);
      setError(err.message || "Failed to create blog");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (title || content) {
      if (!window.confirm("Discard this blog post?")) {
        return;
      }
    }
    navigate("/");
  };

  

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Blog</h1>
          <p className="text-gray-600 mt-2">Share your thoughts with the world</p>
        </div>

          {/* ADD IMAGE UPLOAD SECTION */}
              <div>
                <label className="block text-lg font-medium text-gray-900 mb-3">
                  Blog Cover Image (Optional)
                </label>
                <ImageUpload 
                  onImageUpload={handleImageUpload}
                  disabled={loading}
                />
              </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Input */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Blog Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter a compelling title..."
                disabled={loading}
              />
            </div>

            {/* Content Textarea */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-64 resize-y"
                placeholder="Write your amazing content here..."
                disabled={loading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : "Publish Blog"}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg transition"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}