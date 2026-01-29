
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote } from 'lucide-react';

const quotes = [
  { text: "You make your money when you buy, not when you sell.", author: "Real Estate Proverb" },
  { text: "Don't fall in love with the property. Fall in love with the numbers.", author: "Experienced Investor" },
  { text: "In Atlanta's older neighborhoods, always budget 20% extra for foundation surprises.", author: "ATL Flipper" },
  { text: "The best deal you ever do might be the one you walk away from.", author: "Veteran Wisdom" },
  { text: "Time kills all deals. Speed of implementation is your best asset.", author: "Hard Money Lender" },
];

const VeteranWisdom = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-6 border border-white/20 h-full flex flex-col justify-center relative overflow-hidden">
      <Quote className="absolute top-4 left-4 text-white/10 w-24 h-24 rotate-12" />
      
      <div className="relative z-10 min-h-[120px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <p className="text-xl md:text-2xl font-serif text-white italic mb-4 text-center">
              "{quotes[index].text}"
            </p>
            <p className="text-gold-400 text-sm font-bold text-center uppercase tracking-widest">
              — {quotes[index].author}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className="flex justify-center gap-2 mt-4 relative z-10">
        {quotes.map((_, i) => (
          <div 
            key={i} 
            className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-primary w-6' : 'bg-white/20'}`} 
          />
        ))}
      </div>
    </div>
  );
};

export default VeteranWisdom;
