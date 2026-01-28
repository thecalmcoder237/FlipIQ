import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Mail, FileText, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { dealService } from '@/services/dealService';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import Breadcrumb from '@/components/Breadcrumb';

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
    exportPackage: { loading: false, success: false, error: null, downloadUrl: null }
  });

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

  const handleNotifyTeam = async () => {
    if (!deal || !metrics) return;

    setActionStates(prev => ({
      ...prev,
      notifyTeam: { loading: true, success: false, error: null }
    }));

    try {
      const { supabase } = await import('@/lib/customSupabaseClient');
      const { data, error } = await supabase.functions.invoke('send-deal-summary', {
        body: {
          dealId,
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
        description: "Deal summary sent to team members"
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

  const handleGenerateLoanProposal = async () => {
    if (!deal || !metrics) return;

    setActionStates(prev => ({
      ...prev,
      loanProposal: { loading: true, success: false, error: null, downloadUrl: null }
    }));

    try {
      const { supabase } = await import('@/lib/customSupabaseClient');
      const { data, error } = await supabase.functions.invoke('generate-loan-proposal', {
        body: {
          dealId,
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
          downloadUrl: data.downloadUrl 
        }
      }));

      toast({
        title: "Success",
        description: "Loan proposal generated successfully"
      });

      // Open download URL if available
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
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

  const handleExportPackage = async () => {
    if (!deal || !metrics) return;

    setActionStates(prev => ({
      ...prev,
      exportPackage: { loading: true, success: false, error: null, downloadUrl: null }
    }));

    try {
      const { supabase } = await import('@/lib/customSupabaseClient');
      const { data, error } = await supabase.functions.invoke('export-deal-package', {
        body: {
          dealId,
          deal,
          metrics,
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
        description: "Deal package exported successfully"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Loading deal...</p>
        </div>
      </div>
    );
  }

  if (!deal || !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <p>Deal not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <Helmet><title>Deal Action Hub - {deal.address} | FlipIQ</title></Helmet>
      <Breadcrumb />

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Deal Action Hub</h1>
          <p className="text-gray-600">{deal.address}</p>
          <div className="mt-4 flex gap-4 text-sm">
            <span className="text-gray-600">ARV: <span className="text-gray-900 font-semibold">${(deal.arv || 0).toLocaleString()}</span></span>
            <span className="text-gray-600">Purchase: <span className="text-gray-900 font-semibold">${(deal.purchasePrice || deal.purchase_price || 0).toLocaleString()}</span></span>
            <span className="text-gray-600">Net Profit: <span className={`font-semibold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${Math.round(metrics.netProfit || 0).toLocaleString()}</span></span>
            <span className="text-gray-600">Deal Score: <span className="text-gray-900 font-semibold">{metrics.score || 0}/100</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Notify Team Card */}
          <Card className="bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-8 h-8 text-blue-600" />
                <CardTitle className="text-gray-900">Notify Team</CardTitle>
              </div>
              <p className="text-sm text-gray-600">
                Share this deal with your core team — instantly
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Recipients:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>pavelrei.123@gmail.com</li>
                    <li>jesse@pavelreiproperties.com</li>
                    <li>Pasaah33@gmail.com</li>
                    <li>arielsaah@gmail.com</li>
                  </ul>
                </div>
                {actionStates.notifyTeam.success ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Email sent successfully</span>
                  </div>
                ) : actionStates.notifyTeam.error ? (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{actionStates.notifyTeam.error}</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleNotifyTeam}
                    disabled={actionStates.notifyTeam.loading}
                    variant="outline"
                    className="w-full border-2 border-gray-300 hover:border-blue-500 text-gray-700 hover:text-blue-600"
                  >
                    {actionStates.notifyTeam.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Notify Team (4 recipients)
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generate Loan Proposal Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-orange-50 border border-blue-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8 text-blue-600" />
                <CardTitle className="text-gray-900">Generate Loan Proposal</CardTitle>
              </div>
              <p className="text-sm text-gray-600">
                Create a lender-ready loan package — in seconds
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-xs text-gray-600">
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
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    )}
                  </div>
                ) : actionStates.loanProposal.error ? (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{actionStates.loanProposal.error}</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerateLoanProposal}
                    disabled={actionStates.loanProposal.loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white"
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
                )}
              </div>
            </CardContent>
          </Card>

          {/* Export Full Package Card */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Download className="w-8 h-8 text-gray-600" />
                <CardTitle className="text-gray-900">Export Full Deal Package</CardTitle>
              </div>
              <p className="text-sm text-gray-600">
                Download everything: analysis, rehab SOW, charts, comps
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-xs text-gray-600">
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
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{actionStates.exportPackage.error}</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleExportPackage}
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
        </div>
      </div>
    </div>
  );
};

export default DealActionHub;
