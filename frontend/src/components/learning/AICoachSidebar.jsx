import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Bot, User, Sparkles, Lightbulb, HelpCircle } from 'lucide-react';
import { llmGenerate } from '../../api';

const AICoachSidebar = ({ topic, currentStep, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm your AI learning coach. I'm here to help you understand "${currentStep?.step_title || topic}". Ask me anything!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestedQuestions = [
    { icon: HelpCircle, text: 'Explain this concept simply' },
    { icon: Lightbulb, text: 'Give me a real-world example' },
    { icon: Sparkles, text: 'What should I focus on?' },
  ];

  const handleSend = async (text = input) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = `You are a helpful AI tutor assisting a student learning about "${topic}". 
        They are currently on the step: "${currentStep?.step_title || 'unknown'}".
        Be concise, friendly, and educational. Use examples when helpful.
        Keep responses under 150 words unless they ask for more detail.`;

      const response = await llmGenerate(text, systemPrompt);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.response || response.content || "I'm here to help! Could you rephrase your question?",
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment!",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-96 flex-shrink-0 border-l border-gray-800 bg-gray-900/95 backdrop-blur-xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">AI Coach</h3>
            <p className="text-xs text-gray-500">Here to help you learn</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`
              flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
              ${message.role === 'user' 
                ? 'bg-purple-500' 
                : 'bg-gradient-to-br from-blue-500 to-purple-500'}
            `}>
              {message.role === 'user' 
                ? <User className="w-4 h-4 text-white" />
                : <Bot className="w-4 h-4 text-white" />
              }
            </div>
            <div className={`
              max-w-[80%] p-3 rounded-2xl text-sm
              ${message.role === 'user'
                ? 'bg-purple-500/20 text-white rounded-tr-sm'
                : 'bg-gray-800 text-gray-200 rounded-tl-sm'}
            `}>
              {message.content}
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-800 p-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, delay: i * 0.2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-gray-500"
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q.text)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-full text-xs text-gray-400 hover:text-white transition-colors"
              >
                <q.icon className="w-3 h-3" />
                {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-purple-500/50 transition-colors"
          />
          <motion.button
            type="submit"
            disabled={!input.trim() || isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              p-2.5 rounded-xl transition-all
              ${input.trim() && !isLoading
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
            `}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default AICoachSidebar;
