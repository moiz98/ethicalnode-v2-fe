import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Shield, TrendingUp } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface StepData {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const HowItWorks: React.FC = () => {
  const { isDarkMode } = useTheme();

  const steps: StepData[] = [
    {
      id: 1,
      title: "Connect Your Wallet",
      description: "Securely connect your cryptocurrency wallet to our platform using industry-standard protocols.",
      icon: <Wallet className="w-8 h-8" />
    },
    {
      id: 2,
      title: "Choose Halal Networks",
      description: "Select from our curated list of Shariah-compliant blockchain networks verified by Islamic scholars.",
      icon: <Shield className="w-8 h-8" />
    },
    {
      id: 3,
      title: "Earn Ethical Rewards",
      description: "Start earning staking rewards while supporting decentralized networks that align with Islamic values.",
      icon: <TrendingUp className="w-8 h-8" />
    }
  ];

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

  return (
    <section 
      id="how-it-works" 
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
            How It Works
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Start your Shariah-compliant staking journey in three simple steps
          </p>
        </motion.div>

        {/* Steps Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {steps.map((step) => (
            <motion.div
              key={step.id}
              variants={cardVariants}
              className={`relative p-8 rounded-2xl border transition-all duration-300 hover:shadow-lg ${
                isDarkMode 
                  ? 'bg-gray-800/80 border-gray-700 hover:border-gray-600' 
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
              whileHover={{ y: -5 }}
            >
              {/* Step Number */}
              <div className={`absolute -top-4 -left-4 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                isDarkMode 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-teal-500 text-white'
              }`}>
                {step.id}
              </div>

              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl mb-6 ${
                isDarkMode 
                  ? 'bg-teal-600/20 text-teal-400' 
                  : 'bg-teal-100 text-teal-600'
              }`}>
                {step.icon}
              </div>

              {/* Content */}
              <div>
                <h3 className={`text-xl font-semibold mb-4 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {step.title}
                </h3>
                <p className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {step.description}
                </p>
              </div>

              {/* Connector Line (except for last card) */}
              {step.id < steps.length && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <div className={`w-8 h-0.5 ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                  }`} />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
