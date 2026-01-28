
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Hammer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { jsPDF } from 'jspdf';
import "jspdf-autotable";

const RehabBudgetReport = ({ deal, propertyDetails, photos, onBudgetGenerated }) => {
  const [budget, setBudget] = useState(deal.rehab_budget || null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateBudget = async () => {
    setLoading(true);
    try {
      // Call Edge Function directly
      const { data: result, error: functionError } = await supabase.functions.invoke('generate-rehab-sow', {
        body: {
          action: 'generate_budget',
          deal: deal,
          propertyDetails: propertyDetails,
          photos: photos,
          rehabCategory: deal.rehab_category
        }
      });

      if (functionError) throw functionError;
      if (!result) throw new Error("No budget data returned");

      setBudget(result);
      
      // Save to DB
      const { error: dbError } = await supabase.from('deals').update({ rehab_budget: result }).eq('id', deal.id);
      if (dbError) throw dbError;
      
      toast({ title: "Budget Generated", description: "Detailed Scope of Work created." });
      if (onBudgetGenerated) onBudgetGenerated(result);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to generate budget. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
     if (!budget) return;
     try {
       const doc = new jsPDF();
       doc.setFontSize(20);
       doc.text(`Rehab Scope of Work: ${deal.address}`, 14, 20);
       doc.setFontSize(12);
       doc.text(`Total Budget: $${budget.total_budget?.toLocaleString()}`, 14, 30);
       doc.text(`Estimated Timeline: ${budget.timeline_weeks} Weeks`, 14, 38);

       doc.autoTable({
          startY: 50,
          head: [['Area', 'Task', 'Cost', 'Notes']],
          body: budget.room_breakdown.flatMap(room => 
             room.items.map(item => [room.area_name, item.task, `$${item.cost}`, item.notes || ''])
          ),
       });
       
       doc.save(`Rehab_SOW_${deal.address.slice(0,10)}.pdf`);
       toast({ title: "PDF Exported", description: "Your report has been downloaded." });
     } catch (error) {
       toast({ variant: "destructive", title: "Export Failed", description: "Could not generate PDF." });
     }
  };

  if (!propertyDetails || Object.keys(propertyDetails).length === 0) {
     return null; // Don't show until advanced analysis is done
  }

  return (
    <div className="space-y-6">
       {!budget ? (
         <div className="bg-slate-800/50 p-8 rounded-2xl border border-white/10 text-center">
            <Hammer className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Generate Professional Rehab Budget</h3>
            <p className="text-gray-400 max-w-lg mx-auto mb-6">
               Use AI to create a line-item Scope of Work based on your property details and photos. Includes material sourcing and labor estimates.
            </p>
            <Button onClick={generateBudget} disabled={loading} className="bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold px-8 py-4">
               {loading ? 'Generating SOW...' : 'Generate Scope of Work'}
            </Button>
         </div>
       ) : (
         <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/50">
               <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                     <FileText className="text-gold-400" /> Rehab Scope & Budget
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">Finish Level: {budget.finish_level}</p>
               </div>
               <div className="text-right">
                  <p className="text-3xl font-bold text-white">${budget.total_budget?.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">Total Est. Cost ({budget.timeline_weeks} Weeks)</p>
               </div>
            </div>
            
            <div className="p-6 space-y-6">
               <div className="prose prose-invert max-w-none">
                  <h4 className="text-gold-400 font-bold mb-2">Executive Summary</h4>
                  <p className="text-gray-300 text-sm">{budget.executive_summary}</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {budget.room_breakdown?.map((area, i) => (
                     <div key={i} className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
                        <div className="flex justify-between mb-3 border-b border-white/5 pb-2">
                           <h5 className="font-bold text-white">{area.area_name}</h5>
                           <span className="text-gold-400 font-mono">${area.total_area_cost?.toLocaleString()}</span>
                        </div>
                        <ul className="space-y-2 text-sm text-gray-400">
                           {area.items?.map((item, j) => (
                              <li key={j} className="flex justify-between">
                                 <span>{item.task}</span>
                                 <span>${item.cost?.toLocaleString()}</span>
                              </li>
                           ))}
                        </ul>
                     </div>
                  ))}
               </div>

               <div className="flex gap-4 pt-4 border-t border-white/10">
                  <Button onClick={exportPDF} variant="outline" className="border-gold-500 text-gold-400 hover:bg-gold-500/10">
                     <Download className="mr-2 h-4 w-4" /> Export PDF
                  </Button>
               </div>
            </div>
         </motion.div>
       )}
    </div>
  );
};

export default RehabBudgetReport;
