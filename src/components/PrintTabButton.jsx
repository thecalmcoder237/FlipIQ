import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const PrintTabButton = ({ onPrint, label = 'Print' }) => {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onPrint}
      className="border-border text-foreground hover:bg-accent"
    >
      <Printer className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
};

export default PrintTabButton;
