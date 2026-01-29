
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; 
import { Save, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const NotesPanel = ({ dealId, initialNotes }) => {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (initialNotes) setNotes(initialNotes);
  }, [initialNotes]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('deals')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', dealId);

      if (error) throw error;

      setLastSaved(new Date());
      toast({
        title: "Notes Saved",
        description: "Your notes have been updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save notes. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-card backdrop-blur-xl rounded-3xl p-6 border border-border h-full flex flex-col shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-foreground">Deal Notes</h3>
        {lastSaved && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      <textarea
        value={notes || ''}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add your notes about this property, contractors, or negotiation details..."
        className="flex-1 w-full bg-background border border-input rounded-xl p-4 text-foreground placeholder-muted-foreground resize-none focus:ring-2 focus:ring-ring focus:outline-none mb-4 min-h-[150px]"
      />
      
      <Button 
        onClick={handleSave} 
        disabled={isSaving}
        className="self-end bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
      >
        {isSaving ? 'Saving...' : (
          <>
            <Save className="w-4 h-4 mr-2" /> Save Notes
          </>
        )}
      </Button>
    </div>
  );
};

export default NotesPanel;
