import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSelector } from "react-redux";
import { type RootState } from "../store/store";
import Comments from "../components/Comments"; 

interface Blog {
  id: string;
  title: string;
  content: string;
  author_id: string;
  image_url?: string; 
  image_path?: string;
  created_at: string;
  updated_at: string;
}

interface Author {
  id: string;
  email?: string;
}

export default function BlogDetail() {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
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
      setBlog(data);

      // get author info
      if (data?.author_id) {

        try {
          const { data: userData } = await supabase
            .from("users")
            .select("id, email")
            .eq("id", data.author_id)
            .single();
          
          if (userData) {
            setAuthor(userData);
          }
        } catch (e) {

          // email or ID
          setAuthor({ id: data.author_id });
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load blog");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!blog || !window.confirm(`Are you sure you want to delete "${blog.title}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("blogs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      navigate("/");
    } catch (err: any) {
      setError("Failed to delete blog: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 text-lg">Loading blog post...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-red-500 mb-6">
              <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {error || "Blog not found"}
            </h2>
            <p className="text-gray-600 mb-8">
              The blog post you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/"
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user && user.id === blog.author_id;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* back button */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to All Blogs
          </Link>
        </div>

        {/* blog content card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* blog header */}
          <div className="p-8 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {blog.title}
                </h1>
                
                {/* author & date info */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {author?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {author?.email || `Author ID: ${blog.author_id.substring(0, 8)}...`}
                      </p>
                      <p className="text-sm text-gray-500">
                        Published on {formatDate(blog.created_at)}
                      </p>
                      {blog.updated_at !== blog.created_at && (
                        <p className="text-xs text-gray-400">
                          Updated on {formatDate(blog.updated_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* action buttons */}
              {isOwner && (
                <div className="flex space-x-3">
                  <Link
                    to={`/edit/${blog.id}`}
                    className="inline-flex items-center bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-4 py-2 rounded-lg transition"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    Edit
                  </Link>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center bg-red-50 hover:bg-red-100 text-red-600 font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {deleting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                        Delete
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* blog content */}
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              
              {/* render content with preserved formatting */}
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-lg">
                {blog.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-6">
                    {paragraph || <br />}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="p-8 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-gray-600">
                <p className="text-sm">
                  <span className="font-medium">Blog ID:</span> {blog.id}
                </p>
              </div>
              
              <div className="flex space-x-4">
                {isOwner && (
                  <Link
                    to={`/edit/${blog.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit this post
                  </Link>
                )}
                <Link
                  to="/"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  View all posts
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* comment section */}
        <div id="comments" className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Comments</h2>
          {id && <Comments blogId={id} />} {/* Pass the blog ID to Comments component */}
        </div>

        {/* Related actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link
            to="/"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-lg text-center transition"
          >
            ← Back to All Blogs
          </Link>
          
          {user && (
            <Link
              to="/create"
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-lg text-center transition"
            >
              + Create New Blog
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}