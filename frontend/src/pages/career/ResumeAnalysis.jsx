import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  Loader2,
  Sparkles,
  User,
  Link2,
  Github,
  Linkedin,
  Globe,
  Edit3,
  Save,
  Code,
  Layers,
  Wrench,
  Database,
  Cloud,
  Zap,
  Briefcase,
  GraduationCap,
  Award,
  MapPin,
  Mail,
  Phone
} from 'lucide-react';
import { useDashboardState } from '../../context/DashboardStateContext';
import useActivityTracker from '../../hooks/useActivityTracker';
import OpikEvalPopup from '../../components/observability/OpikEvalPopup';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// Skill category config
const CATEGORY_CONFIG = {
  languages: { icon: Code, color: 'amber', label: 'Languages' },
  frameworks: { icon: Layers, color: 'blue', label: 'Frameworks' },
  tools: { icon: Wrench, color: 'emerald', label: 'Tools' },
  databases: { icon: Database, color: 'purple', label: 'Databases' },
  cloud_devops: { icon: Cloud, color: 'cyan', label: 'Cloud & DevOps' },
  other: { icon: Zap, color: 'slate', label: 'Other' }
};

const ResumeAnalysis = () => {
  useActivityTracker('resume');
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [opikEval, setOpikEval] = useState(null);
  
  // Social links editing state
  const [editingSocial, setEditingSocial] = useState(false);
  const [socialDraft, setSocialDraft] = useState({
    linkedin: '',
    github: '',
    portfolio: '',
    twitter: ''
  });
  const [savingSocial, setSavingSocial] = useState(false);
  
  const { state: dashboardState, refresh: refreshDashboard } = useDashboardState();
  
  const getUserId = () => {
    if (dashboardState?.user_id) return dashboardState.user_id;
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.id;
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage:', e);
    }
    return null;
  };
  const userId = getUserId();

  // Fetch resume data
  useEffect(() => {
    const fetchResumeData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/resume-simple/data/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setResumeData(data);
          // Initialize social link draft from data
          const links = data.social_links || {};
          setSocialDraft({
            linkedin: links.linkedin || '',
            github: links.github || '',
            portfolio: links.portfolio || '',
            twitter: links.twitter || ''
          });
        } else if (response.status === 404) {
          setResumeData(null);
        }
      } catch (err) {
        console.error('Error fetching resume data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResumeData();
  }, [userId]);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|docx)$/i)) {
      setError('Please upload a PDF or DOCX file only');
      setTimeout(() => setError(null), 4000);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);

    try {
      const response = await fetch(`${API_BASE}/api/resume-simple/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setSuccessMessage(`✅ Resume analyzed! Found ${result.skills_count || 0} skills via AI`);
        
        // Show OPIK self-evaluation popup if present
        if (result.opik_eval) {
          setOpikEval(result.opik_eval);
        }
        
        // Refresh resume data
        const dataResponse = await fetch(`${API_BASE}/api/resume-simple/data/${userId}`);
        if (dataResponse.ok) {
          const data = await dataResponse.json();
          setResumeData(data);
          const links = data.social_links || {};
          setSocialDraft({
            linkedin: links.linkedin || '',
            github: links.github || '',
            portfolio: links.portfolio || '',
            twitter: links.twitter || ''
          });
        }
        
        event.target.value = '';
        if (refreshDashboard) refreshDashboard();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Upload failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Make sure the backend is running.');
      console.error('Error uploading resume:', err);
    } finally {
      setUploading(false);
      setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
    }
  };

  // Save social links
  const handleSaveSocial = async () => {
    setSavingSocial(true);
    try {
      const resp = await fetch(`${API_BASE}/api/resume-simple/social-links/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ social_links: socialDraft })
      });
      if (resp.ok) {
        setResumeData(prev => ({ ...prev, social_links: socialDraft }));
        setEditingSocial(false);
      }
    } catch (err) {
      console.error('Error saving social links:', err);
    } finally {
      setSavingSocial(false);
    }
  };

  // Check if any social links exist
  const hasSocialLinks = (links) => {
    if (!links) return false;
    return !!(links.linkedin || links.github || links.portfolio || links.twitter);
  };

  // Get categorized skills from llm_extracted_data
  const getCategorizedSkills = () => {
    const llmData = resumeData?.llm_extracted_data;
    if (llmData?.skills && typeof llmData.skills === 'object' && !Array.isArray(llmData.skills)) {
      return llmData.skills;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  const categorizedSkills = resumeData ? getCategorizedSkills() : null;
  const socialLinks = resumeData?.social_links || {};

  return (
    <>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 transition-colors">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Resume Analysis</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">AI-powered resume extraction — your career profile at a glance</p>
      </motion.div>

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-8"
      >
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Upload Resume</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">PDF or DOCX format — AI extracts all your data automatically</p>
            </div>
            <label
              htmlFor="resume-upload"
              className={`px-6 py-2.5 rounded-lg cursor-pointer transition-all flex items-center gap-2
                ${uploading 
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' 
                  : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {resumeData ? 'Update Resume' : 'Upload Resume'}
                </>
              )}
            </label>
            <input
              id="resume-upload"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </div>

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg text-green-700 dark:text-green-400 text-sm"
            >
              {successMessage}
            </motion.div>
          )}
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-700 dark:text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Resume Data Display */}
      {resumeData ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Profile Card — Name, Contact, Location */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
            <div className="flex items-start gap-5">
              <div className="w-18 h-18 rounded-full bg-amber-100 dark:bg-lime-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-9 h-9 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{resumeData.full_name || 'Unknown'}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  {resumeData.email && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <Mail className="w-3.5 h-3.5" /> {resumeData.email}
                    </span>
                  )}
                  {resumeData.phone && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5" /> {resumeData.phone}
                    </span>
                  )}
                  {resumeData.location && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5" /> {resumeData.location}
                    </span>
                  )}
                </div>
                {/* Summary */}
                {resumeData.llm_extracted_data?.summary && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                    {resumeData.llm_extracted_data.summary}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Social Links — Editable */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Social Links</h3>
              </div>
              {!editingSocial ? (
                <button
                  onClick={() => setEditingSocial(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-lime-500/10 rounded-lg transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {hasSocialLinks(socialLinks) ? 'Edit' : 'Add Links'}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingSocial(false)}
                    className="px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSocial}
                    disabled={savingSocial}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    {savingSocial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </div>
              )}
            </div>

            {editingSocial ? (
              /* Edit Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/...' },
                  { key: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/...' },
                  { key: 'portfolio', label: 'Portfolio', icon: Globe, placeholder: 'https://...' },
                  { key: 'twitter', label: 'Twitter / X', icon: Globe, placeholder: 'https://x.com/...' },
                ].map(({ key, label, icon: Icon, placeholder }) => (
                  <div key={key}>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </label>
                    <input
                      type="url"
                      value={socialDraft[key]}
                      onChange={(e) => setSocialDraft(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* Display Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                  { key: 'github', label: 'GitHub', icon: Github },
                  { key: 'portfolio', label: 'Portfolio', icon: Globe },
                  { key: 'twitter', label: 'Twitter / X', icon: Globe },
                ].map(({ key, label, icon: Icon }) => {
                  const url = socialLinks[key];
                  return (
                    <div key={key} className={`flex items-center gap-3 p-3 rounded-lg border ${
                      url ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800' : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'
                    }`}>
                      <Icon className={`w-4 h-4 ${url ? 'text-amber-500' : 'text-slate-400'}`} />
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-600 hover:underline truncate">
                          {url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400 italic">No {label} link — click Edit to add</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Skills by Category */}
          {categorizedSkills && Object.keys(categorizedSkills).some(k => categorizedSkills[k]?.length > 0) ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Skills</h3>
                </div>
                <div className="px-4 py-2 bg-amber-50 dark:bg-lime-500/10 rounded-lg">
                  <span className="text-sm font-medium text-amber-700 dark:text-lime-400">
                    {resumeData.total_skills || (resumeData.skills?.length) || 0} skills found
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                {Object.entries(categorizedSkills).map(([category, skills]) => {
                  if (!skills || skills.length === 0) return null;
                  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
                  const IconComp = config.icon;
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <IconComp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                          {config.label}
                        </span>
                        <span className="text-xs text-slate-400">({skills.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {skills.map((skill, i) => (
                          <motion.span
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="px-3.5 py-1.5 bg-amber-50 dark:bg-lime-500/10 text-amber-700 dark:text-lime-400 rounded-lg text-sm font-medium border border-amber-200 dark:border-lime-500/20 hover:bg-amber-100 dark:hover:bg-lime-500/20 transition-colors"
                          >
                            {skill}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : resumeData.skills && resumeData.skills.length > 0 ? (
            /* Fallback: flat skills list */
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Skills</h3>
                </div>
                <div className="px-4 py-2 bg-amber-50 dark:bg-lime-500/10 rounded-lg">
                  <span className="text-sm font-medium text-amber-700 dark:text-lime-400">
                    {resumeData.skills.length} skills
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {resumeData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-amber-50 dark:bg-lime-500/10 text-amber-700 dark:text-lime-400 rounded-lg text-sm font-medium border border-amber-200 dark:border-lime-500/20"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Experience Section */}
          {resumeData.experience && resumeData.experience.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Experience</h3>
              </div>
              <div className="space-y-4">
                {resumeData.experience.map((exp, index) => (
                  <div key={index} className="border-l-2 border-amber-400 pl-4 py-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{exp.title || exp.company}</p>
                    {exp.company && exp.title && (
                      <p className="text-sm text-slate-600 dark:text-slate-300">{exp.company}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {exp.duration && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">{exp.duration}</span>
                      )}
                      {exp.type && (
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded text-xs capitalize">
                          {exp.type}
                        </span>
                      )}
                    </div>
                    {exp.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects Section */}
          {resumeData.projects && resumeData.projects.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Projects</h3>
              </div>
              <div className="space-y-4">
                {resumeData.projects.map((project, index) => (
                  <div key={index} className="border-l-2 border-emerald-400 pl-4 py-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{project.name || project}</p>
                    {project.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{project.description}</p>
                    )}
                    {project.tech_stack?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {project.tech_stack.map((t, j) => (
                          <span key={j} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {project.outcome && (
                      <p className="text-sm text-emerald-600 mt-1">
                        <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                        {project.outcome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education Section */}
          {resumeData.education && resumeData.education.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Education</h3>
              </div>
              <div className="space-y-4">
                {resumeData.education.map((edu, index) => (
                  <div key={index} className="border-l-2 border-purple-400 pl-4 py-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{edu.degree || edu.field_of_study}</p>
                    {edu.institution && (
                      <p className="text-sm text-slate-600 dark:text-slate-300">{edu.institution}</p>
                    )}
                    {edu.year && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">{edu.year}</span>
                    )}
                    {edu.honors && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 rounded text-xs">
                        {edu.honors}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {resumeData.certifications && resumeData.certifications.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Certifications</h3>
              </div>
              <div className="space-y-3">
                {resumeData.certifications.map((cert, index) => (
                  <div key={index} className="flex items-start gap-3 py-2">
                    <CheckCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-700 dark:text-slate-200 font-medium">{cert.name || cert}</p>
                      {cert.issuer && <p className="text-xs text-slate-500 dark:text-slate-400">{cert.issuer}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {resumeData.achievements && resumeData.achievements.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Achievements</h3>
              </div>
              <div className="space-y-3">
                {resumeData.achievements.map((achievement, index) => (
                  <div key={index} className="flex items-start gap-3 py-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-200">{achievement}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Updated Timestamp */}
          {resumeData.updated_at && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <FileText className="w-4 h-4" />
              <span>Last updated: {new Date(resumeData.updated_at).toLocaleDateString()}</span>
              {resumeData.status === 'analyzed' && (
                <span className="ml-2 px-2 py-0.5 bg-green-50 dark:bg-green-500/10 text-green-600 rounded text-xs">AI Analyzed</span>
              )}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center transition-colors"
        >
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">No Resume Uploaded</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Upload your resume to see your complete career profile extracted by AI
          </p>
        </motion.div>
      )}
    </div>
    <OpikEvalPopup
      evaluation={opikEval}
      agentName="Resume Analysis"
      onClose={() => setOpikEval(null)}
    />
    </>
  );
};

export default ResumeAnalysis;
