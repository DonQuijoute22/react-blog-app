// src/components/Comments.tsx (Updated)
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useSelector } from "react-redux";
import { type RootState } from "../store/store";
import { type Comment as CommentType, type FileAttachment } from "../lib/types";
import CommentFileUpload from "./CommentFileUpload";

interface CommentsProps {
  blogId: string;
  onClose?: () => void;
}

// Interface for uploaded files
interface UploadedFile {
  url: string;
  path: string;
  file: File;
}

export default function Comments({ blogId, onClose }: CommentsProps) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  
  const { user } = useSelector((state: RootState) => state.auth);

  // Fetch comments
  useEffect(() => {
    fetchComments();
    
    // Subscribe to real-time comments
    const channel = supabase
      .channel(`comments:blog_id=eq.${blogId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `blog_id=eq.${blogId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [blogId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      // First, get all comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq("blog_id", blogId)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      // Then, get attachments for each comment
      const commentsWithAttachments = await Promise.all(
        (commentsData || []).map(async (comment) => {
          const { data: attachmentsData } = await supabase
            .from("comment_attachments")
            .select("*")
            .eq("comment_id", comment.id);

          return {
            ...comment,
            attachments: attachmentsData || []
          };
        })
      );

      setComments(commentsWithAttachments);
    } catch (err: any) {
      console.error("Error fetching comments:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle files uploaded from CommentFileUpload
  const handleFilesUpload = (files: UploadedFile[]) => {
    setUploadedFiles(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;

    try {
      setSubmitting(true);
      setError("");

      // First, create the comment
      const { data: commentData, error: commentError } = await supabase
        .from("comments")
        .insert([{
          blog_id: blogId,
          author_id: user.id,
          author_email: user.email,
          content: content.trim()
        }])
        .select()
        .single();

      if (commentError) throw commentError;

      // Then, create attachment records if files were uploaded
      if (uploadedFiles.length > 0) {
        const attachmentsToInsert = uploadedFiles.map(file => ({
          comment_id: commentData.id,
          file_url: file.url,
          file_name: file.file.name,
          file_type: file.file.type,
          file_size: file.file.size
        }));

        const { error: attachmentsError } = await supabase
          .from("comment_attachments")
          .insert(attachmentsToInsert);

        if (attachmentsError) throw attachmentsError;
      }

      // Reset form
      setContent("");
      setUploadedFiles([]);
      
      // Refresh comments
      fetchComments();
    } catch (err: any) {
      setError(err.message || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from("comments")
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", commentId)
        .eq("author_id", user?.id);

      if (error) throw error;

      setEditingCommentId(null);
      setEditContent("");
      fetchComments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (comment: CommentType) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      // Delete comment (cascade will delete attachments in database)
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", comment.id)
        .eq("author_id", user?.id);

      if (error) throw error;

      // Also delete files from storage
      if (comment.attachments && comment.attachments.length > 0) {
        const filePaths = comment.attachments
          .map(attachment => attachment.file_url)
          .filter(url => url.includes('comment-files'))
          .map(url => {
            const parts = url.split('/');
            return parts.slice(parts.indexOf('comment-files')).join('/');
          });

        if (filePaths.length > 0) {
          await supabase.storage
            .from('comment-files')
            .remove(filePaths);
        }
      }

      fetchComments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (comment: CommentType) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
    if (fileType.includes('video')) return '🎬';
    if (fileType.includes('audio')) return '🎵';
    return '📎';
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && comments.length === 0) {
    return (
      <div className="py-4">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          Comments ({comments.length})
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>

      {/* Comment Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="mb-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your comment here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
              rows={3}
              required
            />
          </div>

          {/* File Upload Section */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Attach Files (Optional)
            </h4>
            
            <CommentFileUpload
              onFilesUpload={handleFilesUpload}
              disabled={submitting}
            />
            
            {uploadedFiles.length > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>
                    {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} ready to attach
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <p className="font-medium">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium px-6 py-2.5 rounded-lg transition-all duration-200 flex items-center shadow-sm hover:shadow"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Posting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                  Post Comment
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-5 mb-8 text-center border border-gray-200">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
          <p className="text-gray-600 mb-2 font-medium">Join the conversation</p>
          <p className="text-gray-500 text-sm mb-4">Log in to share your thoughts and attach files</p>
          <a
            href="/login"
            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg transition"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
            </svg>
            Login to Comment
          </a>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
            </svg>
            <h4 className="text-lg font-medium text-gray-700 mb-2">No comments yet</h4>
            <p className="text-gray-500 max-w-md mx-auto">
              Be the first to share your thoughts! Your comment could start an interesting discussion.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-all duration-200 bg-white"
            >
              {editingCommentId === comment.id ? (
                // Edit Mode
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={3}
                    placeholder="Edit your comment..."
                  />
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => handleUpdate(comment.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                        {comment.author_email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {comment.author_email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    {user?.id === comment.author_id && (
                      <div className="flex space-x-1">
                        <button
                          onClick={() => startEdit(comment)}
                          className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition"
                          title="Edit comment"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(comment)}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition"
                          title="Delete comment"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-800 mb-4 whitespace-pre-wrap leading-relaxed">
                    {comment.content}
                  </p>

                  {/* File Attachments Display */}
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        📎 Attachments ({comment.attachments.length})
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {comment.attachments.map((attachment, index) => (
                          <a
                            key={index}
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 transition">
                                <span className="text-xl">{getFileIcon(attachment.file_type)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">
                                  {attachment.file_name}
                                </p>
                                <div className="flex items-center text-xs text-gray-500">
                                  <span>{attachment.file_type.split('/')[1]?.toUpperCase() || 'File'}</span>
                                  {attachment.file_size && (
                                    <>
                                      <span className="mx-2">•</span>
                                      <span>{formatFileSize(attachment.file_size)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                              </svg>
                            </div>
                            {/* Image Preview */}
                            {attachment.file_type.includes('image') && (
                              <div className="mt-3">
                                <img
                                  src={attachment.file_url}
                                  alt={attachment.file_name}
                                  className="w-full h-40 object-cover rounded-lg border border-gray-300 group-hover:border-blue-400 transition"
                                  loading="lazy"
                                />
                              </div>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}