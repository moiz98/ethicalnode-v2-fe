import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { blogPosts, categories, getPostsByCategory, searchPosts } from './blogData';
import { useTheme } from '../../contexts/ThemeContext';

const Blogs: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredPosts = useMemo(() => {
    let posts = blogPosts;
    
    if (selectedCategory !== 'All') {
      posts = getPostsByCategory(selectedCategory);
    }
    
    if (searchQuery.trim()) {
      posts = searchPosts(searchQuery);
    }
    
    return posts;
  }, [selectedCategory, searchQuery]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery(''); // Clear search when changing category
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className={`min-h-screen pt-20 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Hero Section */}
      <section className={`relative ${
        isDarkMode 
          ? "bg-gray-900" 
          : "bg-white"
      } pt-24 pb-16 lg:pt-32 lg:pb-24`}>
        {/* Grid Background */}
        <div className="absolute inset-0">
          <svg 
            className="absolute inset-0 w-full h-full opacity-[0.15]" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <pattern 
              id="grid" 
              width="40" 
              height="40" 
              patternUnits="userSpaceOnUse"
            >
              <path 
                d="M 40 0 L 0 0 0 40" 
                fill="none" 
                stroke="rgb(34, 197, 94)" 
                strokeWidth="1"
              />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <motion.div
            className={`inline-flex items-center gap-2 ${
              isDarkMode 
                ? "bg-gray-800/80 border-green-500/30" 
                : "bg-white/80 border-green-200"
            } backdrop-blur-sm border rounded-full px-4 py-2 text-sm font-medium ${
              isDarkMode ? "text-gray-200" : "text-gray-700"
            } shadow-sm mb-8`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Islamic Finance Insights
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className={`text-4xl md:text-6xl font-bold mb-6 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Latest Insights
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`text-xl max-w-3xl mx-auto ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Discover Shariah-compliant insights on cryptocurrency, blockchain technology, and Islamic finance
          </motion.p>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className={`py-12 border-b ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            {/* Search Bar */}
            <div className="w-full md:w-96">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full px-4 py-3 pl-10 rounded-lg border focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode
                      ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  }`}
                />
                <svg 
                  className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {['All', ...categories].map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-green-600 text-white'
                      : isDarkMode
                      ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-green-900/20 hover:text-green-300'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <svg className={`mx-auto h-24 w-24 mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className={`text-xl font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No articles found</h3>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredPosts.map((post) => (
                <motion.article 
                  key={post.id}
                  variants={cardVariants}
                  className={`rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden group ${
                    isDarkMode ? 'bg-gray-800' : 'bg-white'
                  }`}
                >
                  <div className="p-6">
                    {/* Category Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        post.category === 'Education' 
                          ? isDarkMode 
                            ? 'bg-green-900 text-green-300' 
                            : 'bg-green-100 text-green-800'
                          : post.category === 'Analysis'
                          ? isDarkMode 
                            ? 'bg-blue-900 text-blue-300' 
                            : 'bg-blue-100 text-blue-800'
                          : isDarkMode 
                            ? 'bg-purple-900 text-purple-300' 
                            : 'bg-purple-100 text-purple-800'
                      }`}>
                        {post.category}
                      </span>
                      {post.featured && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          isDarkMode 
                            ? 'bg-yellow-900 text-yellow-300' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          Featured
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className={`text-xl font-bold mb-3 transition-colors group-hover:text-green-600 ${
                      isDarkMode 
                        ? 'text-white group-hover:text-green-400' 
                        : 'text-gray-900 group-hover:text-green-600'
                    }`}>
                      <Link to={`/blog/${post.slug}`} className="line-clamp-2">
                        {post.title}
                      </Link>
                    </h2>

                    {/* Excerpt */}
                    <p className={`mb-4 line-clamp-3 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {post.excerpt}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span 
                          key={tag}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            isDarkMode 
                              ? 'bg-gray-700 text-gray-300' 
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          isDarkMode 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          +{post.tags.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className={`flex items-center justify-between text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <div className="flex items-center space-x-4">
                        <span>{post.date}</span>
                        <span>•</span>
                        <span>{post.readTime}</span>
                      </div>
                      <Link 
                        to={`/blog/${post.slug}`}
                        className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
                      >
                        Read more →
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Blogs;
