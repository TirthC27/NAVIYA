import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../api/config';

const ProfileSidebar = ({ userId }) => {
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch resume data on component mount
  useEffect(() => {
    fetchResumeData();
  }, [userId]);

  const fetchResumeData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resume-simple/data/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setResumeData(data);
      }
    } catch (error) {
      console.error('Error fetching resume data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|docx)$/i)) {
      setError('Please upload a PDF or DOCX file only');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/resume-simple/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Resume uploaded:', result);
        setSuccessMessage(`✅ Resume uploaded! Found ${result.skills_count || 0} skills`);
        // Refresh resume data
        await fetchResumeData();
        // Clear file input
        event.target.value = '';
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Upload failed. Please try again.');
        console.error('Upload failed:', errorData);
      }
    } catch (error) {
      setError('Network error. Make sure the backend is running.');
      console.error('Error uploading resume:', error);
    } finally {
      setUploading(false);
      // Clear messages after 5 seconds
      setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 p-6">
        <div className="animate-pulse">Loading profile...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto"
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Profile</h2>
      </div>

      {/* Upload Resume Button */}
      <div className="mb-6">
        <label
          htmlFor="resume-upload"
          className={`block w-full text-center px-4 py-2 rounded-lg cursor-pointer transition-colors
            ${uploading 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
        >
          {uploading ? 'Uploading...' : resumeData ? 'Update Resume' : 'Upload Resume'}
        </label>
        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
        />
        <p className="text-xs text-gray-500 mt-2 text-center">PDF or DOCX only</p>
        
        {/* Success Message */}
        {successMessage && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            {successMessage}
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Resume Data Display */}
      {resumeData ? (
        <div className="space-y-6">
          {/* Name */}
          {resumeData.full_name && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Name</h3>
              <p className="text-lg font-medium text-gray-900">{resumeData.full_name}</p>
            </div>
          )}

          {/* Contact Info */}
          {(resumeData.email || resumeData.phone) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Contact</h3>
              {resumeData.email && (
                <p className="text-sm text-gray-700">📧 {resumeData.email}</p>
              )}
              {resumeData.phone && (
                <p className="text-sm text-gray-700">📱 {resumeData.phone}</p>
              )}
            </div>
          )}

          {/* Skills */}
          {resumeData.skills && resumeData.skills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                Skills ({resumeData.total_skills || resumeData.skills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {resumeData.skills.map((skill, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {resumeData.experience && resumeData.experience.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                Experience ({resumeData.experience.length})
              </h3>
              <div className="space-y-3">
                {resumeData.experience.map((exp, index) => (
                  <div key={index} className="border-l-2 border-indigo-500 pl-3">
                    <p className="font-medium text-gray-800">{exp.company || exp.title}</p>
                    <p className="text-sm text-gray-600">{exp.duration}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {resumeData.projects && resumeData.projects.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                Projects ({resumeData.projects.length})
              </h3>
              <ul className="space-y-2">
                {resumeData.projects.map((project, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    • {project.name || project}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Achievements */}
          {resumeData.achievements && resumeData.achievements.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                Achievements ({resumeData.achievements.length})
              </h3>
              <ul className="space-y-2">
                {resumeData.achievements.map((achievement, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    🏆 {achievement}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <p className="mb-4">No resume uploaded yet</p>
          <p className="text-sm">Upload your resume to see your profile</p>
        </div>
      )}
    </motion.div>
  );
};

export default ProfileSidebar;
