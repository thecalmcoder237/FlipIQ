
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
    <div className="flex justify-between mt-8 pt-6 border-t border-border">
      {backPath || onBack ? (
        <Button
          onClick={handleBack}
          variant="outline"
          className="border-border text-foreground hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLabel}
        </Button>
      ) : <div />}

      {nextPath || onNext ? (
        <Button
          onClick={handleNext}
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
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
