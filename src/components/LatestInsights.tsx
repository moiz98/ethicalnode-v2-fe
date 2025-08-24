import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getRecentPosts } from '../pages/landing/blogData';

const LatestInsights: React.FC = () => {
  const { isDarkMode } = useTheme();
  const blogPosts = getRecentPosts(3);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.215, 0.61, 0.355, 1] as const
      }
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'education':
        return isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700';
      case 'analysis':
        return isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700';
      case 'research':
        return isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700';
      default:
        return isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <section 
      id="latest-insights" 
      className={`py-20 px-4 ${
        isDarkMode 
          ? 'bg-gray-900' 
          : 'bg-white'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className={`text-4xl font-bold mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Latest Insights
          </h2>
          <p className={`text-lg max-w-3xl mx-auto ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Stay informed with our research on Islamic finance and blockchain technology
          </p>
        </motion.div>

        {/* Blog Posts Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {blogPosts.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`}>
              <motion.article
                variants={cardVariants}
                className={`relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg group cursor-pointer ${
                  isDarkMode 
                    ? 'bg-gray-800/80 border-gray-700 hover:border-gray-600' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
                whileHover={{ y: -5 }}
              >
              {/* Category & Date */}
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(post.category)}`}>
                  {post.category}
                </span>
                <div className={`flex items-center text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <Calendar className="w-4 h-4 mr-1" />
                  {post.date}
                </div>
              </div>

              {/* Title */}
              <h3 className={`text-xl font-semibold mb-3 line-clamp-2 group-hover:text-teal-600 transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {post.title}
              </h3>

              {/* Excerpt */}
              <p className={`text-sm leading-relaxed mb-6 line-clamp-3 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {post.excerpt}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  {post.readTime}
                </span>
                <div className={`flex items-center text-sm font-medium transition-colors group-hover:text-teal-600 ${
                  isDarkMode ? 'text-teal-400' : 'text-teal-600'
                }`}>
                  Read More
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </motion.article>
            </Link>
          ))}
        </motion.div>

        {/* View All Articles Button */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Link to="/blogs">
            <motion.button
              className={`inline-flex items-center px-6 py-3 rounded-lg border font-medium transition-colors duration-200 ${
                isDarkMode 
                  ? 'border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white' 
                  : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View All Articles
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default LatestInsights;
