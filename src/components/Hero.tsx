import { motion } from "framer-motion";
import { Globe, Moon, Scale, Shield, TrendingUp, Users, BookOpen, Award } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const HeroSection = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`relative w-full min-h-screen ${
      isDarkMode 
        ? "bg-gray-900" 
        : "bg-white"
    } overflow-hidden`}>
      {/* Grid Background */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
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
              stroke={isDarkMode ? "rgb(34, 197, 94)" : "rgb(34, 197, 94)"} 
              strokeWidth="1"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Floating Orbs with Green Accents */}
        <motion.div 
          className={`absolute top-20 left-20 w-32 h-32 ${
            isDarkMode ? "bg-green-400/10" : "bg-green-400/20"
          } rounded-full blur-xl`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className={`absolute bottom-20 right-20 w-40 h-40 ${
            isDarkMode ? "bg-teal-400/10" : "bg-teal-400/20"
          } rounded-full blur-xl`}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div 
          className={`absolute top-1/2 left-10 w-24 h-24 ${
            isDarkMode ? "bg-emerald-400/8" : "bg-emerald-400/15"
          } rounded-full blur-lg`}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Crescent - Shariah Faith - Left Side */}
        <motion.div
          className={`absolute top-20 left-[5%] w-12 h-12 ${
            isDarkMode ? "bg-green-500/20" : "bg-green-100/80"
          } rounded-full flex items-center justify-center backdrop-blur-sm`}
          initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.5],
            x: [0, 20, -10, 0],
            y: [0, -30, 15, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.2, 0.8, 1],
          }}
        >
          <Moon className="w-6 h-6 text-green-600" />
        </motion.div>

        {/* Balance - Compliance - Right Side */}
        <motion.div
          className={`absolute top-[25%] right-[5%] w-12 h-12 ${
            isDarkMode ? "bg-green-500/20" : "bg-green-100/80"
          } rounded-full flex items-center justify-center backdrop-blur-sm`}
          initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.5],
            x: [0, -15, 25, 0],
            y: [0, 20, -10, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
            times: [0, 0.2, 0.8, 1],
          }}
        >
          <Scale className="w-6 h-6 text-green-600" />
        </motion.div>

        {/* Shield - Security & Safety - Left Side */}
        <motion.div
          className={`absolute top-[55%] left-[3%] w-12 h-12 ${
            isDarkMode ? "bg-green-500/20" : "bg-green-100/80"
          } rounded-full flex items-center justify-center backdrop-blur-sm`}
          initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.5],
            x: [0, 25, -15, 0],
            y: [0, -20, 25, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
            times: [0, 0.2, 0.8, 1],
          }}
        >
          <Shield className="w-6 h-6 text-green-600" />
        </motion.div>

        {/* Chart - Halal Earnings - Right Side */}
        <motion.div
          className={`absolute top-[15%] right-[8%] w-12 h-12 ${
            isDarkMode ? "bg-green-500/20" : "bg-green-100/80"
          } rounded-full flex items-center justify-center backdrop-blur-sm`}
          initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.5],
            x: [0, -20, 15, 0],
            y: [0, 25, -30, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
            times: [0, 0.2, 0.8, 1],
          }}
        >
          <TrendingUp className="w-6 h-6 text-green-600" />
        </motion.div>

        {/* Community - Delegators / Network - Left Side */}
        <motion.div
          className={`absolute top-[40%] left-[7%] w-12 h-12 ${
            isDarkMode ? "bg-green-500/20" : "bg-green-100/80"
          } rounded-full flex items-center justify-center backdrop-blur-sm`}
          initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.5],
            x: [0, 15, -25, 0],
            y: [0, -25, 10, 0],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
            times: [0, 0.2, 0.8, 1],
          }}
        >
          <Users className="w-6 h-6 text-green-600" />
        </motion.div>

        {/* Globe - Global Reach - Right Side */}
        <motion.div
          className={`absolute top-[65%] right-[4%] w-12 h-12 ${
            isDarkMode ? "bg-green-500/20" : "bg-green-100/80"
          } rounded-full flex items-center justify-center backdrop-blur-sm`}
          initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.5],
            x: [0, -25, 20, 0],
            y: [0, 15, -20, 0],
          }}
          transition={{
            duration: 8.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5,
            times: [0, 0.2, 0.8, 1],
          }}
        >
          <Globe className="w-6 h-6 text-green-600" />
        </motion.div>

        {/* Book - Islamic Finance Knowledge - Left Side */}
        <motion.div
          className={`absolute top-[75%] left-[6%] w-12 h-12 ${
            isDarkMode ? "bg-green-500/20" : "bg-green-100/80"
          } rounded-full flex items-center justify-center backdrop-blur-sm`}
          initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.5],
            x: [0, 30, -10, 0],
            y: [0, -15, 30, 0],
          }}
          transition={{
            duration: 9.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 6,
            times: [0, 0.2, 0.8, 1],
          }}
        >
          <BookOpen className="w-6 h-6 text-green-600" />
        </motion.div>

        {/* Award - Trust & Credibility - Right Side */}
        <motion.div
          className={`absolute top-[45%] right-[6%] w-12 h-12 ${
            isDarkMode ? "bg-green-500/20" : "bg-green-100/80"
          } rounded-full flex items-center justify-center backdrop-blur-sm`}
          initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.5],
            x: [0, -30, 25, 0],
            y: [0, 20, -25, 0],
          }}
          transition={{
            duration: 10.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 7,
            times: [0, 0.2, 0.8, 1],
          }}
        >
          <Award className="w-6 h-6 text-green-600" />
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <div className="space-y-8">
              {/* Badge */}
              <motion.div
                className={`inline-flex items-center gap-2 ${
                  isDarkMode 
                    ? "bg-gray-800/80 border-green-500/30" 
                    : "bg-white/80 border-green-200"
                } backdrop-blur-sm border rounded-full px-4 py-2 text-sm font-medium ${
                  isDarkMode ? "text-gray-200" : "text-gray-700"
                } shadow-sm`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Shariah-Compliant Staking Platform
              </motion.div>

              {/* Main Heading */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                } leading-tight`}>
                  Stake without
                  <br />
                  <span className="text-teal-600">
                    compromising faith
                  </span>
                </h1>
              </motion.div>

              {/* Description */}
              <motion.p
                className={`text-lg md:text-xl ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                } leading-relaxed max-w-lg`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                EthicalNode provides quick Shariah-compliant staking integrations for institutions and forward-thinking investors, industry-leading Islamic finance research, and support for 15+ halal blockchain protocols.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              > 
                <motion.button
                  onClick={() => {
                    const element = document.getElementById("halal-screener");
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className={`inline-flex items-center justify-center gap-2 ${
                    isDarkMode 
                      ? "bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 border-gray-600" 
                      : "bg-white/80 hover:bg-white text-gray-700 border-gray-200"
                  } backdrop-blur-sm font-semibold px-8 py-4 rounded-lg border transition-colors duration-200 shadow-sm hover:shadow-md`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Globe className="w-5 h-5" />
                  View Halal Screener
                </motion.button>
              </motion.div>
            </div>

            {/* Right Content - Orbital Diagram Image */}
            <div className="relative flex items-center justify-center">
              <motion.div
                className="relative w-80 h-80 lg:w-96 lg:h-96"
                initial={{ opacity: 0, scale: 1.0 }}
                animate={{ opacity: 1, scale: 1.5 }}
                transition={{ duration: 1, delay: 0.8 }}
              >
                <img
                  src={isDarkMode?"/Hero_banner/EN_HERO_Graphic_dark.gif":"/Hero_banner/EN_HERO_Graphic.gif"}
                  alt="Orbital Diagram - Shariah-Compliant Staking Platform"
                  className={`w-full h-full object-contain transition-all duration-500 brightness-95 contrast-100 saturate-100`}
                />
              </motion.div>
            </div>
          </div>

          {/* Stats Section */}
          <motion.div
            className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            <div className="space-y-2">
              <div className={`w-16 h-16 ${
                isDarkMode ? "bg-green-900/50" : "bg-green-100"
              } rounded-full flex items-center justify-center mx-auto mb-4`}>
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className={`text-3xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>$2.8M+</div>
              <div className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Total Value Staked</div>
            </div>
            
            <div className="space-y-2">
              <div className={`w-16 h-16 ${
                isDarkMode ? "bg-green-900/50" : "bg-green-100"
              } rounded-full flex items-center justify-center mx-auto mb-4`}>
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className={`text-3xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>100%</div>
              <div className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Shariah Compliant</div>
            </div>
            
            <div className="space-y-2">
              <div className={`w-16 h-16 ${
                isDarkMode ? "bg-green-900/50" : "bg-green-100"
              } rounded-full flex items-center justify-center mx-auto mb-4`}>
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className={`text-3xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>1,200+</div>
              <div className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Active Delegators</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;