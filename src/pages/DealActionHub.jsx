import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, FileText, Download, Loader2, CheckCircle2, AlertCircle, Plus, X, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { dealService } from '@/services/dealService';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import { generateFullAnalysisReportPDF } from '@/utils/fullAnalysisReportPdf';
import { generateFullAnalysisReportHtml } from '@/utils/fullAnalysisReportHtml';
import { generateLoanProposalHtml } from '@/utils/loanProposalHtmlTemplate';
import { renderBusinessDeckPdfArrayBuffer } from '@/utils/businessDeckPdf';
import { buildActionHubAnalysisPayload } from '@/services/actionHubPayloadBuilder';
import {
  arrayBufferToBase64,
  buildDealReportPath,
  uploadReportAndCreateSignedUrl,
} from '@/services/reportStorageService';
import html2pdf from 'html2pdf.js';
import { calculateTimelineProjections } from '@/utils/advancedDealCalculations';
import Breadcrumb from '@/components/Breadcrumb';

const DEFAULT_TEAM_EMAILS = [
  'pavelrei.123@gmail.com',
  'jesse@pavelreiproperties.com',
  'Pasaah33@gmail.com',
  'arielsaah@gmail.com',
];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

const DealActionHub = () => {
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get('id');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [deal, setDeal] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionStates, setActionStates] = useState({
    notifyTeam: { loading: false, success: false, error: null },
    loanProposal: { loading: false, success: false, error: null, downloadUrl: null },
    exportAnalysis: { loading: false, success: false, error: null },
    exportPackage: { loading: false, success: false, error: null, downloadUrl: null },
    businessDeck: { loading: false, success: false, error: null, downloadUrl: null, deckHtml: null, slideStructureNote: null },
    lenderDeck: { loading: false, success: false, error: null, downloadUrl: null, deckHtml: null, slideStructureNote: null }
  });

  const [recipientDialogOpen, setRecipientDialogOpen] = useState(null);
  const [selectedTeamEmails, setSelectedTeamEmails] = useState([]);
  const [customEmails, setCustomEmails] = useState([]);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailInputError, setEmailInputError] = useState('');

  useEffect(() => {
    if (!dealId) {
      navigate('/deal-input');
      return;
    }

    if (currentUser) {
      fetchDeal();
    }
  }, [dealId, currentUser]);

  const fetchDeal = async () => {
    try {
      setLoading(true);
      const loadedDeal = await dealService.loadDeal(dealId, currentUser.id);
      
      if (!loadedDeal) {
        throw new Error("Deal not found");
      }

      setDeal(loadedDeal);
      const calculatedMetrics = calculateDealMetrics(loadedDeal);
      setMetrics(calculatedMetrics);
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load deal"
      });
      navigate('/deal-input');
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateShareUrl = async () => {
    if (!deal?.id || !currentUser?.id) throw new Error('Missing deal or user');
    let token = deal.shareToken || deal.share_token;
    if (!token) {
      const res = await dealService.updateShareToken(deal.id, currentUser.id);
      token = res?.shareToken;
      if (token) setDeal((prev) => ({ ...prev, shareToken: token }));
    }
    if (!token) throw new Error('Could not generate share link');
    return `${window.location.origin}/deal/share/${token}`;
  };

  const handleCopyShareLink = async () => {
    try {
      const url = await getOrCreateShareUrl();
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Share this link for read-only access.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to copy link', description: e?.message || 'Could not create share link.' });
    }
  };

  const openRecipientDialog = (action) => {
    setSelectedTeamEmails([]);
    setCustomEmails([]);
    setNewEmailInput('');
    setEmailInputError('');
    setRecipientDialogOpen(action);
  };

  const closeRecipientDialog = () => {
    setRecipientDialogOpen(null);
    setNewEmailInput('');
    setEmailInputError('');
  };

  const toggleTeamEmail = (email) => {
    setSelectedTeamEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const addCustomEmails = () => {
    setEmailInputError('');
    const raw = newEmailInput.trim();
    if (!raw) return;
    const parts = raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    const valid = [];
    const invalid = [];
    for (const part of parts) {
      if (isValidEmail(part)) valid.push(part);
      else if (part) invalid.push(part);
    }
    if (invalid.length) {
      setEmailInputError(`Invalid email(s): ${invalid.join(', ')}`);
    }
    if (valid.length) {
      setCustomEmails((prev) => [...new Set([...prev, ...valid])]);
      setNewEmailInput('');
    }
  };

  const removeCustomEmail = (email) => {
    setCustomEmails((prev) => prev.filter((e) => e !== email));
  };

  const allRecipients = [...new Set([...selectedTeamEmails, ...customEmails])];
  const canConfirmRecipients = allRecipients.length > 0;

  const handleNotifyTeam = async (recipients) => {
    if (!deal || !metrics) return;

    setActionStates(prev => ({
      ...prev,
      notifyTeam: { loading: true, success: false, error: null }
    }));

    try {
      const { supabase } = await import('@/lib/customSupabaseClient');
      const shareUrl = await getOrCreateShareUrl();
      // Generate PDF (Full Analysis) + upload to Storage for link + attachment
      const pdfDoc = generateFullAnalysisReportPDF({
        deal,
        metrics,
        propertyIntelligence: deal.propertyIntelligence,
        rehabSow: deal.rehabSow,
        scenarios: deal.scenarios,
        notes: deal.notes,
        shareUrl,
      });
      const pdfArrayBuffer = pdfDoc.output('arraybuffer');
      const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);
      const reportPath = buildDealReportPath({ dealId, type: 'full-analysis', ext: 'pdf' });
      let downloadUrl;
      try {
        const result = await uploadReportAndCreateSignedUrl({
          supabase,
          path: reportPath,
          arrayBuffer: pdfArrayBuffer,
          contentType: 'application/pdf',
        });
        downloadUrl = result.signedUrl;
      } catch (uploadErr) {
        // Bucket may not exist yet; still send email with attachment
        downloadUrl = undefined;
      }

      const { data, error } = await supabase.functions.invoke('send-deal-summary', {
        body: {
          dealId,
          recipients: recipients || [],
          downloadUrl,
          shareUrl,
          pdfBase64,
          pdfFileName: `Full_Analysis_${(deal.address || 'Deal').toString().replace(/\s+/g, '_')}.pdf`,
          deal: {
            address: deal.address,
            purchasePrice: deal.purchasePrice || deal.purchase_price,
            arv: deal.arv,
            rehabCosts: deal.rehab_costs || deal.rehabCosts,
            zipCode: deal.zipCode || deal.zip_code
          },
          metrics: {
            netProfit: metrics.netProfit,
            roi: metrics.roi,
            score: metrics.score,
            risk: metrics.risk
          },
          propertyIntelligence: deal.propertyIntelligence
        }
      });

      if (error) throw error;

      setActionStates(prev => ({
        ...prev,
        notifyTeam: { loading: false, success: true, error: null }
      }));

      toast({
        title: "Success",
        description: `Deal summary sent to ${recipients?.length || 0} recipient(s)`
      });
    } catch (error) {
      console.error('Error notifying team:', error);
      setActionStates(prev => ({
        ...prev,
        notifyTeam: { loading: false, success: false, error: error.message }
      }));

      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send email"
      });
    }
  };

  const handleGenerateLoanProposal = async (recipients) => {
    if (!deal || !metrics) return;

    setActionStates(prev => ({
      ...prev,
      loanProposal: { loading: true, success: false, error: null, downloadUrl: null }
    }));

    try {
      const { supabase } = await import('@/lib/customSupabaseClient');
      const shareUrl = await getOrCreateShareUrl();

      const borrowerName = (currentUser?.email || '').split('@')[0] || '';
      const defaultLoanTerms = {
        loanAmount: Math.round((deal.purchasePrice || deal.purchase_price || 0) + (deal.rehab_costs || deal.rehabCosts || 0)),
        interestRate: 10,
        termMonths: 12,
        points: 2,
      };
      const defaultBorrower = {
        name: borrowerName,
        experience: '3-5 Deals',
        creditScore: '720+',
        liquidity: 50000,
        trackRecord: 'Track record available upon request.',
      };

      // Generate Waterford-style HTML, render in hidden iframe, html2pdf → arrayBuffer
      const proposalHtml = generateLoanProposalHtml({ deal, metrics, loanTerms: defaultLoanTerms, borrowerInfo: defaultBorrower, shareUrl });
      const proposalArrayBuffer = await new Promise((resolve, reject) => {
        // Wrapper keeps iframe in the render tree (so html2canvas can capture it)
        // while being invisible to the user. Width must match the content layout.
        const wrapper = document.createElement('div');
        wrapper.style.cssText =
          'position:fixed;top:0;left:0;width:900px;height:800px;' +
          'overflow:hidden;opacity:0.001;pointer-events:none;z-index:2147483647;';
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'width:900px;height:800px;border:none;display:block;';
        iframe.srcdoc = proposalHtml;
        wrapper.appendChild(iframe);
        document.body.appendChild(wrapper);
        const removeWrapper = () => { try { document.body.removeChild(wrapper); } catch { /* ignore */ } };
        const onLoad = () => {
          try {
            const body = iframe.contentDocument?.body;
            if (!body) {
              removeWrapper();
              reject(new Error('Iframe body not available'));
              return;
            }
            const opt = {
              margin: 10,
              filename: `Loan_Proposal_${(deal.address || 'Deal').toString().replace(/\s+/g, '_')}.pdf`,
              html2canvas: { scale: 2, useCORS: true, allowTaint: true, scrollX: 0, scrollY: 0 },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
              pagebreak: { mode: ['avoid-all', 'css', 'legacy'], before: '.slide', after: '.slide' },
            };
            html2pdf()
              .set(opt)
              .from(body)
              .outputPdf('arraybuffer')
              .then((ab) => {
                removeWrapper();
                resolve(ab);
              })
              .catch((err) => {
                removeWrapper();
                reject(err);
              });
          } catch (e) {
            removeWrapper();
            reject(e);
          }
        };
        iframe.onload = onLoad;
        iframe.onerror = () => {
          removeWrapper();
          reject(new Error('Iframe failed to load'));
        };
      });

      const proposalBase64 = arrayBufferToBase64(proposalArrayBuffer);
      const proposalPath = buildDealReportPath({ dealId, type: 'loan-proposal', ext: 'pdf' });
      let downloadUrl;
      try {
        const result = await uploadReportAndCreateSignedUrl({
          supabase,
          path: proposalPath,
          arrayBuffer: proposalArrayBuffer,
          contentType: 'application/pdf',
        });
        downloadUrl = result.signedUrl;
      } catch (uploadErr) {
        downloadUrl = undefined;
      }

      const { data, error } = await supabase.functions.invoke('generate-loan-proposal', {
        body: {
          dealId,
          recipients: recipients || [],
          downloadUrl,
          shareUrl,
          pdfBase64: proposalBase64,
          pdfFileName: `Loan_Proposal_${(deal.address || 'Deal').toString().replace(/\s+/g, '_')}.pdf`,
          deal: {
            address: deal.address,
            purchasePrice: deal.purchasePrice || deal.purchase_price,
            arv: deal.arv,
            rehabCosts: deal.rehab_costs || deal.rehabCosts,
            zipCode: deal.zipCode || deal.zip_code,
            bedrooms: deal.bedrooms,
            bathrooms: deal.bathrooms,
            sqft: deal.sqft
          },
          metrics: {
            netProfit: metrics.netProfit,
            roi: metrics.roi,
            score: metrics.score,
            ltv: metrics.ltv,
            cashOnCash: metrics.cashOnCash
          },
          rehabSOW: deal.rehabSow,
          propertyIntelligence: deal.propertyIntelligence,
          userEmail: currentUser.email
        }
      });

      if (error) throw error;

      setActionStates(prev => ({
        ...prev,
        loanProposal: {
          loading: false,
          success: true,
          error: null,
          downloadUrl: downloadUrl ?? data?.downloadUrl
        }
      }));

      toast({
        title: "Success",
        description: recipients?.length
          ? `Loan proposal sent to ${recipients.length} recipient(s)`
          : "Loan proposal generated successfully"
      });

      if (downloadUrl) window.open(downloadUrl, '_blank');
      else if (data?.downloadUrl) window.open(data.downloadUrl, '_blank');
    } catch (error) {
      console.error('Error generating loan proposal:', error);
      setActionStates(prev => ({
        ...prev,
        loanProposal: { loading: false, success: false, error: error.message, downloadUrl: null }
      }));

      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate loan proposal"
      });
    }
  };

  const onConfirmRecipients = () => {
    if (!canConfirmRecipients) return;
    closeRecipientDialog();
    if (recipientDialogOpen === 'notify') {
      handleNotifyTeam(allRecipients);
    } else if (recipientDialogOpen === 'loanProposal') {
      handleGenerateLoanProposal(allRecipients);
    } else if (recipientDialogOpen === 'exportPackage') {
      handleExportPackage(allRecipients);
    } else if (recipientDialogOpen === 'emailBusinessDeck') {
      handleGenerateBusinessDeck({ recipients: allRecipients, audience: 'internal' });
    } else if (recipientDialogOpen === 'emailLenderDeck') {
      handleGenerateBusinessDeck({ recipients: allRecipients, audience: 'lender' });
    }
  };

  const downloadArrayBuffer = (arrayBuffer, fileName) => {
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'deck.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleGenerateBusinessDeck = async ({ recipients, audience }) => {
    if (!deal || !metrics) return;
    const stateKey = audience === 'lender' ? 'lenderDeck' : 'businessDeck';

    setActionStates((prev) => ({
      ...prev,
      [stateKey]: { loading: true, success: false, error: null, downloadUrl: null, deckHtml: null, slideStructureNote: null },
    }));

    try {
      const { supabase } = await import('@/lib/customSupabaseClient');
      const shareUrl = await getOrCreateShareUrl();

      const timelineProjections = calculateTimelineProjections(deal, metrics);
      const payload = buildActionHubAnalysisPayload({
        deal,
        metrics,
        actionType: audience === 'lender' ? 'lenderDeck' : 'generateDeck',
        audience,
        recipients: recipients || [],
        userEmail: currentUser?.email,
      });

      const borrowerName =
        (currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || '').trim() ||
        (currentUser?.email || '').split('@')[0] ||
        '';
      const { data: deckData, error: deckErr } = await supabase.functions.invoke('generate-business-deck', {
        body: {
          ...payload,
          timelineProjections,
          shareUrl,
          userInfo: {
            name: borrowerName,
            email: currentUser?.email,
            company: currentUser?.user_metadata?.company || undefined,
          },
          loanTerms: audience === 'lender'
            ? {
                loanAmount: Math.round((deal.purchasePrice || deal.purchase_price || 0) + (deal.rehab_costs || deal.rehabCosts || 0)),
                ltvArv: 80,
                termMonths: 12,
              }
            : undefined,
        },
      });
      if (deckErr) throw deckErr;
      if (!deckData?.deckHtml) throw new Error('Deck generator returned no HTML');

      const baseName = `${audience === 'lender' ? 'lender-deck' : 'business-deck'}-${(deal.address || 'deal').toString().replace(/\s+/g, '_')}`;
      const { arrayBuffer, fileName } = await renderBusinessDeckPdfArrayBuffer({
        deckHtml: deckData.deckHtml,
        fileBaseName: baseName,
      });

      const pdfBase64 = arrayBufferToBase64(arrayBuffer);
      const reportPath = buildDealReportPath({
        dealId,
        type: audience === 'lender' ? 'lender-deck' : 'business-deck',
        ext: 'pdf',
      });

      let downloadUrl;
      try {
        const result = await uploadReportAndCreateSignedUrl({
          supabase,
          path: reportPath,
          arrayBuffer,
          contentType: 'application/pdf',
        });
        downloadUrl = result.signedUrl;
      } catch (uploadErr) {
        downloadUrl = undefined;
      }

      if (Array.isArray(recipients) && recipients.length) {
        const { error: emailErr } = await supabase.functions.invoke('send-business-deck', {
          body: {
            recipients,
            downloadUrl,
            shareUrl,
            pdfBase64,
            pdfFileName: fileName,
            deckTitle: audience === 'lender' ? 'Lender Deck' : 'Business Deck',
            deal: {
              address: deal.address,
              purchasePrice: deal.purchasePrice || deal.purchase_price,
              arv: deal.arv,
              rehabCosts: deal.rehab_costs || deal.rehabCosts,
              zipCode: deal.zipCode || deal.zip_code,
            },
            metrics: {
              netProfit: metrics.netProfit,
              roi: metrics.roi,
              score: metrics.score,
              risk: metrics.risk,
            },
          },
        });
        if (emailErr) throw emailErr;
      }

      const slideStructureNote =
        deckData?.slideCount != null && deckData?.slideStructureRef
          ? `Slide order follows ${deckData.slideStructureRef} (AIDA, ${deckData.slideCount} slides).`
          : null;
      setActionStates((prev) => ({
        ...prev,
        [stateKey]: {
          loading: false,
          success: true,
          error: null,
          downloadUrl: downloadUrl ?? null,
          deckHtml: deckData.deckHtml ?? null,
          slideStructureNote,
        },
      }));

      toast({
        title: 'Success',
        description: recipients?.length
          ? `Deck generated and sent to ${recipients.length} recipient(s)`
          : 'Deck generated successfully',
      });

      if (downloadUrl) window.open(downloadUrl, '_blank');
      else downloadArrayBuffer(arrayBuffer, fileName);
    } catch (error) {
      console.error('Error generating deck:', error);
      setActionStates((prev) => ({
        ...prev,
        [audience === 'lender' ? 'lenderDeck' : 'businessDeck']: {
          loading: false,
          success: false,
          error: error.message || String(error),
          downloadUrl: null,
        },
      }));
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate deck',
      });
    }
  };

  const handleExportFullAnalysis = async () => {
    if (!deal || !metrics) return;
    setActionStates((prev) => ({
      ...prev,
      exportAnalysis: { loading: true, success: false, error: null },
    }));

    try {
      const doc = generateFullAnalysisReportPDF({
        deal,
        metrics,
        propertyIntelligence: deal.propertyIntelligence,
        rehabSow: deal.rehabSow,
        scenarios: deal.scenarios,
        notes: deal.notes,
      });

      const safeAddr = (deal.address || 'deal')
        .toString()
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase()
        .slice(0, 40);
      const fileName = `full-analysis-${safeAddr}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      setActionStates((prev) => ({
        ...prev,
        exportAnalysis: { loading: false, success: true, error: null },
      }));

      toast({
        title: 'PDF Generated',
        description: 'Full analysis report downloaded.',
      });
    } catch (error) {
      console.error('Error exporting full analysis:', error);
      setActionStates((prev) => ({
        ...prev,
        exportAnalysis: { loading: false, success: false, error: error?.message || 'Failed to generate PDF' },
      }));
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: error?.message || 'Could not generate PDF.',
      });
    }
  };

  const handleExportFullAnalysisHtml = async () => {
    if (!deal || !metrics) return;
    try {
      let shareUrl;
      try {
        shareUrl = await getOrCreateShareUrl();
      } catch {
        shareUrl = undefined;
      }
      const html = generateFullAnalysisReportHtml({
        deal,
        metrics,
        propertyIntelligence: deal.propertyIntelligence,
        rehabSow: deal.rehabSow,
        scenarios: deal.scenarios,
        notes: deal.notes,
        shareUrl,
      });
      const safeAddr = (deal.address || 'deal').toString().replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `full-analysis-${safeAddr}-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'HTML Downloaded', description: 'Full analysis report saved as HTML.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Export Failed', description: e?.message || 'Could not generate HTML.' });
    }
  };

  const handleDownloadDeckHtml = (stateKey) => {
    const state = actionStates[stateKey];
    const html = state?.deckHtml;
    if (!html) {
      toast({ variant: 'destructive', title: 'No deck available', description: 'Generate the deck first.' });
      return;
    }
    const safeAddr = (deal?.address || 'deck').toString().replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
    const prefix = stateKey === 'lenderDeck' ? 'lender-deck' : 'business-deck';
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prefix}-${safeAddr}-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'HTML Downloaded', description: 'Deck saved as HTML. Open in browser and use Print → Save as PDF if needed.' });
  };

  const handleDownloadLoanProposalHtml = async () => {
    if (!deal || !metrics) return;
    let shareUrl = '';
    try {
      shareUrl = await getOrCreateShareUrl();
    } catch { /* ignore */ }
    const borrowerName = (currentUser?.email || '').split('@')[0] || '';
    const defaultLoanTerms = {
      loanAmount: Math.round((deal.purchasePrice || deal.purchase_price || 0) + (deal.rehab_costs || deal.rehabCosts || 0)),
      interestRate: 10,
      termMonths: 12,
      points: 2,
    };
    const defaultBorrower = {
      name: borrowerName,
      experience: '3-5 Deals',
      creditScore: '720+',
      liquidity: 50000,
      trackRecord: 'Track record available upon request.',
    };
    const html = generateLoanProposalHtml({
      deal,
      metrics,
      loanTerms: defaultLoanTerms,
      borrowerInfo: defaultBorrower,
      shareUrl,
    });
    const safeAddr = (deal.address || 'proposal').toString().replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan-proposal-${safeAddr}-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'HTML Downloaded', description: 'Loan proposal saved as HTML. Open in browser and use Print → Save as PDF if needed.' });
  };

  const handleExportPackage = async (recipients) => {
    if (!deal || !metrics) return;

    setActionStates(prev => ({
      ...prev,
      exportPackage: { loading: true, success: false, error: null, downloadUrl: null }
    }));

    try {
      const { supabase } = await import('@/lib/customSupabaseClient');
      const shareUrl = await getOrCreateShareUrl();
      const { data, error } = await supabase.functions.invoke('export-deal-package', {
        body: {
          dealId,
          recipients: recipients || [],
          deal,
          metrics,
          shareUrl,
          propertyIntelligence: deal.propertyIntelligence,
          rehabSOW: deal.rehabSow
        }
      });

      if (error) throw error;

      setActionStates(prev => ({
        ...prev,
        exportPackage: { 
          loading: false, 
          success: true, 
          error: null, 
          downloadUrl: data.downloadUrl 
        }
      }));

      toast({
        title: "Success",
        description: recipients?.length
          ? `Deal package exported and sent to ${recipients.length} recipient(s)`
          : "Deal package exported successfully"
      });

      // Open download URL if available
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Error exporting package:', error);
      setActionStates(prev => ({
        ...prev,
        exportPackage: { loading: false, success: false, error: error.message, downloadUrl: null }
      }));

      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to export deal package"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted flex items-center justify-center">
        <div className="text-foreground text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading deal...</p>
        </div>
      </div>
    );
  }

  if (!deal || !metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted flex items-center justify-center">
        <div className="text-foreground text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-destructive" />
          <p>Deal not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted px-4 py-8">
      <Helmet><title>Deal Action Hub - {deal.address} | FlipIQ</title></Helmet>
      <Breadcrumb />

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Deal Action Hub</h1>
          <p className="text-muted-foreground">{deal.address}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm items-center">
            <span className="text-muted-foreground">ARV: <span className="text-foreground font-semibold">${(deal.arv || 0).toLocaleString()}</span></span>
            <span className="text-muted-foreground">Purchase: <span className="text-foreground font-semibold">${(deal.purchasePrice || deal.purchase_price || 0).toLocaleString()}</span></span>
            <span className="text-muted-foreground">Net Profit: <span className={`font-semibold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>${Math.round(metrics.netProfit || 0).toLocaleString()}</span></span>
            <span className="text-muted-foreground">Deal Score: <span className="text-foreground font-semibold">{metrics.score || 0}/100</span></span>
            <Button variant="ghost" size="sm" onClick={handleCopyShareLink} className="gap-2">
              <Share2 className="w-4 h-4" /> Copy share link
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Notify Team Card */}
          <Card className="bg-card border-2 border-dashed border-border hover:border-primary transition-colors shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-8 h-8 text-primary" />
                <CardTitle className="text-foreground">Notify Team</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Share this deal with your core team — instantly
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Choose team members or add emails, then send the deal summary.
                </p>
                {actionStates.notifyTeam.success ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Email sent successfully</span>
                  </div>
                ) : actionStates.notifyTeam.error ? (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{actionStates.notifyTeam.error}</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => openRecipientDialog('notify')}
                    disabled={actionStates.notifyTeam.loading}
                    variant="outline"
                    className="w-full border-2 border-border hover:border-primary text-foreground hover:text-primary"
                  >
                    {actionStates.notifyTeam.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Notify Team
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Export Full Analysis Card */}
          <Card className="bg-card border border-primary/20 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8 text-primary" />
                <CardTitle className="text-foreground">Export Full Analysis</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Download a presentation-style PDF report of the entire deal
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  <p>Includes (when available):</p>
                  <ul className="list-disc list-inside space-y-0.5 mt-1">
                    <li>Executive summary & key KPIs</li>
                    <li>Financial breakdown + cost mix</li>
                    <li>Property intelligence + comps</li>
                    <li>Rehab scope summary</li>
                  </ul>
                </div>
                {actionStates.exportAnalysis.success ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PDF downloaded</span>
                  </div>
                ) : actionStates.exportAnalysis.error ? (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{actionStates.exportAnalysis.error}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleExportFullAnalysis}
                      disabled={actionStates.exportAnalysis.loading}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {actionStates.exportAnalysis.loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Export Full Analysis (PDF)
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleExportFullAnalysisHtml}
                      variant="outline"
                      className="w-full"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Download as HTML
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generate Loan Proposal Card */}
          <Card className="bg-gradient-to-br from-muted to-muted border border-primary/20 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8 text-primary" />
                <CardTitle className="text-foreground">Generate Loan Proposal</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Create a lender-ready loan package — in seconds
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  <p>Includes:</p>
                  <ul className="list-disc list-inside space-y-0.5 mt-1">
                    <li>Deal analysis & financials</li>
                    <li>Rehab SOW</li>
                    <li>Comps & market data</li>
                    <li>Branded PDF format</li>
                  </ul>
                </div>
                {actionStates.loanProposal.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Proposal generated</span>
                    </div>
                    {actionStates.loanProposal.downloadUrl && (
                      <Button
                        onClick={() => window.open(actionStates.loanProposal.downloadUrl, '_blank')}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    )}
                    <Button
                      onClick={handleDownloadLoanProposalHtml}
                      variant="outline"
                      className="w-full"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Download as HTML
                    </Button>
                  </div>
                ) : actionStates.loanProposal.error ? (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{actionStates.loanProposal.error}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={() => openRecipientDialog('loanProposal')}
                      disabled={actionStates.loanProposal.loading}
                      className="w-full bg-gradient-to-r from-primary to-accentBrand hover:from-primary/90 hover:to-accentBrand/90 text-primary-foreground"
                    >
                      {actionStates.loanProposal.loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate Loan Proposal (PDF)
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleDownloadLoanProposalHtml}
                      variant="outline"
                      className="w-full"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Download as HTML
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Export Full Package Card */}
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Download className="w-8 h-8 text-muted-foreground" />
                <CardTitle className="text-foreground">Export Full Deal Package</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Download everything: analysis, rehab SOW, charts, comps
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  <p>Package includes:</p>
                  <ul className="list-disc list-inside space-y-0.5 mt-1">
                    <li>Deal Summary PDF</li>
                    <li>Rehab SOW (Markdown)</li>
                    <li>Comps Data (CSV)</li>
                    <li>Charts (PNG)</li>
                  </ul>
                </div>
                {actionStates.exportPackage.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Package ready</span>
                    </div>
                    {actionStates.exportPackage.downloadUrl && (
                      <Button
                        onClick={() => window.open(actionStates.exportPackage.downloadUrl, '_blank')}
                        variant="secondary"
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download .zip
                      </Button>
                    )}
                  </div>
                ) : actionStates.exportPackage.error ? (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{actionStates.exportPackage.error}</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => openRecipientDialog('exportPackage')}
                    disabled={actionStates.exportPackage.loading}
                    variant="secondary"
                    className="w-full"
                  >
                    {actionStates.exportPackage.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Packaging...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export Full Deal Package (.zip)
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generate Business Deck Card */}
          <Card className="bg-card border border-primary/20 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8 text-primary" />
                <CardTitle className="text-foreground">Generate Business Deck</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Executive-ready presentation deck (PDF)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {actionStates.businessDeck.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Deck generated</span>
                    </div>
                    {actionStates.businessDeck.downloadUrl && (
                      <Button
                        onClick={() => window.open(actionStates.businessDeck.downloadUrl, '_blank')}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    )}
                    {actionStates.businessDeck.deckHtml && (
                      <Button
                        onClick={() => handleDownloadDeckHtml('businessDeck')}
                        variant="outline"
                        className="w-full"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Download as HTML
                      </Button>
                    )}
                    {actionStates.businessDeck.slideStructureNote && (
                      <p className="text-xs text-muted-foreground">{actionStates.businessDeck.slideStructureNote}</p>
                    )}
                  </div>
                ) : actionStates.businessDeck.error ? (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{actionStates.businessDeck.error}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleGenerateBusinessDeck({ audience: 'internal' })}
                      disabled={actionStates.businessDeck.loading}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {actionStates.businessDeck.loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate & Download (PDF)
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => openRecipientDialog('emailBusinessDeck')}
                      disabled={actionStates.businessDeck.loading}
                      variant="outline"
                      className="w-full"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email Deck
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generate Lender Deck Card */}
          <Card className="bg-gradient-to-br from-muted to-muted border border-primary/20 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8 text-primary" />
                <CardTitle className="text-foreground">Generate Lender Deck</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Lender-focused deck (PDF)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {actionStates.lenderDeck.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Deck generated</span>
                    </div>
                    {actionStates.lenderDeck.downloadUrl && (
                      <Button
                        onClick={() => window.open(actionStates.lenderDeck.downloadUrl, '_blank')}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    )}
                    {actionStates.lenderDeck.deckHtml && (
                      <Button
                        onClick={() => handleDownloadDeckHtml('lenderDeck')}
                        variant="outline"
                        className="w-full"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Download as HTML
                      </Button>
                    )}
                    {actionStates.lenderDeck.slideStructureNote && (
                      <p className="text-xs text-muted-foreground">{actionStates.lenderDeck.slideStructureNote}</p>
                    )}
                  </div>
                ) : actionStates.lenderDeck.error ? (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{actionStates.lenderDeck.error}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleGenerateBusinessDeck({ audience: 'lender' })}
                      disabled={actionStates.lenderDeck.loading}
                      className="w-full bg-gradient-to-r from-primary to-accentBrand hover:from-primary/90 hover:to-accentBrand/90 text-primary-foreground"
                    >
                      {actionStates.lenderDeck.loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate & Download (PDF)
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => openRecipientDialog('emailLenderDeck')}
                      disabled={actionStates.lenderDeck.loading}
                      variant="outline"
                      className="w-full border-primary text-primary hover:bg-primary/10"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email Lender Deck
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={!!recipientDialogOpen} onOpenChange={(open) => !open && closeRecipientDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {recipientDialogOpen === 'notify'
                  ? 'Select recipients to notify'
                  : recipientDialogOpen === 'loanProposal'
                    ? 'Select recipients for loan proposal'
                    : recipientDialogOpen === 'exportPackage'
                      ? 'Select recipients for full deal package'
                      : recipientDialogOpen === 'emailBusinessDeck'
                        ? 'Select recipients for business deck'
                        : 'Select recipients for lender deck'}
              </DialogTitle>
              <DialogDescription>
                Choose existing team members and/or add email addresses. At least one recipient is required.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Team members</p>
                <ul className="space-y-2 max-h-32 overflow-y-auto rounded-md border border-input bg-muted/30 p-2">
                  {DEFAULT_TEAM_EMAILS.map((email) => (
                    <li key={email} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`team-${email}`}
                        checked={selectedTeamEmails.includes(email)}
                        onChange={() => toggleTeamEmail(email)}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label htmlFor={`team-${email}`} className="text-sm text-foreground cursor-pointer flex-1">
                        {email}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Add email(s)</p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com (comma or space separated)"
                    value={newEmailInput}
                    onChange={(e) => {
                      setNewEmailInput(e.target.value);
                      setEmailInputError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomEmails())}
                    className="flex-1"
                  />
                  <Button type="button" variant="secondary" size="icon" onClick={addCustomEmails} title="Add">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {emailInputError && (
                  <p className="text-xs text-destructive mt-1">{emailInputError}</p>
                )}
                {customEmails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {customEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-0.5 text-xs font-medium"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => removeCustomEmail(email)}
                          className="rounded-full hover:bg-primary/30 p-0.5"
                          aria-label={`Remove ${email}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {allRecipients.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {allRecipients.length} recipient(s) selected
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeRecipientDialog}>
                Cancel
              </Button>
              <Button onClick={onConfirmRecipients} disabled={!canConfirmRecipients}>
                {recipientDialogOpen === 'notify'
                  ? 'Send to selected'
                  : recipientDialogOpen === 'loanProposal'
                    ? 'Generate & send to selected'
                    : recipientDialogOpen === 'exportPackage'
                      ? 'Export & send to selected'
                      : recipientDialogOpen === 'emailBusinessDeck'
                        ? 'Generate & email deck'
                        : 'Generate & email deck'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DealActionHub;
