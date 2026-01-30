import axios from 'axios';

// Base API configuration
const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// Learning Plan API
// ============================================

/**
 * Get clarification questions for a topic
 */
export const getClarificationQuestions = async (topic) => {
  const response = await api.post('/api/clarify', { user_topic: topic });
  return response.data;
};

/**
 * Get available learning modes
 */
export const getLearningModes = async () => {
  const response = await api.get('/api/learning-modes');
  return response.data;
};

/**
 * Generate a learning plan
 */
export const generateLearningPlan = async (
  userTopic, 
  learningMode = 'standard',
  depthLevel = 1, 
  previousSteps = [],
  enableEvaluation = true
) => {
  const response = await api.post('/generate-learning-plan', {
    user_topic: userTopic,
    learning_mode: learningMode,
    depth_level: depthLevel,
    previous_steps: previousSteps,
    enable_evaluation: enableEvaluation
  });
  return response.data;
};

/**
 * Create a new plan in database
 */
export const createPlan = async (userId, topic, learningMode = 'standard', difficulty = 'medium') => {
  const response = await api.post('/api/plans/create', {
    user_id: userId,
    topic,
    learning_mode: learningMode,
    difficulty
  });
  return response.data;
};

/**
 * Add steps to a plan
 */
export const addStepsToPlan = async (planId, depthLevel, steps) => {
  const response = await api.post(`/api/plans/${planId}/steps/add`, {
    depth_level: depthLevel,
    steps
  });
  return response.data;
};

/**
 * Get a learning plan by ID
 */
export const getPlan = async (planId, userId = null) => {
  const params = userId ? `?user_id=${userId}` : '';
  const response = await api.get(`/api/plans/${planId}${params}`);
  return response.data;
};

/**
 * Get user's plans
 */
export const getUserPlans = async (userId = 'anonymous', limit = 10) => {
  const response = await api.get(`/api/plans/user/${userId}?limit=${limit}`);
  return response.data;
};

/**
 * Mark a step as completed
 */
export const completeStep = async (stepId, userId = null, watchTimeSeconds = 0) => {
  const response = await api.post(`/api/plans/steps/${stepId}/complete`, {
    user_id: userId,
    watch_time_seconds: watchTimeSeconds
  });
  return response.data;
};

/**
 * Generate deeper roadmap
 */
export const deepenRoadmap = async (userTopic, completedSteps, currentDepth, learningMode = 'standard') => {
  const response = await api.post('/roadmap/deepen', {
    user_topic: userTopic,
    completed_steps: completedSteps,
    current_depth: currentDepth,
    learning_mode: learningMode
  });
  return response.data;
};

// ============================================
// Feedback API
// ============================================

/**
 * Submit video feedback
 */
export const submitFeedback = async (videoId, rating, userId = null, comment = null) => {
  const response = await api.post(`/api/plans/videos/${videoId}/feedback`, {
    user_id: userId,
    rating,
    comment
  });
  return response.data;
};

/**
 * Get video feedback
 */
export const getVideoFeedback = async (videoId) => {
  const response = await api.get(`/api/plans/videos/${videoId}/feedback`);
  return response.data;
};

// ============================================
// Metrics & Observability API
// ============================================

/**
 * Get metrics summary
 */
export const getMetricsSummary = async () => {
  const response = await api.get('/api/metrics/summary');
  return response.data;
};

/**
 * Get full dashboard data
 */
export const getDashboard = async () => {
  const response = await api.get('/api/metrics/dashboard');
  return response.data;
};

/**
 * Get evaluation runs
 */
export const getEvalRuns = async (planId = null, limit = 50) => {
  const params = planId ? `?plan_id=${planId}&limit=${limit}` : `?limit=${limit}`;
  const response = await api.get(`/api/metrics/evals${params}`);
  return response.data;
};

/**
 * Get all feedback
 */
export const getAllFeedback = async (limit = 100) => {
  const response = await api.get(`/api/metrics/feedback?limit=${limit}`);
  return response.data;
};

/**
 * Get prompt versions
 */
export const getPromptVersions = async (promptName = null) => {
  const params = promptName ? `?prompt_name=${promptName}` : '';
  const response = await api.get(`/api/metrics/prompts${params}`);
  return response.data;
};

// ============================================
// Safety API
// ============================================

/**
 * Check content safety
 */
export const checkSafety = async (content, checkType = 'all') => {
  const response = await api.post('/api/safety/check', {
    content,
    check_type: checkType
  });
  return response.data;
};

/**
 * Get safety metrics
 */
export const getSafetyMetrics = async () => {
  const response = await api.get('/api/safety/metrics');
  return response.data;
};

// ============================================
// Health & Utility
// ============================================

/**
 * Health check
 */
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

/**
 * LLM generate (direct)
 */
export const llmGenerate = async (prompt, systemPrompt = null) => {
  const response = await api.post('/api/llm/generate', {
    prompt,
    system_prompt: systemPrompt
  });
  return response.data;
};

export default api;
