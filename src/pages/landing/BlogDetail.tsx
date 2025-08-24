import React, { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { getPostBySlug, getRecentPosts } from './blogData';
import { useTheme } from '../../contexts/ThemeContext';

const BlogDetail: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { slug } = useParams<{ slug: string }>();
  const [copySuccess, setCopySuccess] = useState(false);

  const post = slug ? getPostBySlug(slug) : null;
  const recentPosts = getRecentPosts(3);

  if (!post) {
    return <Navigate to="/blogs" replace />;
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleTwitterShare = () => {
    const text = `Check out this article: ${post.title}`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-16">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <main className="lg:col-span-3">
            {/* Breadcrumb */}
            <nav className="mb-8">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <Link 
                    to="/" 
                    className={`hover:text-green-500 transition-colors ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    Home
                  </Link>
                </li>
                <li className={isDarkMode ? 'text-gray-600' : 'text-gray-400'}>/</li>
                <li>
                  <Link 
                    to="/blogs" 
                    className={`hover:text-green-500 transition-colors ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    Blogs
                  </Link>
                </li>
                <li className={isDarkMode ? 'text-gray-600' : 'text-gray-400'}>/</li>
                <li className={`font-medium ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  {post.title}
                </li>
              </ol>
            </nav>

            {/* Article */}
            <article>
              <header className="mb-8">
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    isDarkMode 
                      ? 'bg-green-900 text-green-300' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {post.category}
                  </span>
                </div>
                
                <h1 className={`text-4xl md:text-5xl font-bold mb-6 leading-tight ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {post.title}
                </h1>

                <div className={`flex items-center justify-between mb-6 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <div className="flex items-center space-x-4">
                    <span>{post.author}</span>
                    <span>•</span>
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>

                <p className={`text-xl leading-relaxed ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {/* {post.excerpt} */}
                </p>
              </header>

              <div 
                className={`prose max-w-none mb-12 ${
                  isDarkMode ? 'prose-invert' : ''
                }`}
                style={{
                  color: isDarkMode ? '#e5e7eb' : '#374151'
                }}
              >
                <div 
                  className={`blog-content ${isDarkMode ? 'dark-content' : 'light-content'}`}
                  dangerouslySetInnerHTML={{ __html: post.content || '' }}
                />
              </div>

              {/* Share Buttons */}
              <div className={`flex items-center space-x-4 p-6 rounded-lg border-2 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <span className={`font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Share this article:
                </span>
                
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                    copySuccess 
                      ? 'bg-green-500 text-white' 
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                  </svg>
                  <span>{copySuccess ? 'Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  onClick={handleTwitterShare}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                    isDarkMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  <span>Share on Twitter</span>
                </button>
              </div>
            </article>
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Recent Posts */}
              <div className={`p-6 rounded-lg border-2 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <h3 className={`text-xl font-bold mb-6 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Recent Posts
                </h3>
                <div className="space-y-4">
                  {recentPosts.map((recentPost) => (
                    <div key={recentPost.slug}>
                      <Link
                        to={`/blog/${recentPost.slug}`}
                        className={`block group hover:transform hover:scale-105 transition-all duration-300 ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-white hover:shadow-md'
                        } p-3 rounded-lg`}
                      >
                        <h4 className={`font-medium mb-2 group-hover:text-green-500 transition-colors ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                          {recentPost.title}
                        </h4>
                        <p className={`text-sm mb-2 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {recentPost.excerpt.substring(0, 80)}...
                        </p>
                        <span className={`text-xs ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          {recentPost.date}
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Newsletter Signup */}
              <div className={`p-6 rounded-lg border-2 mt-6 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-green-900 to-green-800 border-green-700' 
                  : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
              }`}>
                <h3 className={`text-xl font-bold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Stay Updated
                </h3>
                <p className={`text-sm mb-4 ${
                  isDarkMode ? 'text-green-100' : 'text-gray-600'
                }`}>
                  Subscribe to our newsletter for the latest insights on Islamic finance and DeFi.
                </p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500'
                    } focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50`}
                  />
                  <button className="w-full bg-green-500 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors duration-300">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BlogDetail;
