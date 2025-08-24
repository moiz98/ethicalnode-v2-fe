import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Newsletter: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Newsletter subscription:', email);
    setEmail('');
  };

  return (
    <section 
      id="newsletter" 
      className={`py-20 px-4 ${
        isDarkMode 
          ? 'bg-gray-900' 
          : 'bg-gray-50'
      }`}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Icon */}
          <motion.div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8 ${
              isDarkMode 
                ? 'bg-teal-600/20 text-teal-400' 
                : 'bg-teal-100 text-teal-600'
            }`}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Mail className="w-8 h-8" />
          </motion.div>

          {/* Title */}
          <h2 className={`text-3xl font-bold mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Stay Updated with Halal Crypto
          </h2>

          {/* Description */}
          <p className={`text-lg mb-8 max-w-2xl mx-auto ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Get the latest updates on Shariah-compliant staking opportunities, new network additions, and Islamic finance insights.
          </p>

          {/* Email Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={`flex-1 px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              required
            />
            <motion.button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Subscribe
            </motion.button>
          </motion.form>

          {/* Privacy Notice */}
          <p className={`text-sm mt-4 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-500'
          }`}>
            No spam, unsubscribe at any time. We respect your privacy.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Newsletter;
