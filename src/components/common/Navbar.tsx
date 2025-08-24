import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronRight, Sun, Moon } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();

  // Animation variants
  const navbarVariants = {
    hidden: { y: -100 },
    visible: {
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 20,
      },
    },
  };

  const linkVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (custom: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: custom * 0.1,
        duration: 0.5,
      },
    }),
  };

  const mobileMenuVariants = {
    closed: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
    open: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.2,
      },
    },
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [mobileMenuOpen]);

  // Handle scrolling to section when navigating with hash
  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      const timer = setTimeout(() => {
        const sectionId = location.hash.replace('#', '');
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100); // Small delay to ensure the page is rendered
      
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.hash]);

  // Remove handleNavClick, not needed for routing

  const handleNavClick = (href: string) => {
    // Close mobile menu if open
    setMobileMenuOpen(false);
    
    // If we're not on the homepage, navigate there first
    if (location.pathname !== '/') {
      navigate('/' + href);
      return;
    }
    
    // If we're on homepage, scroll to section
    const sectionId = href.replace('#', '');
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navLinks = [
    { name: "Halal Screener", href: "#halal-screener" },
    { name: "Networks", href: "#networks" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Blog", href: "#latest-insights" },
  ];

  return (
    <>
      <motion.nav
        className={`fixed w-full z-50 transition-all duration-500 ${
          scrolled 
            ? (isDarkMode ? "bg-gray-900/95 backdrop-blur-md" : "bg-white/95 backdrop-blur-md")
            : "bg-transparent"
        } ${
          scrolled 
            ? (isDarkMode 
                ? "shadow-lg shadow-gray-900/50" 
                : "shadow-lg shadow-gray-200/50"
              )
            : "shadow-none"
        }`}
        initial="hidden"
        animate="visible"
        variants={navbarVariants}
      >
        {/* Main Navbar Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo Section */}
            <Link to="/" className="flex items-center">
              <motion.div 
                className="flex items-center space-x-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.img
                  src="/logo.svg"
                  alt="Logo"
                  className="h-14 w-auto object-contain"
                  style={{
                    filter: isDarkMode 
                      ? 'none' 
                      : 'brightness(0) saturate(100%) invert(23%) sepia(94%) saturate(1352%) hue-rotate(88deg) brightness(97%) contrast(101%)'
                  }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </Link>

            {/* Desktop Navigation - Center */}
            <div className="hidden md:flex md:items-center md:space-x-8">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.name}
                  variants={linkVariants}
                  custom={index}
                  whileHover={{ y: -2 }}
                  className="relative"
                >
                  {link.href.startsWith('#') ? (
                    <button
                      onClick={() => handleNavClick(link.href)}
                      className={`relative px-3 py-2 text-sm font-medium transition-all duration-200 ${
                        isDarkMode ? "text-gray-300 hover:text-teal-400" : "text-gray-600 hover:text-teal-600"
                      }`}
                    >
                      {link.name}
                    </button>
                  ) : (
                    <Link
                      to={link.href}
                      className={`relative px-3 py-2 text-sm font-medium transition-all duration-200 ${
                        location.pathname === link.href
                          ? isDarkMode ? "text-teal-400" : "text-teal-600"
                          : isDarkMode ? "text-gray-300 hover:text-teal-400" : "text-gray-600 hover:text-teal-600"
                      }`}
                    >
                      {link.name}
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              {/* Theme Toggle */}
              <motion.button
                onClick={() => toggleTheme()}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  isDarkMode 
                    ? "text-gray-300 hover:text-white hover:bg-gray-800" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </motion.button>

              {/* Sign In Button */}
              <motion.button
                className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  isDarkMode 
                    ? "text-gray-300 hover:text-white" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign In
              </motion.button>

              {/* Start Staking Button */}
              <motion.button
                className="px-6 py-2 text-sm font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors duration-200"
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 4px 12px rgba(20, 184, 166, 0.3)"
                }}
                whileTap={{ scale: 0.95 }}
              >
                Start Staking
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden inline-flex items-center justify-center p-2 rounded-lg transition-colors duration-200 ${
                isDarkMode 
                  ? "text-gray-300 hover:text-white hover:bg-gray-800" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Menu className="block h-6 w-6" />
            </motion.button>
          </div>
        </div>
      </motion.nav>
      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial="closed"
            animate="open"
            exit="closed"
            variants={mobileMenuVariants}
          >
            {/* Backdrop */}
            <motion.div 
              className={`absolute inset-0 ${
                isDarkMode ? "bg-gray-900/95" : "bg-white/95"
              } backdrop-blur-lg`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Content */}
            <motion.div
              className="relative h-full flex flex-col"
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
            >
              {/* Header */}
              <motion.div 
                className="flex items-center justify-between p-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <motion.div className="flex items-center space-x-3">
                  <motion.img
                    src="/logo.svg"
                    alt="Logo"
                    className="h-8 w-auto object-contain"
                    style={{
                      filter: isDarkMode 
                        ? 'none' 
                        : 'brightness(0) saturate(100%) invert(23%) sepia(94%) saturate(1352%) hue-rotate(88deg) brightness(97%) contrast(101%)'
                    }}
                    whileHover={{ scale: 1.05 }}
                  />
                </motion.div>
                <motion.button
                  onClick={() => setMobileMenuOpen(false)}
                  className={`inline-flex items-center justify-center p-2 rounded-xl transition-colors duration-200 ${
                    isDarkMode 
                      ? "text-gray-300 hover:text-white hover:bg-gray-800" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="block h-6 w-6" />
                </motion.button>
              </motion.div>

              {/* Navigation Links */}
              <motion.div 
                className="flex-1 overflow-y-auto py-8 px-6"
                variants={linkVariants}
              >
                {navLinks.map((link, index) => (
                  <motion.div key={link.name} variants={linkVariants} custom={index} whileHover={{ x: 10 }}>
                    {link.href.startsWith('#') ? (
                      <button
                        onClick={() => handleNavClick(link.href)}
                        className={`group flex items-center w-full py-3 text-lg font-medium ${
                          index !== 0 ? "border-t border-gray-100 dark:border-gray-700" : ""
                        } ${
                          isDarkMode ? "text-gray-300 hover:text-teal-400" : "text-gray-600 hover:text-teal-600"
                        }`}
                      >
                        <span>{link.name}</span>
                        <ChevronRight className="ml-auto w-6 h-6 transform group-hover:translate-x-1 transition-transform duration-200" />
                      </button>
                    ) : (
                      <Link
                        to={link.href}
                        className={`group flex items-center w-full py-3 text-lg font-medium ${
                          index !== 0 ? "border-t border-gray-100 dark:border-gray-700" : ""
                        } ${
                          location.pathname === link.href
                            ? isDarkMode ? "text-teal-400" : "text-teal-600"
                            : isDarkMode ? "text-gray-300 hover:text-teal-400" : "text-gray-600 hover:text-teal-600"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span>{link.name}</span>
                        <ChevronRight className="ml-auto w-6 h-6 transform group-hover:translate-x-1 transition-transform duration-200" />
                      </Link>
                    )}
                  </motion.div>
                ))}
              </motion.div>

              {/* Bottom Actions */}
              <motion.div 
                className={`p-6 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="space-y-3">
                  {/* Theme Toggle */}
                  <motion.button
                    onClick={() => toggleTheme()}
                    className={`w-full flex items-center justify-center py-3 text-lg font-medium rounded-xl transition-colors duration-200 ${
                      isDarkMode 
                        ? "text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700" 
                        : "text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isDarkMode ? (
                      <>
                        <Sun className="w-5 h-5 mr-2" />
                        Light Mode
                      </>
                    ) : (
                      <>
                        <Moon className="w-5 h-5 mr-2" />
                        Dark Mode
                      </>
                    )}
                  </motion.button>

                  {/* Sign In Button */}
                  <motion.button
                    className={`w-full py-3 text-lg font-medium rounded-xl transition-colors duration-200 ${
                      isDarkMode 
                        ? "text-gray-300 hover:text-white border border-gray-600 hover:bg-gray-800" 
                        : "text-gray-600 hover:text-gray-900 border border-gray-300 hover:bg-gray-50"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Sign In
                  </motion.button>

                  {/* Start Staking Button */}
                  <motion.button
                    className="w-full py-3 text-lg font-medium rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-colors duration-200"
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: "0 4px 12px rgba(20, 184, 166, 0.3)"
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Start Staking
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;