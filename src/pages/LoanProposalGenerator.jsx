
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Download, Mail, ChevronLeft, Save, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import { generateLoanProposalPDF } from '@/utils/proposalTemplate';
import Breadcrumb from '@/components/Breadcrumb';

const LoanProposalGenerator = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const query = new URLSearchParams(search);
  const dealId = query.get('id');

  const [deal, setDeal] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  // Proposal State
  const [loanTerms, setLoanTerms] = useState({
    loanAmount: 0,
    interestRate: 10,
    termMonths: 12,
    points: 2
  });

  const [borrowerInfo, setBorrowerInfo] = useState({
    name: '',
    experience: '3-5 Deals',
    creditScore: '720+',
    liquidity: 50000,
    trackRecord: 'Successfully flipped 4 properties in the last 2 years.'
  });

  const [recipientEmail, setRecipientEmail] = useState('');

  useEffect(() => {
    if (dealId) fetchDeal();
    if (currentUser) {
        setBorrowerInfo(prev => ({ ...prev, name: currentUser.email?.split('@')[0] || '' }));
    }
  }, [dealId, currentUser]);

  const fetchDeal = async () => {
    try {
      const { data, error } = await supabase.from('deals').select('*').eq('id', dealId).single();
      if (error) throw error;
      setDeal(data);
      const calculated = calculateDealMetrics(data);
      setMetrics(calculated);
      setLoanTerms(prev => ({ ...prev, loanAmount: Math.round(data.purchase_price + data.rehab_costs) })); // Default request: purchase + rehab
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load deal data.' });
      navigate('/portfolio-dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    setGenerating(true);
    try {
      const doc = generateLoanProposalPDF(deal, metrics, loanTerms, borrowerInfo);
      doc.save(`Loan_Proposal_${deal.address.replace(/\s+/g, '_')}.pdf`);
      toast({ title: 'Success', description: 'Proposal PDF downloaded.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate PDF.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleEmail = async () => {
    if (!recipientEmail) {
      toast({ variant: 'destructive', title: 'Required', description: 'Please enter a recipient email.' });
      return;
    }

    setSending(true);
    try {
      const doc = generateLoanProposalPDF(deal, metrics, loanTerms, borrowerInfo);
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      const { data, error } = await supabase.functions.invoke('send-loan-proposal', {
        body: {
          to: recipientEmail,
          subject: `Loan Proposal for ${deal.address}`,
          borrowerName: borrowerInfo.name,
          dealAddress: deal.address,
          proposalPDF: pdfBase64
        }
      });

      if (error) throw error;
      toast({ title: 'Email Sent', description: `Proposal sent to ${recipientEmail}` });
      setRecipientEmail('');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Email Failed', description: error.message });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="text-white text-center py-20">Loading deal details...</div>;

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <Breadcrumb />
        
        <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
                <ChevronLeft className="w-5 h-5 mr-1" /> Back
            </Button>
            <h1 className="text-3xl font-bold text-white">Loan Proposal Generator</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT COLUMN - INPUTS */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
            >
                {/* Loan Terms Section */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                        <DollarSign className="w-5 h-5 mr-2 text-gold-400" /> Loan Terms
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Loan Amount ($)</label>
                            <input 
                                type="number" 
                                value={loanTerms.loanAmount}
                                onChange={(e) => setLoanTerms({...loanTerms, loanAmount: Number(e.target.value)})}
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                            />
                        </div>
                         <div>
                            <label className="block text-sm text-gray-400 mb-1">Interest Rate (%)</label>
                            <input 
                                type="number" 
                                value={loanTerms.interestRate}
                                onChange={(e) => setLoanTerms({...loanTerms, interestRate: Number(e.target.value)})}
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Term (Months)</label>
                            <input 
                                type="number" 
                                value={loanTerms.termMonths}
                                onChange={(e) => setLoanTerms({...loanTerms, termMonths: Number(e.target.value)})}
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Borrower Info Section */}
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-gold-400" /> Borrower Profile
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Name</label>
                            <input 
                                type="text" 
                                value={borrowerInfo.name}
                                onChange={(e) => setBorrowerInfo({...borrowerInfo, name: e.target.value})}
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Experience</label>
                                <input 
                                    type="text" 
                                    value={borrowerInfo.experience}
                                    onChange={(e) => setBorrowerInfo({...borrowerInfo, experience: e.target.value})}
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Liquidity ($)</label>
                                <input 
                                    type="number" 
                                    value={borrowerInfo.liquidity}
                                    onChange={(e) => setBorrowerInfo({...borrowerInfo, liquidity: Number(e.target.value)})}
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                                />
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm text-gray-400 mb-1">Track Record / Bio</label>
                             <textarea 
                                value={borrowerInfo.trackRecord}
                                onChange={(e) => setBorrowerInfo({...borrowerInfo, trackRecord: e.target.value})}
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white h-24 text-sm"
                             />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* RIGHT COLUMN - PREVIEW & ACTIONS */}
            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
            >
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-[400px]">
                    <FileText className="w-24 h-24 text-gold-400 mb-4 opacity-50" />
                    <h3 className="text-2xl font-bold text-white mb-2">Ready to Generate</h3>
                    <p className="text-gray-400 max-w-xs">
                        Create a professional PDF proposal for {deal.address} incorporating your deal metrics and the loan terms defined on the left.
                    </p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/10 space-y-4">
                    <Button 
                        onClick={handleDownload} 
                        disabled={generating}
                        className="w-full bg-gold-500 hover:bg-gold-600 text-slate-900 font-bold py-6 text-lg"
                    >
                        {generating ? 'Generating PDF...' : <><Download className="mr-2" /> Download Proposal PDF</>}
                    </Button>

                    <div className="pt-4 border-t border-white/10">
                        <p className="text-sm text-gray-400 mb-2">Or email directly to lender:</p>
                        <div className="flex gap-2">
                            <input 
                                type="email" 
                                placeholder="lender@example.com"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                className="flex-1 bg-slate-900 border border-white/10 rounded-lg p-2 text-white text-sm"
                            />
                            <Button onClick={handleEmail} disabled={sending} variant="secondary">
                                {sending ? 'Sending...' : <Mail className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoanProposalGenerator;
