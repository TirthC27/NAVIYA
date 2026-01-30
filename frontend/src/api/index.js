import axios from 'axios';

// Base API configuration
const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Generate a progressive learning plan for a topic
 * @param {string} userTopic - The topic to learn
 * @param {number} depthLevel - Current depth level (1, 2, or 3)
 * @param {Array} previousSteps - Previously completed steps
 * @returns {Promise} - Learning plan data with single video per step
 */
export const generateLearningPlan = async (userTopic, depthLevel = 1, previousSteps = []) => {
  try {
    const response = await api.post('/generate-learning-plan', {
      user_topic: userTopic,
      depth_level: depthLevel,
      previous_steps: previousSteps,
    });
    return response.data;
  } catch (error) {
    console.error('Error generating learning plan:', error);
    throw error;
  }
};

/**
 * Mark a learning step as completed
 * @param {string} planId - The plan ID
 * @param {number} stepNumber - The step number to mark complete
 * @param {string} userId - Optional user ID
 * @returns {Promise} - Completion response with progress info
 */
export const completeStep = async (planId, stepNumber, userId = 'anonymous') => {
  try {
    const response = await api.post('/step/complete', {
      plan_id: planId,
      step_number: stepNumber,
      user_id: userId,
    });
    return response.data;
  } catch (error) {
    console.error('Error completing step:', error);
    throw error;
  }
};

/**
 * Generate a deeper roadmap after completing current level
 * @param {string} userTopic - The original topic
 * @param {Array} completedSteps - All completed step titles
 * @param {number} currentDepth - Current depth level
 * @returns {Promise} - Next level learning plan
 */
export const deepenRoadmap = async (userTopic, completedSteps, currentDepth) => {
  try {
    const response = await api.post('/roadmap/deepen', {
      user_topic: userTopic,
      completed_steps: completedSteps,
      current_depth: currentDepth,
    });
    return response.data;
  } catch (error) {
    console.error('Error deepening roadmap:', error);
    throw error;
  }
};

/**
 * Save a learning plan to database
 * @param {object} planData - The plan data to save
 * @returns {Promise} - Saved plan response
 */
export const saveLearningPlan = async (planData) => {
  try {
    const response = await api.post('/api/plans/save', planData);
    return response.data;
  } catch (error) {
    console.error('Error saving learning plan:', error);
    throw error;
  }
};

/**
 * Get all saved learning plans
 * @returns {Promise} - List of plans
 */
export const getSavedPlans = async () => {
  try {
    const response = await api.get('/api/plans');
    return response.data;
  } catch (error) {
    console.error('Error fetching plans:', error);
    throw error;
  }
};

/**
 * Health check
 * @returns {Promise} - Health status
 */
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Error checking health:', error);
    throw error;
  }
};

export default api;
