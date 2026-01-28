
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, DollarSign, Hammer, RefreshCw, ChevronDown, ChevronRight, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import Breadcrumb from '@/components/Breadcrumb';
import { dealService } from '@/services/dealService';
import { logDataFlow, validateInputs } from '@/utils/dataFlowDebug';

const InputSection = ({ title, icon: Icon, children, total }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="bg-white backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Icon size={20} /></div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          {total !== undefined && <span className="text-sm font-mono text-green-600 font-bold">Total: ${total.toLocaleString()}</span>}
          {isOpen ? <ChevronDown size={20} className="text-gray-600"/> : <ChevronRight size={20} className="text-gray-600"/>}
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DealInputForm = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const editId = searchParams.get('id');

  const [formData, setFormData] = useState({
    address: '', status: 'Analyzing', zipCode: '', bedrooms: '', bathrooms: '', sqft: '', yearBuilt: '',
    purchasePrice: '', arv: '', downPaymentPercent: '20',
    hardMoneyRate: '10', hardMoneyPoints: '2',
    rehabCosts: '', rehabCategory: 'Cosmetic', contingencyPercent: '10', rehabOverrunPercent: '0',
    holdingMonths: '6', propertyTax: '200', insurance: '150', utilities: '200', hoa: '0', lawnMaintenance: '100',
    realtorCommission: '6', closingCostsSelling: '3', stagingCost: '2000', marketingCost: '500',
    closingCostsBuying: '3000', inspectionCost: '500', appraisalCost: '500', titleInsurance: '1500', transferTaxRate: '0',
    buyerFinancingFallthrough: '0', marketAppreciationPercent: '0',
    permitFees: '0', permitDelayMonths: '0',
    activeScenarioId: null
  });

  useEffect(() => {
    if (editId && currentUser) {
      loadDealData();
    }
  }, [editId, currentUser]);

  const loadDealData = async () => {
    try {
      logDataFlow('LOADING_DEAL_FOR_EDIT', { editId }, new Date());
      const data = await dealService.loadDeal(editId, currentUser.id);
      logDataFlow('LOADED_DEAL_DATA', data, new Date());
      setFormData(prev => ({...prev, ...data}));
    } catch (error) {
      console.error("Load Error:", error);
      toast({variant: "destructive", title: "Error", description: "Could not load deal data."});
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRehabCalc = () => {
     const sqft = parseFloat(formData.sqft || 0);
     const rates = { 'Cosmetic': 25, 'Moderate': 50, 'Heavy': 85 };
     const cost = sqft * (rates[formData.rehabCategory] || 25);
     setFormData(prev => ({...prev, rehabCosts: cost}));
     toast({title: "Rehab Cost Calculated", description: `$${cost.toLocaleString()} based on ${formData.rehabCategory} rate`});
  };

  const validateForm = (data) => {
    const required = ['address', 'purchasePrice', 'arv'];
    const numericFields = ['purchasePrice', 'arv', 'rehabCosts', 'sqft', 'bedrooms', 'bathrooms'];
    
    // Check required presence
    const missing = required.filter(f => !data[f]);
    if (missing.length > 0) return { valid: false, message: `Missing required fields: ${missing.join(', ')}` };
    
    // Check numeric validity
    for (const field of numericFields) {
        if (data[field] && isNaN(Number(data[field]))) {
            return { valid: false, message: `${field} must be a number` };
        }
        if (data[field] && Number(data[field]) < 0) {
            return { valid: false, message: `${field} cannot be negative` };
        }
    }

    return { valid: true };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    console.log('Inputs to calculator:', formData);
    logDataFlow('FORM_INPUTS_BEFORE_SAVE', formData, new Date());

    // Validation
    const validation = validateForm(formData);
    if (!validation.valid) {
        logDataFlow('VALIDATION_FAILED', validation.message, new Date());
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: validation.message
        });
        setIsLoading(false);
        return;
    }

    const debugValidation = validateInputs(formData);
    if (!debugValidation.isValid) {
        // Fallback to strict validation utils
        toast({
            variant: "destructive",
            title: "Missing Required Fields",
            description: debugValidation.issues.slice(0, 3).join(', ')
        });
        setIsLoading(false);
        return;
    }

    try {
       // Save using service
       const savedDeal = await dealService.saveDeal({ ...formData, id: editId }, currentUser?.id);
       
       logDataFlow('SAVED_TO_DB', savedDeal, new Date());

       toast({ title: "Success", description: "Deal saved successfully." });
       navigate(`/deal-analysis?id=${savedDeal.id}`);
    } catch(err) {
       console.error(err);
       logDataFlow('SAVE_ERROR', err.message, new Date());
       toast({variant: "destructive", title: "Error", description: err.message});
    } finally { setIsLoading(false); }
  };

  // Section Totals for Display
  const acqTotal = (parseFloat(formData.purchasePrice)||0)*(parseFloat(formData.downPaymentPercent)||20)/100 + 
                   (parseFloat(formData.closingCostsBuying)||0) + (parseFloat(formData.inspectionCost)||0) + 
                   (parseFloat(formData.appraisalCost)||0) + (parseFloat(formData.titleInsurance)||0);

  const rehabTotal = parseFloat(formData.rehabCosts)||0;
  const sellingTotal = (parseFloat(formData.arv)||0) * ((parseFloat(formData.realtorCommission)||6)/100 + (parseFloat(formData.closingCostsSelling)||3)/100) + 
                       (parseFloat(formData.stagingCost)||0) + (parseFloat(formData.marketingCost)||0);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 max-w-5xl mx-auto">
      <Helmet><title>New Deal Input | FlipIQ</title></Helmet>
      <Breadcrumb />
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Property Analysis Input</h1>
      
      <form onSubmit={handleSubmit}>
        <InputSection title="A. Property Details" icon={Home}>
            <div className="md:col-span-2">
               <label className="text-gray-700 text-xs">Address</label>
               <input name="address" value={formData.address} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" placeholder="123 Main St" required />
            </div>
            <div><label className="text-gray-400 text-xs">Zip Code</label><input name="zipCode" value={formData.zipCode} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Sqft</label><input name="sqft" type="number" value={formData.sqft} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Beds</label><input name="bedrooms" type="number" value={formData.bedrooms} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Baths</label><input name="bathrooms" type="number" value={formData.bathrooms} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Year Built</label><input name="yearBuilt" type="number" value={formData.yearBuilt} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
        </InputSection>

        <InputSection title="B. Purchase & Acquisition" icon={DollarSign} total={acqTotal}>
            <div><label className="text-gray-700 text-xs">Purchase Price ($)</label><input name="purchasePrice" type="number" value={formData.purchasePrice} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">ARV ($)</label><input name="arv" type="number" value={formData.arv} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Down Payment (%)</label><input name="downPaymentPercent" type="number" value={formData.downPaymentPercent} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Closing Costs ($)</label><input name="closingCostsBuying" type="number" value={formData.closingCostsBuying} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Inspection ($)</label><input name="inspectionCost" type="number" value={formData.inspectionCost} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Appraisal/Title ($)</label><input name="titleInsurance" type="number" value={formData.titleInsurance} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Transfer Tax Rate (%)</label><input name="transferTaxRate" type="number" value={formData.transferTaxRate} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
        </InputSection>

        <InputSection title="C. Financing (Hard Money)" icon={Calculator}>
            <div><label className="text-gray-400 text-xs">Interest Rate (%)</label><input name="hardMoneyRate" type="number" value={formData.hardMoneyRate} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Points (%)</label><input name="hardMoneyPoints" type="number" value={formData.hardMoneyPoints} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Fallthrough Risk (%)</label><input name="buyerFinancingFallthrough" type="number" value={formData.buyerFinancingFallthrough} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
        </InputSection>

        <InputSection title="D. Rehab Costs" icon={Hammer} total={rehabTotal}>
             <div>
                <label className="text-gray-700 text-xs">Category</label>
                <select name="rehabCategory" value={formData.rehabCategory} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900">
                   <option value="Cosmetic">Cosmetic ($25/sf)</option>
                   <option value="Moderate">Moderate ($50/sf)</option>
                   <option value="Heavy">Heavy ($85/sf)</option>
                </select>
             </div>
             <div className="flex items-end gap-2">
                 <div className="flex-1">
                    <label className="text-gray-700 text-xs">Total Budget ($)</label>
                    <input name="rehabCosts" type="number" value={formData.rehabCosts} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" />
                 </div>
                 <Button type="button" size="sm" onClick={handleRehabCalc} className="mb-1"><Calculator size={16}/></Button>
             </div>
             <div><label className="text-gray-400 text-xs">Contingency (%)</label><input name="contingencyPercent" type="number" value={formData.contingencyPercent} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
             <div><label className="text-gray-400 text-xs">Overrun Risk (%)</label><input name="rehabOverrunPercent" type="number" value={formData.rehabOverrunPercent} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
             <div><label className="text-gray-400 text-xs">Permit Fees ($)</label><input name="permitFees" type="number" value={formData.permitFees} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
             <div><label className="text-gray-400 text-xs">Permit Delay (Mo)</label><input name="permitDelayMonths" type="number" value={formData.permitDelayMonths} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
        </InputSection>

        <InputSection title="E. Holding & Timeline" icon={RefreshCw}>
            <div><label className="text-gray-400 text-xs">Holding (Months)</label><input name="holdingMonths" type="number" value={formData.holdingMonths} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Prop Tax (Mo)</label><input name="propertyTax" type="number" value={formData.propertyTax} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Insurance (Mo)</label><input name="insurance" type="number" value={formData.insurance} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Utilities/HOA (Mo)</label><input name="utilities" type="number" value={formData.utilities} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
        </InputSection>

        <InputSection title="F. Selling Costs" icon={DollarSign} total={sellingTotal}>
            <div><label className="text-gray-400 text-xs">Agent Comm (%)</label><input name="realtorCommission" type="number" value={formData.realtorCommission} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Closing Costs (%)</label><input name="closingCostsSelling" type="number" value={formData.closingCostsSelling} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Staging ($)</label><input name="stagingCost" type="number" value={formData.stagingCost} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Marketing ($)</label><input name="marketingCost" type="number" value={formData.marketingCost} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
            <div><label className="text-gray-400 text-xs">Market Appreciation (%)</label><input name="marketAppreciationPercent" type="number" value={formData.marketAppreciationPercent} onChange={handleChange} className="w-full bg-white border border-gray-300 p-2 rounded text-gray-900" /></div>
        </InputSection>

        <div className="flex justify-end gap-4 mt-8 pb-12">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="text-gray-700">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-gold-500 text-slate-900 font-bold px-8">
               {isLoading ? 'Processing...' : 'Analyze Deal'}
            </Button>
        </div>
      </form>
    </div>
  );
};

export default DealInputForm;
