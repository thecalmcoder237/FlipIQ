
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const NavigationButtons = ({ backPath, nextPath, onBack, onNext, backLabel = "Back", nextLabel = "Next", loading = false }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      navigate(backPath);
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else if (nextPath) {
      navigate(nextPath);
    }
  };

  return (
    <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
      {backPath || onBack ? (
        <Button
          onClick={handleBack}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLabel}
        </Button>
      ) : <div />}

      {nextPath || onNext ? (
        <Button
          onClick={handleNext}
          disabled={loading}
          className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold"
        >
          {loading ? (
             <span className="flex items-center">
               <span className="animate-spin mr-2">⏳</span> Processing...
             </span>
          ) : (
            <>
              {nextLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      ) : <div />}
    </div>
  );
};

export default NavigationButtons;
