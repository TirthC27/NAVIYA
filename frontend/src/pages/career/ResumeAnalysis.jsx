import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  X,
  Loader2,
  Bot,
  Image,
  FileType
} from 'lucide-react';
import { useDashboardState } from '../../context/DashboardStateContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// Supported file types (matching backend DocumentIngestionService)
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.png', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'image/png',
  'image/jpeg'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ResumeAnalysis = () => {
  const [analysis, setAnalysis] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsingStatus, setParsingStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [extractionInfo, setExtractionInfo] = useState(null);
  
  // Get dashboard state for user ID and to check if resume is ready
  const { state: dashboardState, refresh: refreshDashboard } = useDashboardState();
  
  // Get user ID - parse localStorage safely
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

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!userId) return;
      
      try {
        const response = await fetch(`${API_BASE}/api/resume/analysis/${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.analysis) {
            setAnalysis(data.analysis);
          }
        }
      } catch (err) {
        console.error('Failed to fetch analysis:', err);
      }
    };

    fetchAnalysis();
  }, [userId, dashboardState?.resume_ready]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  // Validate file before upload
  const validateFile = (selectedFile) => {
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
    
    // Check extension
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { 
        valid: false, 
        error: `File type "${ext}" is not supported. Please upload PDF, DOCX, DOC, TXT, PNG, or JPG files.`
      };
    }
    
    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
      };
    }
    
    if (selectedFile.size === 0) {
      return { valid: false, error: 'File is empty.' };
    }
    
    return { valid: true };
  };

  // Get file type icon and info
  const getFileTypeInfo = (filename) => {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    switch (ext) {
      case '.pdf':
        return { icon: FileText, label: 'PDF Document', color: 'text-red-500' };
      case '.docx':
      case '.doc':
        return { icon: FileType, label: 'Word Document', color: 'text-blue-500' };
      case '.txt':
        return { icon: FileText, label: 'Text File', color: 'text-slate-500' };
      case '.png':
      case '.jpg':
      case '.jpeg':
        return { icon: Image, label: 'Image (OCR)', color: 'text-purple-500' };
      default:
        return { icon: FileText, label: 'Document', color: 'text-slate-500' };
    }
  };

  const handleFile = async (selectedFile) => {
    // Validate userId first
    if (!userId) {
      setError('User session not found. Please log in again.');
      return;
    }
    
    // Validate file
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setFile(selectedFile);
    setUploading(true);
    setError(null);
    setWarnings([]);
    setAnalysis(null);
    setExtractionInfo(null);

    try {
      console.log('📤 Uploading file to backend:', selectedFile.name, `(${(selectedFile.size / 1024).toFixed(1)}KB)`);
      
      // Check if it's an image - show OCR warning
      const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        setWarnings(['OCR will be used to extract text from this image. For best results, ensure the image is clear and well-lit.']);
      }
      
      // Send file directly to new upload endpoint
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API_BASE}/api/resume/upload-file/${userId}`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Upload failed:', result);
        throw new Error(result.detail || 'Upload failed');
      }

      console.log('✅ Upload result:', result);

      // Store extraction info
      if (result.extraction) {
        setExtractionInfo(result.extraction);
      }
      
      // Store warnings from server
      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
      }

      setUploading(false);
      setParsing(true);
      setParsingStatus('Analyzing resume content...');
      
      // Poll for analysis result
      let attempts = 0;
      const maxAttempts = 90; // 90 seconds max for OCR processing
      
      console.log('🔄 Starting to poll for analysis result...');
      
      while (attempts < maxAttempts) {
        setParsingProgress(Math.min(95, (attempts / maxAttempts) * 100));
        
        // Update status message
        if (attempts < 10) {
          setParsingStatus('Extracting information from resume...');
        } else if (attempts < 30) {
          setParsingStatus('AI is analyzing your skills and experience...');
        } else if (attempts < 60) {
          setParsingStatus('Generating recommendations...');
        } else {
          setParsingStatus('Almost done...');
        }
        
        const analysisResponse = await fetch(`${API_BASE}/api/resume/analysis/${userId}`);
        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          console.log(`📊 Poll attempt ${attempts + 1}:`, analysisData.has_analysis);
          
          if (analysisData && analysisData.analysis && analysisData.has_analysis) {
            console.log('✅ Analysis found!');
            setAnalysis(analysisData.analysis);
            setParsingProgress(100);
            setParsingStatus('Analysis complete!');
            setParsing(false);
            
            // Refresh dashboard state to reflect resume_ready
            if (refreshDashboard) {
              refreshDashboard();
            }
            return;
          }
        }
        
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
      }
      
      // Timeout - show partial success
      setParsing(false);
      setError('Analysis is taking longer than expected. Please refresh the page in a moment.');
      
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Failed to upload resume');
      setUploading(false);
      setParsing(false);
    }
  };

  // Handle text paste upload (fallback)
  const handleTextUpload = async (text) => {
    if (!userId) {
      setError('User session not found. Please log in again.');
      return;
    }
    
    if (!text || text.trim().length < 50) {
      setError('Please enter at least 50 characters of resume text.');
      return;
    }
    
    // Create a text blob and use the same upload flow
    const blob = new Blob([text], { type: 'text/plain' });
    const file = new File([blob], 'resume.txt', { type: 'text/plain' });
    await handleFile(file);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold text-slate-800">Resume Analysis</h1>
        <p className="text-slate-500 mt-1">AI-powered resume review and optimization</p>
      </motion.div>

      {/* Warnings Display */}
      {warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-700 font-medium">Notice</p>
              {warnings.map((warning, idx) => (
                <p key={idx} className="text-yellow-600 text-sm">{warning}</p>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-700 font-medium">Upload Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Upload Section */}
      {!parsing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <div
            className={`bg-white rounded-xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer
              ${dragActive ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
            />
            
            {uploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                <p className="text-slate-700 font-medium">Uploading & extracting text...</p>
                {file && (
                  <p className="text-sm text-slate-500 mt-2">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-medium text-slate-800 mb-2">
                  {analysis ? 'Upload a new resume' : 'Upload Your Resume'}
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  Drag & drop your resume here, or click to browse
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">PDF</span>
                  <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">DOCX</span>
                  <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">DOC</span>
                  <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">TXT</span>
                  <span className="px-2 py-1 bg-purple-100 rounded text-purple-600">PNG/JPG (OCR)</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Maximum file size: 10MB</p>
              </>
            )}
          </div>
          
          {/* Text Paste Alternative */}
          <div className="mt-4 bg-white rounded-xl border border-slate-200 p-6">
            <h4 className="font-medium text-slate-700 mb-3">Or paste your resume text directly:</h4>
            <textarea
              id="resume-text-input"
              className="w-full h-40 p-4 border border-slate-200 rounded-lg text-sm font-mono resize-none focus:outline-none focus:border-amber-400"
              placeholder="Paste your resume text here..."
            />
            <button
              onClick={() => {
                const text = document.getElementById('resume-text-input').value;
                handleTextUpload(text);
              }}
              disabled={uploading || parsing}
              className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Analyze Resume Text
            </button>
          </div>
        </motion.div>
      )}

      {/* Parsing Progress */}
      {parsing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 p-8 mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <Bot className="w-6 h-6 text-slate-600 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Analyzing Resume</h3>
              <p className="text-sm text-slate-500">{parsingStatus || 'Processing your document...'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{parsingStatus}</span>
              <span className="text-slate-500">{Math.round(parsingProgress)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <motion.div 
                className="bg-amber-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${parsingProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {extractionInfo && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>
                  Text extracted ({extractionInfo.word_count} words, {extractionInfo.confidence} confidence)
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Analysis Results */}
      {analysis && !parsing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-500">Overall Score</span>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-bold ${getScoreColor(analysis.overall_score || 0)}`}>
                  {analysis.overall_score || 0}
                </span>
                <span className="text-slate-400 mb-1">/100</span>
              </div>
              <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${analysis.overall_score || 0}%` }} 
                />
              </div>
            </div>

            {/* Quality Scores from backend */}
            {analysis.quality_scores && Object.entries(analysis.quality_scores).slice(0, 2).map(([key, value]) => (
              <div key={key} className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-500">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-4xl font-bold ${getScoreColor(value || 0)}`}>
                    {value || 0}
                  </span>
                  <span className="text-slate-400 mb-1">/100</span>
                </div>
                <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${value || 0}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Extracted Data - Skills */}
          {analysis.extracted_data?.skills && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Extracted Skills</h3>
              <div className="space-y-4">
                {Object.entries(analysis.extracted_data.skills).filter(([_, skills]) => skills?.length > 0).map(([category, skills]) => (
                  <div key={category}>
                    <p className="text-sm text-slate-500 mb-2 capitalize">{category.replace(/_/g, ' ')}</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-yellow-50 text-yellow-700 text-sm rounded-lg border border-yellow-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Elements */}
          {analysis.missing_elements?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Areas to Improve</h3>
              <div className="space-y-3">
                {analysis.missing_elements.map((element, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">{element}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Recommendations</h3>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confidence Level */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">Analysis Confidence</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              analysis.confidence_level === 'high' ? 'bg-green-100 text-green-700' :
              analysis.confidence_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {analysis.confidence_level || 'medium'}
            </span>
          </div>

          {/* Agent Info */}
          <div className="flex items-center gap-3 bg-slate-100 rounded-lg px-4 py-3">
            <Bot className="w-5 h-5 text-slate-500" />
            <p className="text-sm text-slate-600">
              Analysis performed by ResumeIntelligenceAgent. Results are AI-generated and should be reviewed.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ResumeAnalysis;
