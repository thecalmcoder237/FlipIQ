
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  BarChart2, 
  FileText, 
  History, 
  Layers, 
  PieChart, 
  ChevronRight, 
  ChevronLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const menuItems = [
  { path: '/deal-input', label: 'Input Form', icon: Home },
  { path: '/deal-analysis', label: 'Analysis', icon: BarChart2 },
  { path: '/report', label: 'PDF Report', icon: FileText },
  { path: '/deal-history', label: 'Deal History', icon: History },
  { path: '/deal-comparison', label: 'Comparison', icon: Layers },
  { path: '/portfolio-dashboard', label: 'Portfolio', icon: PieChart },
];

const QuickAccessSidebar = ({ isOpen, toggle }) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggle}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 bottom-0 w-64 bg-card border-r border-border z-50 flex flex-col pt-20 shadow-2xl"
      >
        <div className="p-4 flex items-center justify-between lg:hidden">
          <span className="text-foreground font-bold">Menu</span>
          <Button variant="ghost" size="icon" onClick={toggle} className="text-foreground">
            <ChevronLeft />
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.includes(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && toggle()}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="bg-muted rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Pro Tip</p>
            <p className="text-sm text-muted-foreground">
              Use <span className="text-primary font-mono bg-primary/10 px-1 rounded">Ctrl+S</span> to save your deal instantly from anywhere.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Toggle Button (Desktop) */}
      <motion.button
        initial={{ left: 0 }}
        animate={{ left: isOpen ? 256 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={toggle}
        className="fixed top-24 z-40 bg-muted text-foreground p-2 rounded-r-lg border-y border-r border-border shadow-lg hover:bg-accent hidden lg:block"
      >
        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </motion.button>
    </>
  );
};

export default QuickAccessSidebar;
