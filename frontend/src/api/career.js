import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// Career Profile API
// ============================================

export const getCareerProfile = async (userId) => {
  const response = await api.get(`/api/career/profile/${userId}`);
  return response.data;
};

export const createCareerProfile = async (profileData) => {
  const response = await api.post('/api/career/profile', profileData);
  return response.data;
};

export const updateCareerProfile = async (userId, profileData) => {
  const response = await api.put(`/api/career/profile/${userId}`, profileData);
  return response.data;
};

// ============================================
// Career Dashboard API
// ============================================

export const getDashboardData = async (userId) => {
  const response = await api.get(`/api/career/dashboard/${userId}`);
  return response.data;
};

export const getNextBestAction = async (userId) => {
  const response = await api.get(`/api/career/next-action/${userId}`);
  return response.data;
};

export const getAgentActivityFeed = async (userId, limit = 10) => {
  const response = await api.get(`/api/career/activity/${userId}?limit=${limit}`);
  return response.data;
};

// ============================================
// Career Roadmap API
// ============================================

export const getCareerRoadmap = async (userId) => {
  const response = await api.get(`/api/career/roadmap/${userId}`);
  return response.data;
};

export const generateCareerRoadmap = async (userId, careerGoal, experienceLevel) => {
  const response = await api.post('/api/career/roadmap/generate', {
    user_id: userId,
    career_goal: careerGoal,
    experience_level: experienceLevel
  });
  return response.data;
};

export const updateRoadmapPhase = async (phaseId, data) => {
  const response = await api.put(`/api/career/roadmap/phase/${phaseId}`, data);
  return response.data;
};

// ============================================
// Resume Analysis API
// ============================================

export const uploadResume = async (userId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);
  
  const response = await api.post('/api/career/resume/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getResumeAnalysis = async (userId) => {
  const response = await api.get(`/api/career/resume/analysis/${userId}`);
  return response.data;
};

export const getResumeHistory = async (userId) => {
  const response = await api.get(`/api/career/resume/history/${userId}`);
  return response.data;
};

// ============================================
// Skills Assessment API
// ============================================

export const getUserSkills = async (userId) => {
  const response = await api.get(`/api/career/skills/${userId}`);
  return response.data;
};

export const addUserSkill = async (userId, skillData) => {
  const response = await api.post(`/api/career/skills/${userId}`, skillData);
  return response.data;
};

export const getSkillAssessment = async (skillName, difficulty = 'medium') => {
  const response = await api.get(`/api/career/assessment/questions?skill=${skillName}&difficulty=${difficulty}`);
  return response.data;
};

export const submitAssessment = async (userId, assessmentData) => {
  const response = await api.post('/api/career/assessment/submit', {
    user_id: userId,
    ...assessmentData
  });
  return response.data;
};

export const getAssessmentHistory = async (userId) => {
  const response = await api.get(`/api/career/assessment/history/${userId}`);
  return response.data;
};

// ============================================
// Mock Interview API
// ============================================

export const startMockInterview = async (userId, role, difficulty, interviewType) => {
  const response = await api.post('/api/career/interview/start', {
    user_id: userId,
    role,
    difficulty,
    interview_type: interviewType
  });
  return response.data;
};

export const submitInterviewResponse = async (interviewId, questionIndex, response) => {
  const res = await api.post(`/api/career/interview/${interviewId}/respond`, {
    question_index: questionIndex,
    response
  });
  return res.data;
};

export const getInterviewFeedback = async (interviewId) => {
  const response = await api.get(`/api/career/interview/${interviewId}/feedback`);
  return response.data;
};

export const getInterviewHistory = async (userId) => {
  const response = await api.get(`/api/career/interview/history/${userId}`);
  return response.data;
};

// ============================================
// AI Mentor API
// ============================================

export const getMentorSessions = async (userId) => {
  const response = await api.get(`/api/career/mentor/sessions/${userId}`);
  return response.data;
};

export const createMentorSession = async (userId, topic) => {
  const response = await api.post('/api/career/mentor/session', {
    user_id: userId,
    topic
  });
  return response.data;
};

export const sendMentorMessage = async (sessionId, message) => {
  const response = await api.post(`/api/career/mentor/session/${sessionId}/message`, {
    message
  });
  return response.data;
};

export const getMentorSession = async (sessionId) => {
  const response = await api.get(`/api/career/mentor/session/${sessionId}`);
  return response.data;
};

// ============================================
// Available Skills List
// ============================================

export const getAvailableSkills = async () => {
  const response = await api.get('/api/career/skills/available');
  return response.data;
};

// ============================================
// Available Roles List
// ============================================

export const getAvailableRoles = async () => {
  const response = await api.get('/api/career/roles/available');
  return response.data;
};


// ============================================
// Scenario-Based Skill Assessment API
// ============================================

export const getAssessmentDomains = async () => {
  const response = await api.get('/api/skill-assessment/domains');
  return response.data;
};

export const startScenarioAssessment = async (userId, domain, skill) => {
  const response = await api.post('/api/skill-assessment/start', {
    user_id: userId, domain, skill
  });
  return response.data;
};

export const scoreScenarioActions = async (data) => {
  const response = await api.post('/api/skill-assessment/score', data);
  return response.data;
};

export const submitScenarioExplanation = async (data) => {
  const response = await api.post('/api/skill-assessment/explain', data);
  return response.data;
};

export const getScenarioHistory = async (userId) => {
  const response = await api.get(`/api/skill-assessment/history/${userId}`);
  return response.data;
};


export default {
  // Profile
  getCareerProfile,
  createCareerProfile,
  updateCareerProfile,
  
  // Dashboard
  getDashboardData,
  getNextBestAction,
  getAgentActivityFeed,
  
  // Roadmap
  getCareerRoadmap,
  generateCareerRoadmap,
  updateRoadmapPhase,
  
  // Resume
  uploadResume,
  getResumeAnalysis,
  getResumeHistory,
  
  // Skills
  getUserSkills,
  addUserSkill,
  getSkillAssessment,
  submitAssessment,
  getAssessmentHistory,
  
  // Interview
  startMockInterview,
  submitInterviewResponse,
  getInterviewFeedback,
  getInterviewHistory,
  
  // Mentor
  getMentorSessions,
  createMentorSession,
  sendMentorMessage,
  getMentorSession,
  
  // Lists
  getAvailableSkills,
  getAvailableRoles,

  // Scenario Assessment
  getAssessmentDomains,
  startScenarioAssessment,
  scoreScenarioActions,
  submitScenarioExplanation,
  getScenarioHistory
};
