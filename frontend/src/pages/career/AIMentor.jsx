import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Send, 
  Lightbulb, 
  Target, 
  BookOpen, 
  Bot,
  User,
  Clock,
  Loader2
} from 'lucide-react';
import { getMentorSessions, createMentorSession, sendMentorMessage, getMentorSession } from '../../api/career';

const suggestedTopics = [
  'Help me choose between two job offers',
  'How do I negotiate a higher salary?',
  'What skills should I learn next?',
  'How to prepare for a career transition',
  'Tips for effective networking',
  'Building a personal brand'
];

// Mock conversation for demo
const mockInitialMessages = [
  {
    id: 1,
    role: 'assistant',
    content: `Hello! I'm your AI Career Mentor. I have access to your career profile, skills, roadmap progress, and assessment results to provide personalized guidance.

Based on your profile, I can see you're working toward becoming a Senior Frontend Developer. How can I help you today?`,
    timestamp: new Date().toISOString()
  }
];

const AIMentor = () => {
  const [messages, setMessages] = useState(mockInitialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const userId = 'current-user';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateMockResponse(inputValue);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      }]);
      setIsTyping(false);
    }, 1500);

    // Uncomment when backend is ready
    // try {
    //   const response = await sendMentorMessage(sessionId, inputValue);
    //   setMessages(prev => [...prev, response.message]);
    // } catch (err) {
    //   console.error('Failed to send message:', err);
    // } finally {
    //   setIsTyping(false);
    // }
  };

  const generateMockResponse = (userInput) => {
    const input = userInput.toLowerCase();
    
    if (input.includes('skill') || input.includes('learn')) {
      return `Based on your current skill profile and roadmap, I recommend focusing on these areas next:

1. **TypeScript** - You have beginner level. Advancing this will significantly boost your job prospects.

2. **Testing (Jest/RTL)** - This was flagged as a gap in your resume analysis. Most senior roles require strong testing skills.

3. **System Design** - Essential for senior positions and will help in technical interviews.

Would you like me to suggest specific resources or create a learning plan for any of these?`;
    }
    
    if (input.includes('interview') || input.includes('prepare')) {
      return `Great question! Based on your assessment scores and roadmap progress, here's a preparation strategy:

**Your Strengths to Highlight:**
- JavaScript (Advanced level)
- React.js (Intermediate, trending up)
- Problem-solving abilities

**Areas to Practice:**
- Your mock interview score was 76%. Focus on quantifying achievements.
- Practice the STAR method for behavioral questions.
- Review system design basics.

I can schedule more mock interviews or provide specific practice questions. What would be most helpful?`;
    }
    
    if (input.includes('salary') || input.includes('negotiate')) {
      return `For salary negotiation as a Frontend Developer, here are key strategies:

**Research First:**
- Your skill level and 12-month timeline suggest mid-level positions
- Research market rates on Glassdoor, Levels.fyi for your target role

**Leverage Your Profile:**
- Advanced JavaScript skills
- Completed foundational projects
- Strong assessment scores

**Tips:**
- Wait for them to mention a number first
- Counter with a range (top of your research + 10-15%)
- Emphasize continuous learning commitment

Want me to help you prepare specific talking points based on your skills?`;
    }
    
    return `That's a great question! Let me think about this in the context of your career goals.

Based on your profile showing you're targeting a Senior Frontend Developer role within 12 months, and considering your current skill levels, I'd suggest:

1. Continue building on your React and JavaScript strengths
2. Focus on the gaps identified in your resume analysis
3. Keep practicing with mock interviews to improve from your current 76% score

Is there a specific aspect you'd like me to dive deeper into?`;
  };

  const handleTopicClick = (topic) => {
    setInputValue(topic);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col bg-slate-50 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h1 className="text-2xl font-semibold text-slate-800">AI Career Mentor</h1>
        <p className="text-slate-500 mt-1">Get personalized career guidance</p>
      </motion.div>

      {/* Chat Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden"
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-slate-600" />
                  </div>
                )}
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-slate-800 text-white rounded-br-md'
                        : 'bg-slate-50 text-slate-700 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className={`text-xs text-slate-400 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-yellow-600" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-4">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-slate-600" />
                </div>
                <div className="bg-slate-50 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggested Topics (only show when few messages) */}
        {messages.length <= 2 && (
          <div className="px-6 py-3 border-t border-slate-100">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Lightbulb className="w-3 h-3" />
                <span>Suggested topics</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => handleTopicClick(topic)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-slate-100 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask your career mentor anything..."
                rows={1}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="px-4 py-3 bg-amber-400 text-slate-900 rounded-xl hover:bg-amber-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTyping ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center mt-2">
              MentorAgent has access to your career profile, skills, and assessment history
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AIMentor;
