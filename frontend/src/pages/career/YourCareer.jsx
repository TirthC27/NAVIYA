import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle,
  ChevronRight,
  Code,
  Database,
  Cloud,
  Wrench,
  Layers,
  Lightbulb,
  Zap,
  User,
  Link2,
  Github,
  Linkedin,
  Globe,
  Edit3,
  Save,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Award,
  FileText
} from 'lucide-react';
import { useDashboardState } from '../../context/DashboardStateContext';
import { useNavigate } from 'react-router-dom';
import OpikEvalPopup from '../../components/observability/OpikEvalPopup';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// Category icon + color map
const CATEGORY_CONFIG = {
  languages: { icon: Code, color: 'amber', label: 'Languages' },
  language: { icon: Code, color: 'amber', label: 'Languages' },
  frameworks: { icon: Layers, color: 'blue', label: 'Frameworks' },
  framework: { icon: Layers, color: 'blue', label: 'Frameworks' },
  tools: { icon: Wrench, color: 'emerald', label: 'Tools' },
  tool: { icon: Wrench, color: 'emerald', label: 'Tools' },
  databases: { icon: Database, color: 'purple', label: 'Databases' },
  database: { icon: Database, color: 'purple', label: 'Databases' },
  cloud_devops: { icon: Cloud, color: 'cyan', label: 'Cloud & DevOps' },
  cloud: { icon: Cloud, color: 'cyan', label: 'Cloud & DevOps' },
  other: { icon: Zap, color: 'slate', label: 'Other' }
};

const YourCareer = () => {
  const [resumeData, setResumeData] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gapResult, setGapResult] = useState(null);
  const [gapLoading, setGapLoading] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const [opikEval, setOpikEval] = useState(null);

  // Social links editing
  const [editingSocial, setEditingSocial] = useState(false);
  const [socialDraft, setSocialDraft] = useState({ linkedin: '', github: '', portfolio: '', twitter: '' });
  const [savingSocial, setSavingSocial] = useState(false);

  const { state: dashboardState } = useDashboardState();
  const navigate = useNavigate();

  const getUserId = () => {
    if (dashboardState?.user_id) return dashboardState.user_id;
    try {
      const userData = localStorage.getItem('user');
      if (userData) return JSON.parse(userData).id;
    } catch (e) {}
    return null;
  };
  const userId = getUserId();

  // Fetch career data from resume + skills
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    
    const fetchData = async () => {
      try {
        // Use the new combined career endpoint
        const resp = await fetch(`${API_BASE}/api/resume-simple/career/${userId}`);
        if (resp.ok) {
          const data = await resp.json();
          setResumeData(data.resume);
          setSkills(data.skills || []);
          const links = data.resume?.social_links || {};
          setSocialDraft({
            linkedin: links.linkedin || '',
            github: links.github || '',
            portfolio: links.portfolio || '',
            twitter: links.twitter || ''
          });
        }
      } catch (err) {
        console.error('Error fetching career data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  // Skill gap analysis
  const runGapAnalysis = async () => {
    if (!userId || !targetRole.trim()) return;
    setGapLoading(true);

    try {
      const resp = await fetch(`${API_BASE}/api/career-intelligence/skill-gaps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, target_role: targetRole })
      });
      if (resp.ok) {
        const data = await resp.json();
        setGapResult(data);
        if (data.opik_eval) setOpikEval(data.opik_eval);
      }
    } catch (err) {
      console.error('Gap analysis error:', err);
    } finally {
      setGapLoading(false);
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

  // Group skills by category
  const groupedSkills = skills.reduce((acc, skill) => {
    const cat = skill.skill_category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const hasSocialLinks = (links) => {
    if (!links) return false;
    return !!(links.linkedin || links.github || links.portfolio || links.twitter);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-500 dark:text-lime-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400">Loading your career profile...</p>
        </div>
      </div>
    );
  }

  const socialLinks = resumeData?.social_links || {};

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 transition-colors">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-amber-500 dark:text-lime-400" />
              Your Career
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Your career profile — powered by AI resume analysis</p>
          </div>
        </div>
      </motion.div>

      {!resumeData ? (
        /* No Resume */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center transition-colors"
        >
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-lime-900/30 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-amber-500 dark:text-lime-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">No Resume Uploaded Yet</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Upload your resume in the Resume Analysis section to see your complete career profile here
          </p>
          <button
            onClick={() => navigate('/career/resume')}
            className="px-6 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Go to Resume Upload
          </button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-xl border border-slate-200 p-8"
          >
            <div className="flex items-start gap-5">
              <div className="w-18 h-18 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <User className="w-9 h-9 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-800">{resumeData.full_name || 'Unknown'}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  {resumeData.email && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Mail className="w-3.5 h-3.5" /> {resumeData.email}
                    </span>
                  )}
                  {resumeData.phone && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Phone className="w-3.5 h-3.5" /> {resumeData.phone}
                    </span>
                  )}
                  {resumeData.location && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin className="w-3.5 h-3.5" /> {resumeData.location}
                    </span>
                  )}
                </div>
                {resumeData.llm_extracted_data?.summary && (
                  <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                    {resumeData.llm_extracted_data.summary}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Social Links — Editable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-slate-200 p-8"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-slate-800">Social Links</h3>
              </div>
              {!editingSocial ? (
                <button
                  onClick={() => setEditingSocial(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {hasSocialLinks(socialLinks) ? 'Edit' : 'Add Links'}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingSocial(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 rounded-lg">
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSocial}
                    disabled={savingSocial}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                  >
                    {savingSocial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </div>
              )}
            </div>

            {editingSocial ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/...' },
                  { key: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/...' },
                  { key: 'portfolio', label: 'Portfolio', icon: Globe, placeholder: 'https://...' },
                  { key: 'twitter', label: 'Twitter / X', icon: Globe, placeholder: 'https://x.com/...' },
                ].map(({ key, label, icon: Icon, placeholder }) => (
                  <div key={key}>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </label>
                    <input
                      type="url"
                      value={socialDraft[key]}
                      onChange={(e) => setSocialDraft(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                  { key: 'github', label: 'GitHub', icon: Github },
                  { key: 'portfolio', label: 'Portfolio', icon: Globe },
                  { key: 'twitter', label: 'Twitter / X', icon: Globe },
                ].map(({ key, label, icon: Icon }) => {
                  const url = socialLinks[key];
                  return (
                    <div key={key} className={`flex items-center gap-3 p-3 rounded-lg border ${url ? 'border-slate-200 bg-slate-50' : 'border-dashed border-slate-300 bg-slate-50/50'}`}>
                      <Icon className={`w-4 h-4 ${url ? 'text-amber-500' : 'text-slate-400'}`} />
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-600 hover:underline truncate">
                          {url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400 italic">No {label} — click Edit to add</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Categorized Skills */}
          {Object.keys(groupedSkills).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-xl border border-slate-200 p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-semibold text-slate-800">Skills by Category</h3>
                </div>
                <div className="px-4 py-2 bg-amber-50 rounded-lg">
                  <span className="text-sm font-medium text-amber-700">{skills.length} total</span>
                </div>
              </div>

              <div className="space-y-6">
                {Object.entries(groupedSkills).map(([category, catSkills]) => {
                  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
                  const IconComp = config.icon;
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <IconComp className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                          {config.label}
                        </span>
                        <span className="text-xs text-slate-400">({catSkills.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {catSkills.map((skill, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            {skill.skill_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Experience */}
          {resumeData.experience?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-slate-200 p-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-slate-800">Experience</h3>
              </div>
              <div className="space-y-4">
                {resumeData.experience.map((exp, i) => (
                  <div key={i} className="border-l-2 border-blue-400 pl-4 py-2">
                    <p className="font-medium text-slate-800">{exp.title}</p>
                    {exp.company && <p className="text-sm text-slate-600">{exp.company}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      {exp.duration && <span className="text-xs text-slate-500">{exp.duration}</span>}
                      {exp.type && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs capitalize">{exp.type}</span>
                      )}
                    </div>
                    {exp.description && <p className="text-sm text-slate-500 mt-1">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Projects */}
          {resumeData.projects?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-xl border border-slate-200 p-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-slate-800">Projects</h3>
              </div>
              <div className="space-y-4">
                {resumeData.projects.map((proj, i) => (
                  <div key={i} className="border-l-2 border-emerald-400 pl-4 py-2">
                    <p className="font-medium text-slate-800">{proj.name}</p>
                    {proj.description && <p className="text-sm text-slate-600 mt-1">{proj.description}</p>}
                    {proj.tech_stack?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {proj.tech_stack.map((t, j) => (
                          <span key={j} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{t}</span>
                        ))}
                      </div>
                    )}
                    {proj.outcome && (
                      <p className="text-sm text-emerald-600 mt-1">
                        <CheckCircle className="w-3.5 h-3.5 inline mr-1" />{proj.outcome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Skill Gap Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-slate-200 p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-slate-800">Skill Gap Analysis</h3>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Full Stack Developer, Data Scientist..."
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
              <button
                onClick={runGapAnalysis}
                disabled={gapLoading || !targetRole.trim()}
                className={`px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-all
                  ${gapLoading || !targetRole.trim()
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
              >
                {gapLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                Analyze
              </button>
            </div>

            {gapResult && (
              <div className="space-y-5">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Match for "{gapResult.target_role}"</p>
                    <p className="text-xs text-slate-500 capitalize mt-1">Readiness: {gapResult.career_readiness || 'developing'}</p>
                  </div>
                  <div className={`text-2xl font-bold ${
                    (gapResult.match_percentage || 0) >= 70 ? 'text-emerald-600' :
                    (gapResult.match_percentage || 0) >= 40 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {gapResult.match_percentage || 0}%
                  </div>
                </div>

                {gapResult.matched_skills?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 mb-2">Skills You Have ({gapResult.matched_skills.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {gapResult.matched_skills.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm border border-emerald-200">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {gapResult.missing_skills?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-red-600 mb-2">Skills to Learn ({gapResult.missing_skills.length})</p>
                    <div className="space-y-2">
                      {gapResult.missing_skills.map((gap, i) => (
                        <div key={i} className="flex items-start justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                          <div>
                            <span className="text-sm font-medium text-slate-800">{gap.skill_name}</span>
                            {gap.suggestion && <p className="text-xs text-slate-600 mt-1">{gap.suggestion}</p>}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            gap.importance === 'critical' ? 'bg-red-200 text-red-700' :
                            gap.importance === 'important' ? 'bg-amber-200 text-amber-700' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {gap.importance}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {gapResult.top_recommendations?.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Recommendations</p>
                    {gapResult.top_recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 py-1">
                        <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-600">{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {opikEval && (
        <OpikEvalPopup
          evaluation={opikEval}
          agentName="Skill Gap Analysis"
          onClose={() => setOpikEval(null)}
        />
      )}
    </div>
  );
};

export default YourCareer;
