import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { BarChart3, Hammer, ArrowRight, TrendingUp, ClipboardList, CheckCircle2, DollarSign, Camera, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const FeaturePill = ({ icon: Icon, text }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted/60 border border-border rounded-full text-xs text-muted-foreground">
    <Icon className="w-3 h-3" />
    {text}
  </span>
);

const HomeLanding = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const userName = currentUser?.email?.split('@')[0] || 'there';

  return (
    <>
      <Helmet>
        <title>Home - FlipIQ</title>
        <meta name="description" content="FlipIQ – Deal Analysis & Rehab Project Management for real estate investors." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <div className="flex justify-center mb-6">
              <img
                src="/assets/flipiq-logo.png"
                alt="FlipIQ"
                className="h-16 w-auto"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Welcome back, <span className="text-primary capitalize">{userName}</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
              What would you like to work on today?
            </p>
          </motion.div>

          {/* Choice Cards */}
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Deal Analysis Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <button
                onClick={() => navigate('/deal-input')}
                className="group w-full h-full text-left bg-card border border-border rounded-2xl p-8 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                    <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>

                <h2 className="text-xl font-bold text-foreground mb-2">Deal Analysis</h2>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  Underwrite a new property, run AI-powered comps, generate rehab SOW, and assess deal quality before you commit.
                </p>

                <div className="flex flex-wrap gap-2">
                  <FeaturePill icon={TrendingUp} text="AI Underwriting" />
                  <FeaturePill icon={BarChart3} text="Deal Scoring" />
                  <FeaturePill icon={CheckCircle2} text="SOW Generator" />
                </div>

                <div className="mt-6 pt-5 border-t border-border">
                  <span className="text-sm font-medium text-primary group-hover:underline">
                    Analyze a deal →
                  </span>
                </div>
              </button>
            </motion.div>

            {/* Rehab Management Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <button
                onClick={() => navigate('/project-management')}
                className="group w-full h-full text-left bg-card border border-border rounded-2xl p-8 hover:border-accentBrand/50 hover:shadow-xl hover:shadow-accentBrand/10 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-accentBrand/10 rounded-xl group-hover:bg-accentBrand/20 transition-colors">
                    <Hammer className="w-8 h-8 text-accentBrand" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-accentBrand group-hover:translate-x-1 transition-all" />
                </div>

                <h2 className="text-xl font-bold text-foreground mb-2">Rehab Management</h2>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  Track active rehabs from demolition to final walkthrough — tasks, budget vs actual, materials, photos, and issue log.
                </p>

                <div className="flex flex-wrap gap-2">
                  <FeaturePill icon={ClipboardList} text="Task Tracker" />
                  <FeaturePill icon={DollarSign} text="Budget vs Actual" />
                  <FeaturePill icon={Camera} text="Photo Journal" />
                  <FeaturePill icon={AlertTriangle} text="Issue Log" />
                </div>

                <div className="mt-6 pt-5 border-t border-border">
                  <span className="text-sm font-medium text-accentBrand group-hover:underline">
                    Manage rehab →
                  </span>
                </div>
              </button>
            </motion.div>
          </div>

          {/* Quick links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-3 mt-10"
          >
            {[
              { label: 'Deal History', path: '/deal-history' },
              { label: 'Portfolio', path: '/portfolio-dashboard' },
              { label: 'Deal Comparison', path: '/deal-comparison' },
            ].map((link) => (
              <Button
                key={link.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(link.path)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                {link.label}
              </Button>
            ))}
          </motion.div>

          <p className="text-center text-xs text-muted-foreground/50 mt-8">powered by PAVEL REI</p>
        </div>
      </div>
    </>
  );
};

export default HomeLanding;
