
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
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Deal Notes</h3>
        {lastSaved && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      <textarea
        value={notes || ''}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add your notes about this property, contractors, or negotiation details..."
        className="flex-1 w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:ring-2 focus:ring-gold-400 focus:outline-none mb-4 min-h-[150px]"
      />
      
      <Button 
        onClick={handleSave} 
        disabled={isSaving}
        className="self-end bg-gold-500 text-slate-900 hover:bg-gold-600 font-bold"
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
