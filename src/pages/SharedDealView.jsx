import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dealService } from '@/services/dealService';
import { calculateDealMetrics } from '@/utils/dealCalculations';
import DealAnalysisPage from '@/pages/DealAnalysisPage';
import SharedDealPreview from '@/components/SharedDealPreview';

const SharedDealView = () => {
  const { token } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const loaded = await dealService.loadSharedDeal(token);
        setDeal(loaded);
      } catch (err) {
        console.error('SharedDealView load error:', err);
        setDeal(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-muted">
        <p className="text-foreground">Loading analysis...</p>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center bg-muted px-4">
        <p className="text-foreground text-lg font-medium">Deal not found or link has expired</p>
        <p className="text-muted-foreground text-sm mt-2">
          The share link may be invalid or the deal may have been removed.
        </p>
      </div>
    );
  }

  const metrics = calculateDealMetrics(deal);
  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-6">
        <SharedDealPreview deal={deal} metrics={metrics} />
      </div>
      <DealAnalysisPage
        readOnly
        initialDeal={deal}
        initialInputs={deal}
        initialMetrics={metrics}
      />
    </div>
  );
};

export default SharedDealView;
