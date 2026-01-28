import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { calculate70RuleMAO } from '@/utils/advancedDealCalculations';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const SeventyPercentRule = ({ deal, metrics }) => {
  const [conservative, setConservative] = useState(false);
  
  const mao = calculate70RuleMAO(metrics.arv, metrics.rehabCosts, conservative);
  const difference = mao - deal.purchase_price;
  const isGoodDeal = difference >= 0;

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">The 70% Rule Analysis</h3>
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setConservative(false)}
            className={`px-3 py-1 rounded-md text-sm transition-all ${!conservative ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Aggressive (70%)
          </button>
          <button
            onClick={() => setConservative(true)}
            className={`px-3 py-1 rounded-md text-sm transition-all ${conservative ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Conservative (65%)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex justify-between text-gray-700">
            <span>ARV</span>
            <span className="font-semibold">${metrics.arv.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>x {conservative ? '65%' : '70%'}</span>
            <span className="font-semibold">${(metrics.arv * (conservative ? 0.65 : 0.7)).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-700 pb-2 border-b border-gray-200">
            <span>- Rehab Costs</span>
            <span className="text-red-600 font-semibold">-${metrics.rehabCosts.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="font-bold text-gray-900 text-lg">Target MAO</span>
            <span className="font-bold text-orange-600 text-2xl">${mao.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center p-6 bg-gray-50 rounded-xl border border-gray-200">
          {isGoodDeal ? (
            <CheckCircle2 className="w-12 h-12 text-green-600 mb-2" />
          ) : (
            <AlertCircle className="w-12 h-12 text-red-600 mb-2" />
          )}
          <span className="text-gray-600 mb-2">Your Purchase Price</span>
          <span className="text-2xl font-bold text-gray-900 mb-4">${deal.purchase_price.toLocaleString()}</span>
          
          <div className={`px-4 py-2 rounded-lg font-bold ${isGoodDeal ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
            {isGoodDeal ? 'UNDER MAO by' : 'OVER MAO by'} ${Math.abs(difference).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeventyPercentRule;
