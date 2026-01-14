import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';

interface UploadedFile {
  url: string;
  path: string;
  file: File;
}

interface CommentFileUploadProps {
  onFilesUpload: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

const CommentFileUpload: React.FC<CommentFileUploadProps> = ({ 
  onFilesUpload, 
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setError('');
    
    const uploadedResults: UploadedFile[] = [];
    const newPreviews: { [key: string]: string } = { ...previews };
    
    try {
      for (const file of acceptedFiles) {
        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(`"${file.name}" exceeds 10MB limit`);
        }

        // Create preview for images
        if (file.type.startsWith('image/')) {
          const previewUrl = URL.createObjectURL(file);
          newPreviews[file.name] = previewUrl;
        }

        // Upload to comment-files bucket
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `comment-files/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('comment-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('comment-files')
          .getPublicUrl(filePath);

        const uploadedFile: UploadedFile = {
          url: publicUrl,
          path: filePath,
          file: file
        };
        
        uploadedResults.push(uploadedFile);
      }

      // Update states
      const allUploadedFiles = [...uploadedFiles, ...uploadedResults];
      setUploadedFiles(allUploadedFiles);
      setPreviews(newPreviews);
      
      // Call parent callback with all uploaded files
      onFilesUpload(allUploadedFiles);
      
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
      // Clean up preview URLs on error
      Object.values(newPreviews).forEach(url => URL.revokeObjectURL(url));
    } finally {
      setUploading(false);
    }
  }, [uploadedFiles, previews, onFilesUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
    multiple: true,
    maxFiles: 5,
    disabled: uploading || disabled,
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.flatMap(f => f.errors.map(e => e.message));
      setError(`Invalid files: ${errors.join(', ')}`);
    }
  });

  const handleRemoveFile = async (index: number) => {
    const fileToRemove = uploadedFiles[index];
    
    try {
      // Delete file from storage
      await supabase.storage
        .from('comment-files')
        .remove([fileToRemove.path]);
      
      // Clean up preview URL if exists
      if (previews[fileToRemove.file.name]) {
        URL.revokeObjectURL(previews[fileToRemove.file.name]);
        const newPreviews = { ...previews };
        delete newPreviews[fileToRemove.file.name];
        setPreviews(newPreviews);
      }
      
      // Remove from uploaded files
      const newFiles = uploadedFiles.filter((_, i) => i !== index);
      setUploadedFiles(newFiles);
      
      // Update parent
      onFilesUpload(newFiles);
    } catch (err: any) {
      setError(`Failed to remove file: ${err.message}`);
    }
  };

  const handleClearAll = async () => {
    if (uploadedFiles.length === 0) return;
    
    if (!window.confirm(`Remove all ${uploadedFiles.length} files?`)) return;
    
    try {
      // Delete all files from storage
      const paths = uploadedFiles.map(file => file.path);
      await supabase.storage
        .from('comment-files')
        .remove(paths);
      
      // Clean up all preview URLs
      Object.values(previews).forEach(url => URL.revokeObjectURL(url));
      
      // Clear all states
      setUploadedFiles([]);
      setPreviews({});
      onFilesUpload([]);
    } catch (err: any) {
      setError(`Failed to clear files: ${err.message}`);
    }
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Uploading files...</p>
            <p className="text-xs text-gray-500">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
            </div>
            <div>
              <p className="text-gray-700 font-medium">
                {isDragActive ? 'Drop files here' : 'Attach files to comment'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag & drop or click to select files
              </p>
              <div className="mt-2 text-xs text-gray-400 space-y-1">
                <p>✅ Supports: Images, PDF, Documents, Spreadsheets</p>
                <p>✅ Max 5 files • 10MB each</p>
                <p>✅ Click on uploaded files to remove</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded files preview */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-700">
              Files to attach ({uploadedFiles.length}/5):
            </p>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Clear all
            </button>
          </div>
          
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="group relative p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  {previews[file.file.name] ? (
                    <div className="relative">
                      <img 
                        src={previews[file.file.name]} 
                        alt={file.file.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg"></div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">{getFileIcon(file.file.type)}</span>
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file.name}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span>{getFileIcon(file.file.type)}</span>
                      <span>•</span>
                      <span>{formatFileSize(file.file.size)}</span>
                      <span>•</span>
                      <span className="text-green-600 font-medium">Uploaded ✓</span>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-full transition-all"
                    title="Remove file"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                
                {/* Progress indicator for individual files */}
                {uploading && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
                    <div className="h-full bg-blue-500 animate-pulse"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-xs text-gray-500 flex items-center">
            <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Files are uploaded to cloud storage and ready to attach</span>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-pulse">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="font-medium">Upload Error</p>
          </div>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {/* Storage usage info */}
      {uploadedFiles.length > 0 && (
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
          <div className="flex justify-between">
            <span>Total size:</span>
            <span className="font-medium">
              {formatFileSize(uploadedFiles.reduce((total, file) => total + file.file.size, 0))}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Files remaining:</span>
            <span className="font-medium">{5 - uploadedFiles.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentFileUpload;