
import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const steps = [
  { path: '/deal-input', label: 'Input' },
  { path: '/deal-analysis', label: 'Analysis' },
  { path: '/report', label: 'Report' },
];

const ProgressIndicator = () => {
  const location = useLocation();
  const currentStepIndex = steps.findIndex(step => location.pathname.includes(step.path));

  // Only show on relevant pages
  if (currentStepIndex === -1 && !steps.some(s => location.pathname.includes(s.path.replace('/', '')))) return null;

  return (
    <div className="flex items-center justify-center w-full mb-8">
      <div className="flex items-center relative z-10">
        {steps.map((step, index) => (
          <React.Fragment key={step.path}>
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: index <= currentStepIndex ? '#fbbf24' : '#1e293b',
                  borderColor: index <= currentStepIndex ? '#fbbf24' : '#4b5563',
                  scale: index === currentStepIndex ? 1.1 : 1,
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-colors duration-300 ${
                  index <= currentStepIndex ? 'text-slate-900' : 'text-gray-400'
                }`}
              >
                {index + 1}
              </motion.div>
              <span className={`text-xs mt-2 font-medium ${index <= currentStepIndex ? 'text-gold-400' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-16 h-1 mx-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: index < currentStepIndex ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gold-400"
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;
