import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Download, Mail, ChevronLeft, Save, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { dealService } from '@/services/dealService';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import { generateLoanProposalHtml } from '@/utils/loanProposalHtmlTemplate';
import {
  arrayBufferToBase64,
  buildDealReportPath,
  uploadReportAndCreateSignedUrl,
} from '@/services/reportStorageService';
import Breadcrumb from '@/components/Breadcrumb';
import html2pdf from 'html2pdf.js';

const LoanProposalGenerator = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const query = new URLSearchParams(search);
  const dealId = query.get('id');
  const previewIframeRef = useRef(null);

  const [deal, setDeal] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sending, setSending] = useState(false);

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
    trackRecord: 'Successfully flipped 4 properties in the last 2 years.',
    email: '',
    phone: ''
  });

  const [recipientEmail, setRecipientEmail] = useState('');

  useEffect(() => {
    if (dealId) fetchDeal();
    if (currentUser) {
      setBorrowerInfo(prev => ({
        ...prev,
        name: currentUser.email?.split('@')[0] || '',
        email: currentUser.email || ''
      }));
    }
  }, [dealId, currentUser]);

  const fetchDeal = async () => {
    try {
      const loadedDeal = await dealService.loadDeal(dealId, currentUser?.id);
      setDeal(loadedDeal);
      const calculated = calculateDealMetrics(loadedDeal);
      setMetrics(calculated);
      setLoanTerms(prev => ({
        ...prev,
        loanAmount: Math.round((loadedDeal?.purchase_price ?? loadedDeal?.purchasePrice ?? 0) + (loadedDeal?.rehab_costs ?? loadedDeal?.rehabCosts ?? 0))
      }));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load deal data.' });
      navigate('/portfolio-dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getProposalHtml = useCallback(() => {
    if (!deal || !metrics) return '';
    return generateLoanProposalHtml({ deal, metrics, loanTerms, borrowerInfo });
  }, [deal, metrics, loanTerms, borrowerInfo]);

  const html2pdfOptions = {
    margin: 10,
    filename: `Loan_Proposal_${(deal?.address || 'Deal').toString().replace(/\s+/g, '_')}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'], before: '.slide', after: '.slide' }
  };

  /** Get PDF as ArrayBuffer from proposal HTML (uses hidden iframe + html2pdf). */
  const getPdfArrayBufferFromHtml = (htmlString) => {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;visibility:hidden;';
      iframe.srcdoc = htmlString;
      document.body.appendChild(iframe);
      const onLoad = () => {
        try {
          const body = iframe.contentDocument?.body;
          if (!body) {
            document.body.removeChild(iframe);
            reject(new Error('Iframe body not available'));
            return;
          }
          html2pdf()
            .set(html2pdfOptions)
            .from(body)
            .outputPdf('arraybuffer')
            .then((arrayBuffer) => {
              document.body.removeChild(iframe);
              resolve(arrayBuffer);
            })
            .catch((err) => {
              document.body.removeChild(iframe);
              reject(err);
            });
        } catch (e) {
          document.body.removeChild(iframe);
          reject(e);
        }
      };
      iframe.onload = onLoad;
      iframe.onerror = () => {
        document.body.removeChild(iframe);
        reject(new Error('Iframe failed to load'));
      };
    });
  };

  const handleExportPdf = async () => {
    if (!deal || !metrics) return;
    setExportingPdf(true);
    try {
      const html = getProposalHtml();
      const arrayBuffer = await getPdfArrayBufferFromHtml(html);
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = html2pdfOptions.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Success', description: 'Proposal PDF downloaded.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to export PDF.' });
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadHtml = () => {
    if (!deal || !metrics) return;
    const html = getProposalHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Loan_Proposal_${(deal.address || 'Deal').toString().replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Success', description: 'Proposal HTML downloaded.' });
  };

  const handleEmail = async () => {
    if (!recipientEmail?.trim()) {
      toast({ variant: 'destructive', title: 'Required', description: 'Please enter a recipient email.' });
      return;
    }
    if (!deal || !metrics) return;

    setSending(true);
    try {
      const html = getProposalHtml();
      const arrayBuffer = await getPdfArrayBufferFromHtml(html);
      const pdfBase64 = arrayBufferToBase64(arrayBuffer);
      const proposalPath = buildDealReportPath({ dealId, type: 'loan-proposal', ext: 'pdf' });
      const pdfFileName = `Loan_Proposal_${(deal.address || 'Deal').toString().replace(/\s+/g, '_')}.pdf`;
      let downloadUrl;
      try {
        const result = await uploadReportAndCreateSignedUrl({
          supabase,
          path: proposalPath,
          arrayBuffer,
          contentType: 'application/pdf',
        });
        downloadUrl = result.signedUrl;
      } catch (uploadErr) {
        downloadUrl = undefined;
      }

      const { error } = await supabase.functions.invoke('generate-loan-proposal', {
        body: {
          dealId,
          recipients: [recipientEmail.trim()],
          downloadUrl,
          pdfBase64,
          pdfFileName,
          deal: {
            address: deal.address,
            purchasePrice: deal.purchasePrice ?? deal.purchase_price,
            arv: deal.arv,
            rehabCosts: deal.rehab_costs ?? deal.rehabCosts,
            zipCode: deal.zipCode ?? deal.zip_code,
            bedrooms: deal.bedrooms,
            bathrooms: deal.bathrooms,
            sqft: deal.sqft,
          },
          metrics: {
            netProfit: metrics.netProfit,
            roi: metrics.roi,
            score: metrics.score,
            ltv: metrics.ltv,
            cashOnCash: metrics.cashOnCash,
          },
          rehabSOW: deal.rehabSow ?? deal.rehab_sow,
          propertyIntelligence: deal.propertyIntelligence,
          userEmail: currentUser?.email,
        },
      });

      if (error) throw error;
      toast({ title: 'Email Sent', description: `Proposal sent to ${recipientEmail}` });
      setRecipientEmail('');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Email Failed', description: error?.message || 'Failed to send.' });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="text-white text-center py-20">Loading deal details...</div>;
  if (!deal || !metrics) return <div className="text-white text-center py-20">Deal not found.</div>;

  const proposalHtml = getProposalHtml();

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <Breadcrumb />

        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
            <ChevronLeft className="w-5 h-5 mr-1" /> Back
          </Button>
          <h1 className="text-3xl font-bold text-white">Loan Proposal Generator</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT COLUMN – INPUTS */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
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
                    onChange={(e) => setLoanTerms({ ...loanTerms, loanAmount: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    value={loanTerms.interestRate}
                    onChange={(e) => setLoanTerms({ ...loanTerms, interestRate: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Term (Months)</label>
                  <input
                    type="number"
                    value={loanTerms.termMonths}
                    onChange={(e) => setLoanTerms({ ...loanTerms, termMonths: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
              </div>
            </div>

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
                    onChange={(e) => setBorrowerInfo({ ...borrowerInfo, name: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Experience</label>
                    <input
                      type="text"
                      value={borrowerInfo.experience}
                      onChange={(e) => setBorrowerInfo({ ...borrowerInfo, experience: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Liquidity ($)</label>
                    <input
                      type="number"
                      value={borrowerInfo.liquidity}
                      onChange={(e) => setBorrowerInfo({ ...borrowerInfo, liquidity: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Track Record / Bio</label>
                  <textarea
                    value={borrowerInfo.trackRecord}
                    onChange={(e) => setBorrowerInfo({ ...borrowerInfo, trackRecord: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white h-24 text-sm"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN – PREVIEW & ACTIONS */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">Preview</h3>
              <div className="rounded-xl overflow-hidden border border-white/10 bg-white" style={{ minHeight: 500 }}>
                <iframe
                  ref={previewIframeRef}
                  title="Loan proposal preview"
                  srcDoc={proposalHtml}
                  className="w-full border-0"
                  style={{ minHeight: 500, height: 560 }}
                />
              </div>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/10 space-y-4">
              <Button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg"
              >
                {exportingPdf ? 'Exporting PDF...' : <><Download className="mr-2" /> Export as PDF</>}
              </Button>
              <Button
                onClick={handleDownloadHtml}
                variant="secondary"
                className="w-full"
              >
                <Save className="mr-2 w-4 h-4" /> Download HTML
              </Button>
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400 mb-2">Send as email</p>
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
