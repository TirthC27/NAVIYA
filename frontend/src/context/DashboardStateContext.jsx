/**
 * Dashboard State Context & Hook
 * 
 * Single source of truth for UI rendering.
 * Uses Supabase realtime subscriptions for live updates.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { API_BASE_URL as API_BASE } from '../api/config';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase client for realtime
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ============================================
// Types
// ============================================

/**
 * @typedef {Object} DashboardState
 * @property {string} user_id
 * @property {string} current_phase
 * @property {boolean} resume_ready
 * @property {boolean} roadmap_ready
 * @property {boolean} skill_eval_ready
 * @property {boolean} interview_ready
 * @property {boolean} mentor_ready
 * @property {string|null} domain
 * @property {string|null} last_updated_by_agent
 * @property {string|null} updated_at
 * @property {number} features_unlocked
 */

/**
 * @typedef {Object} DashboardContextValue
 * @property {DashboardState|null} state
 * @property {boolean} loading
 * @property {string|null} error
 * @property {function} refresh
 * @property {function} canAccess
 * @property {string[]} unlockedFeatures
 */

// Default state
const DEFAULT_STATE = {
  user_id: '',
  current_phase: 'onboarding',
  resume_ready: false,
  roadmap_ready: false,
  skill_eval_ready: false,
  interview_ready: false,
  mentor_ready: true,
  domain: null,
  last_updated_by_agent: null,
  updated_at: null,
  features_unlocked: 0
};

// ============================================
// Context
// ============================================

const DashboardStateContext = createContext(null);

// ============================================
// Provider Component
// ============================================

export function DashboardStateProvider({ children, userId }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Reset state when user switches (prevents stale cross-user data)
  useEffect(() => {
    setState(null);
    setLoading(true);
    setError(null);
    setLastUpdate(null);
  }, [userId]);

  // Fetch dashboard state from API
  const fetchState = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('[DashboardState] Fetching state for:', userId);
      const response = await fetch(`${API_BASE}/api/dashboard-state/${userId}`);
      
      if (!response.ok) {
        console.error('[DashboardState] API error:', response.status);
        throw new Error(`Failed to fetch dashboard state: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[DashboardState] Received:', data);
      
      if (data.success && data.state) {
        console.log('[DashboardState] Setting state, resume_ready:', data.state.resume_ready);
        setState(data.state);
        setLastUpdate(new Date().toISOString());
      } else {
        console.warn('[DashboardState] No state found, using default');
        setState({ ...DEFAULT_STATE, user_id: userId });
      }
    } catch (err) {
      console.error('[DashboardState] Error fetching:', err);
      setError(err.message);
      // Don't override if we already have state loaded
      setState(prev => prev || { ...DEFAULT_STATE, user_id: userId });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Setup realtime subscription
  useEffect(() => {
    if (!supabase || !userId) return;

    console.log('[DashboardState] Setting up realtime subscription for:', userId);

    const channel = supabase
      .channel(`dashboard_state:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'dashboard_state',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('[DashboardState] Realtime update:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newState = payload.new;
            
            // Calculate features unlocked
            const features_unlocked = 
              (newState.resume_ready ? 1 : 0) +
              (newState.roadmap_ready ? 1 : 0) +
              (newState.skill_eval_ready ? 1 : 0) +
              (newState.interview_ready ? 1 : 0);
            
            setState({
              ...newState,
              features_unlocked
            });
            
            setLastUpdate(new Date().toISOString());
            
            // Trigger subtle animation (can be used by components)
            window.dispatchEvent(new CustomEvent('dashboard-state-updated', {
              detail: {
                previous: state,
                current: newState,
                changedBy: newState.last_updated_by_agent
              }
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log('[DashboardState] Subscription status:', status);
      });

    // Cleanup
    return () => {
      console.log('[DashboardState] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, state]);

  // Check if user can access a feature
  const canAccess = useCallback((feature) => {
    if (!state) return feature === 'mentor';
    
    const featureMap = {
      mentor: state.mentor_ready,
      resume_analysis: state.resume_ready,
      roadmap: state.roadmap_ready,
      skill_assessment: state.skill_eval_ready,
      mock_interview: state.interview_ready
    };
    
    return featureMap[feature] ?? false;
  }, [state]);

  // Get list of unlocked features
  const unlockedFeatures = React.useMemo(() => {
    if (!state) return ['mentor'];
    
    const features = [];
    if (state.mentor_ready) features.push('mentor');
    if (state.resume_ready) features.push('resume_analysis');
    if (state.roadmap_ready) features.push('roadmap');
    if (state.skill_eval_ready) features.push('skill_assessment');
    if (state.interview_ready) features.push('mock_interview');
    
    return features;
  }, [state]);

  const contextValue = {
    state,
    loading,
    error,
    refresh: fetchState,
    canAccess,
    unlockedFeatures,
    lastUpdate
  };

  return (
    <DashboardStateContext.Provider value={contextValue}>
      {children}
    </DashboardStateContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

/**
 * Hook to access dashboard state
 * @returns {DashboardContextValue}
 */
export function useDashboardState() {
  const context = useContext(DashboardStateContext);
  
  if (!context) {
    throw new Error('useDashboardState must be used within a DashboardStateProvider');
  }
  
  return context;
}

// ============================================
// Higher Order Component
// ============================================

/**
 * HOC to require a feature to be unlocked
 * Shows placeholder if feature is locked
 */
export function withFeatureGate(WrappedComponent, feature, PlaceholderComponent = null) {
  return function FeatureGatedComponent(props) {
    const { canAccess, loading } = useDashboardState();
    
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      );
    }
    
    if (!canAccess(feature)) {
      if (PlaceholderComponent) {
        return <PlaceholderComponent feature={feature} />;
      }
      
      return (
        <div className="bg-gray-100 rounded-xl p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Feature Locked</h3>
          <p className="text-gray-500">
            Complete previous steps to unlock this feature.
          </p>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
}

// ============================================
// Utility Components
// ============================================

/**
 * Component that only renders children if feature is unlocked
 */
export function FeatureGate({ feature, children, fallback = null }) {
  const { canAccess, loading } = useDashboardState();
  
  if (loading) return null;
  if (!canAccess(feature)) return fallback;
  
  return children;
}

/**
 * Component that shows loading skeleton while dashboard state loads
 */
export function DashboardStateLoader({ children }) {
  const { loading } = useDashboardState();
  
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
      </div>
    );
  }
  
  return children;
}

export default DashboardStateContext;
