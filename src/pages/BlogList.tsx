// src/pages/BlogList.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSelector } from "react-redux";
import { type RootState } from "../store/store";

interface Blog {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  author_email: string;
  image_url?: string; 
  image_path?: string;     
  updated_at: string;
}

const ITEMS_PER_PAGE = 6; // blogs per page

export default function BlogList() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({}); 
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchBlogs();
    fetchTotalCount();
  }, [currentPage]);

  // fetch comment counts 
  useEffect(() => {
    if (blogs.length > 0) {
      fetchCommentCounts();
    }
  }, [blogs]);

  // total number of blogs for pagination
  const fetchTotalCount = async () => {
    try {
      const { count, error } = await supabase
        .from("blogs")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      
      setTotalBlogs(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (err: any) {
      console.error("Error fetching count:", err);
    }
  };

  // fetch comment counts for each blog
  const fetchCommentCounts = async () => {
    try {
      const blogIds = blogs.map(blog => blog.id);
      
      const { data, error } = await supabase
        .from("comments")
        .select("blog_id")
        .in("blog_id", blogIds);

      if (error) throw error;

      // Count comments per blog
      const counts: Record<string, number> = {};
      data?.forEach(comment => {
        counts[comment.blog_id] = (counts[comment.blog_id] || 0) + 1;
      });

      setCommentCounts(counts);
    } catch (err: any) {
      console.error("Error fetching comment counts:", err);
    }
  };

  // fetch blogs with pagination
  const fetchBlogs = async () => {
    try {
      setLoading(true);
      
      // calculate range for current page
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      // add search filter if it exists
      if (search.trim()) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBlogs(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1); 
    fetchBlogs();
  };

  // clear search
  const handleClearSearch = () => {
    setSearch("");
    setCurrentPage(1);
    fetchBlogs();
  };

  // pagination controls
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const handleDelete = async (id: string, title: string, imagePath?: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      // delete image from storage
      if (imagePath) {
      await supabase.storage
        .from('blog-images')
        .remove([imagePath]);
    }

      // Delete blog from database
      const { error } = await supabase.from("blogs").delete().eq("id", id);
      if (error) throw error;
      
      // refresh data
      fetchBlogs();
      fetchTotalCount();
      
      // return to previous page when deleted
      if (blogs.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err: any) {
      alert("Failed to delete blog: " + err.message);
    }
  };
  

  if (loading && blogs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 text-lg">Loading blogs...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Blog Posts</h1>
              <p className="text-gray-600">
                {totalBlogs} blog posts • Page {currentPage} of {totalPages || 1}
              </p>
            </div>
            
            {user && (
              <Link
                to="/create"
                className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Write New Post
              </Link>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-xl mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Search blogs by title or content..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition"
              >
                Search
              </button>
              {search && (
                <button
                  onClick={handleClearSearch}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-6 py-3 rounded-lg transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* error display */}
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

        {/* blog grid */}
        {blogs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="text-gray-400 mb-6">
              <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-3">
              {search ? "No matching blogs found" : "No blog posts yet"}
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {search
                ? "Try a different search term or clear search to see all blogs"
                : "Be the first to share your thoughts and ideas with the community!"}
            </p>
            {user ? (
              <Link
                to="/create"
                className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Create Your First Blog
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                </svg>
                Login to Create
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {blogs.map((blog) => {
                const isOwner = user && user.id === blog.author_id;
                const authorInitial = "U"; 
                const commentCount = commentCounts[blog.id] || 0; 
                
                return (
                  <div
                    key={blog.id}
                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">

                    {/* image */}
                    {blog.image_url && (
                      <div className="h-48 overflow-hidden">
                        <img 
                          src={blog.image_url} 
                          alt={blog.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-bold text-gray-900 line-clamp-2 leading-tight">
                          <Link
                            to={`/blog/${blog.id}`}
                            className="hover:text-blue-600 transition-colors"
                          >
                            {blog.title}
                          </Link>
                        </h2>
                        {isOwner && (
                          <div className="flex space-x-2">
                            <Link
                              to={`/edit/${blog.id}`}
                              className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                              </svg>
                            </Link>
                            <button
                              onClick={() => handleDelete(blog.id, blog.title, blog.image_path)}
                              className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 mb-6 line-clamp-3 leading-relaxed">
                        {blog.content.length > 150
                          ? `${blog.content.substring(0, 150)}...`
                          : blog.content}
                      </p>

                      <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {authorInitial}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {blog.author_email || `Author: ${blog.author_id.substring(0, 8)}...`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(blog.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          {/* comment count and link */}
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                              </svg>
                              <span className="font-medium">{commentCount}</span>
                              <span className="ml-1">comment{commentCount !== 1 ? 's' : ''}</span>
                            </div>
                            <Link
                              to={`/blog/${blog.id}#comments`}
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                            >
                              View
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                              </svg>
                            </Link>
                          </div>
                        </div>
                        
                        {/* comment preview */}
                        {commentCount > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-start">
                              <svg className="w-3 h-3 text-gray-400 mt-1 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                              </svg>
                              <p className="text-xs text-gray-600 italic line-clamp-2">
                                Has {commentCount} comment{commentCount !== 1 ? 's' : ''}. Click to view discussion...
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

                  {/* page Info */}
                  <div className="text-gray-700">
                    Showing <span className="font-semibold">{blogs.length}</span> of{" "}
                    <span className="font-semibold">{totalBlogs}</span> blogs
                  </div>

                  {/* page Numbers */}
                  <div className="flex items-center space-x-2">
                    {/* first Page */}
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-lg ${currentPage === 1
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
                      </svg>
                    </button>

                    {/* previous page */}
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-lg ${currentPage === 1
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                    >
                      Previous
                    </button>

                    {/* page Numbers */}
                    {getPageNumbers().map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg ${currentPage === pageNum
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                          }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    {/* next Page */}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-lg ${currentPage === totalPages
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                    >
                      Next
                    </button>

                    {/* last page */}
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded-lg ${currentPage === totalPages
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
                      </svg>
                    </button>
                  </div>

                  {/* page selector */}
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-700">Go to page:</span>
                    <select
                      value={currentPage}
                      onChange={(e) => goToPage(Number(e.target.value))}
                      className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <option key={page} value={page}>
                          {page}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* comments summary */}
                <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                  <div className="inline-flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path>
                    </svg>
                    <span>
                      Total comments on this page:{" "}
                      <span className="font-semibold text-blue-600">
                        {Object.values(commentCounts).reduce((sum, count) => sum + count, 0)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}