import { motion } from "framer-motion";
import { Twitter, Linkedin, Github, Mail } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

const Footer = () => {
  const { isDarkMode } = useTheme();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <motion.footer 
      className={`pt-16 pb-8 ${
        isDarkMode 
          ? 'bg-gray-900 text-gray-100 shadow-2xl shadow-gray-950/50'
          : 'bg-white text-gray-900 shadow-2xl shadow-gray-900/10'
      } border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <motion.div 
          className="flex flex-col md:flex-row md:justify-between md:items-start space-y-8 md:space-y-0"
          variants={containerVariants}
        >
          {/* Left Section - Logo and Socials */}
          <motion.div 
            className="space-y-6"
            variants={itemVariants}
          >
            <div className="flex items-center space-x-3">
              <motion.img
                src="/logo.svg"
                alt="Logo"
                className="h-20 w-auto object-contain"
                style={{
                  filter: isDarkMode 
                    ? 'none' 
                    : 'brightness(0) saturate(100%) invert(23%) sepia(94%) saturate(1352%) hue-rotate(88deg) brightness(97%) contrast(101%)'
                }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {/* Social Links */}
            <div className="flex space-x-4">
              <SocialLink icon={<Twitter className="w-5 h-5" />} href="https://twitter.com" isDarkMode={isDarkMode} />
              <SocialLink icon={<Linkedin className="w-5 h-5" />} href="https://linkedin.com" isDarkMode={isDarkMode} />
              <SocialLink icon={<Github className="w-5 h-5" />} href="https://github.com" isDarkMode={isDarkMode} />
              <SocialLink icon={<Mail className="w-5 h-5" />} href="mailto:contact@ethicalnode.com" isDarkMode={isDarkMode} />
            </div>
          </motion.div>

          {/* Right Section - Description */}
          <motion.div 
            className="max-w-md"
            variants={itemVariants}
          >
            <p className={`text-sm leading-relaxed ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              We have developed this protocol with the aim of providing a comprehensive solution for Shariah screening and proof-of-stake services, catering to the needs of Muslim worldwide. Our goal is to ensure a seamless, dependable, and secure process, enhancing comfort and reliability.
            </p>
          </motion.div>
        </motion.div>

        {/* Bottom Section */}
        <motion.div 
          className={`pt-8 mt-8 border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          } text-left`}
          variants={itemVariants}
        >
          <div className={`text-sm ${
            isDarkMode ? 'text-gray-500' : 'text-gray-500'
          }`}>
            © 2025 EthicalNode. All rights reserved.
          </div>
        </motion.div>
      </div>
    </motion.footer>
  );
};

interface SocialLinkProps {
  icon: React.ReactNode;
  href: string;
  isDarkMode: boolean;
}

const SocialLink = ({ icon, href, isDarkMode }: SocialLinkProps) => (
  <motion.a
    href={href}
    className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors duration-200 ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`}
    whileHover={{ scale: 1.1 }}
    transition={{ duration: 0.2 }}
  >
    {icon}
  </motion.a>
);

export default Footer;
