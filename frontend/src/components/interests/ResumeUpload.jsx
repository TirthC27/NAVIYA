/**
 * ResumeUpload Component
 * 
 * Handles resume file upload with:
 * - Drag and drop support
 * - File type validation (PDF, DOC, DOCX, TXT)
 * - Text extraction (for TXT files)
 * - Upload progress indicator
 * - Trigger for analysis task
 */

import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../../api/config';
import {
  DocumentArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Accepted file types
const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ResumeUpload({ userId, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const validateFile = (file) => {
    if (!file) return 'No file selected';
    
    if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
      return 'Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 5MB.';
    }
    
    return null;
  };
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    setError(null);
    
    const droppedFile = e.dataTransfer.files[0];
    const validationError = validateFile(droppedFile);
    
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setFile(droppedFile);
  }, []);
  
  const handleFileSelect = (e) => {
    setError(null);
    const selectedFile = e.target.files[0];
    const validationError = validateFile(selectedFile);
    
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setFile(selectedFile);
  };
  
  const extractTextFromFile = async (file) => {
    // For TXT files, read directly
    if (file.type === 'text/plain') {
      return await file.text();
    }
    
    // For other files, we would need a backend service or library
    // For now, return a placeholder indicating PDF/DOC processing needed
    // In production, this would use pdf.js, mammoth.js, or a backend service
    
    // Simulate text extraction for demo
    // In real implementation, send file to backend for processing
    return `[Resume content from ${file.name}]\n\nNote: Full PDF/DOC text extraction requires backend processing.`;
  };
  
  const handleUpload = async () => {
    if (!file || !userId) return;
    
    setUploading(true);
    setError(null);
    
    try {
      // Extract text from file
      const resumeText = await extractTextFromFile(file);
      
      if (!resumeText || resumeText.length < 50) {
        throw new Error('Could not extract enough text from the file.');
      }
      
      // Create form data
      const formData = new FormData();
      formData.append('resume_text', resumeText);
      formData.append('filename', file.name);
      
      // Send to API
      const response = await fetch(`${API_BASE_URL}/api/resume/upload/${userId}`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Upload failed');
      }
      
      const result = await response.json();
      
      setSuccess(true);
      setFile(null);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
      
      // Reset success state after a delay
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };
  
  const removeFile = () => {
    setFile(null);
    setError(null);
  };
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <DocumentArrowUpIcon className="w-5 h-5 text-indigo-400" />
        Upload Resume
      </h3>
      
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center
          transition-all duration-200 cursor-pointer
          ${dragOver 
            ? 'border-indigo-400 bg-indigo-500/10' 
            : 'border-gray-600 hover:border-gray-500 bg-gray-900/50'
          }
          ${error ? 'border-red-500/50' : ''}
          ${success ? 'border-green-500/50 bg-green-500/10' : ''}
        `}
      >
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        {success ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircleIcon className="w-12 h-12 text-green-400" />
            <p className="text-green-400 font-medium">Upload successful!</p>
            <p className="text-sm text-gray-400">Analysis will begin shortly.</p>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center gap-3">
            <DocumentTextIcon className="w-12 h-12 text-indigo-400" />
            <div>
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <DocumentArrowUpIcon className="w-12 h-12 text-gray-500" />
            <div>
              <p className="text-white font-medium">Drop your resume here</p>
              <p className="text-sm text-gray-400">or click to browse</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Supports PDF, DOC, DOCX, TXT (max 5MB)
            </p>
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      
      {/* Action Buttons */}
      {file && !success && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`
              flex-1 py-2 px-4 rounded-lg font-medium
              flex items-center justify-center gap-2
              transition-all duration-200
              ${uploading 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }
            `}
          >
            {uploading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Analyze Resume
              </>
            )}
          </button>
          
          <button
            onClick={removeFile}
            disabled={uploading}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Info Text */}
      <p className="mt-4 text-xs text-gray-500 text-center">
        Your resume will be analyzed by AI to extract skills, experience, and provide personalized recommendations.
      </p>
    </div>
  );
}
