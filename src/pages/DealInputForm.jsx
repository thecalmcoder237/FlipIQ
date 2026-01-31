
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, DollarSign, Hammer, RefreshCw, ChevronDown, ChevronRight, Calculator, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Breadcrumb from '@/components/Breadcrumb';
import { dealService } from '@/services/dealService';
import { logDataFlow, validateInputs } from '@/utils/dataFlowDebug';

const InputSection = ({ title, icon: Icon, children, total }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="bg-card backdrop-blur-sm rounded-xl shadow-sm border border-border mb-4 overflow-hidden">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg"><Icon size={20} className="text-primary" /></div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          {total !== undefined && <span className="text-sm font-mono text-green-600 font-bold">Total: ${total.toLocaleString()}</span>}
          {isOpen ? <ChevronDown size={20} className="text-muted-foreground"/> : <ChevronRight size={20} className="text-muted-foreground"/>}
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
  const [addressValidating, setAddressValidating] = useState(false);
  const [existingDealMatch, setExistingDealMatch] = useState(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const editId = searchParams.get('id');
  const addressInputRef = useRef(null);

  const [formData, setFormData] = useState({
    address: '', status: 'Analyzing', zipCode: '', city: '', county: '', bedrooms: '', bathrooms: '', sqft: '', yearBuilt: '',
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

  const handleCheckDuplicate = async () => {
    const raw = (formData.address || '').trim();
    if (raw.length < 5) {
      toast({ variant: 'destructive', title: 'Address too short', description: 'Enter at least a street number and name (5+ characters).' });
      return;
    }
    setAddressValidating(true);
    setExistingDealMatch(null);
    try {
      if (currentUser?.id) {
        const existing = await dealService.findDealByAddress(currentUser.id, raw, editId);
        if (existing) {
          setExistingDealMatch(existing);
          setDuplicateDialogOpen(true);
          toast({ title: 'Duplicate found', description: 'A deal with this address already exists.' });
        } else {
          toast({ title: 'No duplicate', description: 'No existing deal with this address.' });
        }
      }
    } catch (err) {
      console.error('Check duplicate error:', err);
      toast({ variant: 'destructive', title: 'Check failed', description: err?.message || 'Could not check for duplicate.' });
    } finally {
      setAddressValidating(false);
    }
  };

  const handleLoadExistingDeal = () => {
    setDuplicateDialogOpen(false);
    if (existingDealMatch?.id) navigate(`/deal-analysis?id=${existingDealMatch.id}`);
    setExistingDealMatch(null);
  };

  const handleContinueAsNew = () => {
    setDuplicateDialogOpen(false);
    if (pendingSubmitData) {
      doSave(pendingSubmitData);
      setPendingSubmitData(null);
    }
    setExistingDealMatch(null);
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

  const doSave = async (dataToSave) => {
    setIsLoading(true);
    try {
      const savedDeal = await dealService.saveDeal({ ...dataToSave, id: editId }, currentUser?.id);
      logDataFlow('SAVED_TO_DB', savedDeal, new Date());
      toast({ title: 'Success', description: 'Deal saved successfully.' });
      navigate(`/deal-analysis?id=${savedDeal.id}`);
    } catch (err) {
      console.error(err);
      logDataFlow('SAVE_ERROR', err.message, new Date());
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateForm(formData);
    if (!validation.valid) {
      logDataFlow('VALIDATION_FAILED', validation.message, new Date());
      toast({ variant: 'destructive', title: 'Validation Error', description: validation.message });
      return;
    }
    const debugValidation = validateInputs(formData);
    if (!debugValidation.isValid) {
      toast({
        variant: 'destructive',
        title: 'Missing Required Fields',
        description: debugValidation.issues.slice(0, 3).join(', '),
      });
      return;
    }

    const addressToSave = (formData.address || '').trim();
    const zipToSave = (formData.zipCode || '').trim().replace(/\D/g, '').slice(0, 5);
    const dataToSave = { ...formData, address: addressToSave, zipCode: zipToSave };
    logDataFlow('FORM_INPUTS_BEFORE_SAVE', dataToSave, new Date());

    if (currentUser?.id) {
      const existing = await dealService.findDealByAddress(currentUser.id, addressToSave, editId);
      if (existing) {
        setExistingDealMatch(existing);
        setPendingSubmitData(dataToSave);
        setDuplicateDialogOpen(true);
        return;
      }
    }

    doSave(dataToSave);
  };

  // Section Totals for Display
  const acqTotal = (parseFloat(formData.purchasePrice)||0)*(parseFloat(formData.downPaymentPercent)||20)/100 + 
                   (parseFloat(formData.closingCostsBuying)||0) + (parseFloat(formData.inspectionCost)||0) + 
                   (parseFloat(formData.appraisalCost)||0) + (parseFloat(formData.titleInsurance)||0);

  const rehabTotal = parseFloat(formData.rehabCosts)||0;
  const sellingTotal = (parseFloat(formData.arv)||0) * ((parseFloat(formData.realtorCommission)||6)/100 + (parseFloat(formData.closingCostsSelling)||3)/100) + 
                       (parseFloat(formData.stagingCost)||0) + (parseFloat(formData.marketingCost)||0);

  return (
    <div className="min-h-screen bg-muted px-4 py-8 max-w-5xl mx-auto">
      <Helmet><title>New Deal Input | FlipIQ</title></Helmet>
      <Breadcrumb />
      <h1 className="text-3xl font-bold text-foreground mb-6">Property Analysis Input</h1>
      
      <form onSubmit={handleSubmit}>
        <InputSection title="A. Property Details" icon={Home}>
            <div className="md:col-span-2">
               <label className="text-foreground text-xs">Address</label>
               <div className="flex gap-2 items-center">
                 <input
                   ref={addressInputRef}
                   name="address"
                   value={formData.address}
                   onChange={handleChange}
                   className="flex-1 bg-background border border-input p-2 rounded text-foreground"
                   placeholder="123 Main St, City, State ZIP"
                   required
                 />
                 <Button type="button" variant="outline" size="sm" onClick={handleCheckDuplicate} disabled={addressValidating || (formData.address || '').trim().length < 5} className="shrink-0 border-border text-foreground hover:bg-accent" title="Check for existing deal with this address">
                   {addressValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                   {addressValidating ? ' Checking...' : ' Check duplicate'}
                 </Button>
               </div>
               <p className="text-xs text-muted-foreground mt-1">Realie: street line 1 (e.g. 123 Main St) or full address; 5-digit ZIP required for state.</p>
            </div>
            <div><label className="text-muted-foreground text-xs">Zip Code (required)</label><input name="zipCode" value={formData.zipCode} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" placeholder="5-digit ZIP" maxLength={5} required /></div>
            <div><label className="text-muted-foreground text-xs">City (optional)</label><input name="city" value={formData.city} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" placeholder="City" /></div>
            <div><label className="text-muted-foreground text-xs">County (optional)</label><input name="county" value={formData.county} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" placeholder="County" /></div>
            <p className="text-xs text-muted-foreground md:col-span-2">Realie: if you enter City, also enter County (required for address lookup).</p>
            <div><label className="text-muted-foreground text-xs">Sqft</label><input name="sqft" type="number" value={formData.sqft} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Beds</label><input name="bedrooms" type="number" value={formData.bedrooms} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Baths</label><input name="bathrooms" type="number" value={formData.bathrooms} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Year Built</label><input name="yearBuilt" type="number" value={formData.yearBuilt} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
        </InputSection>

        <InputSection title="B. Purchase & Acquisition" icon={DollarSign} total={acqTotal}>
            <div><label className="text-foreground text-xs">Purchase Price ($)</label><input name="purchasePrice" type="number" value={formData.purchasePrice} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">ARV ($)</label><input name="arv" type="number" value={formData.arv} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Down Payment (%)</label><input name="downPaymentPercent" type="number" value={formData.downPaymentPercent} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Closing Costs ($)</label><input name="closingCostsBuying" type="number" value={formData.closingCostsBuying} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Inspection ($)</label><input name="inspectionCost" type="number" value={formData.inspectionCost} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Appraisal/Title ($)</label><input name="titleInsurance" type="number" value={formData.titleInsurance} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Transfer Tax Rate (%)</label><input name="transferTaxRate" type="number" value={formData.transferTaxRate} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
        </InputSection>

        <InputSection title="C. Financing (Hard Money)" icon={Calculator}>
            <div><label className="text-muted-foreground text-xs">Interest Rate (%)</label><input name="hardMoneyRate" type="number" value={formData.hardMoneyRate} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Points (%)</label><input name="hardMoneyPoints" type="number" value={formData.hardMoneyPoints} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Fallthrough Risk (%)</label><input name="buyerFinancingFallthrough" type="number" value={formData.buyerFinancingFallthrough} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
        </InputSection>

        <InputSection title="D. Rehab Costs" icon={Hammer} total={rehabTotal}>
             <div>
                <label className="text-foreground text-xs">Category</label>
                <select name="rehabCategory" value={formData.rehabCategory} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground">
                   <option value="Cosmetic">Cosmetic ($25/sf)</option>
                   <option value="Moderate">Moderate ($50/sf)</option>
                   <option value="Heavy">Heavy ($85/sf)</option>
                </select>
             </div>
             <div className="flex items-end gap-2">
                 <div className="flex-1">
                    <label className="text-foreground text-xs">Total Budget ($)</label>
                    <input name="rehabCosts" type="number" value={formData.rehabCosts} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" />
                 </div>
                 <Button type="button" size="sm" onClick={handleRehabCalc} className="mb-1 bg-primary text-primary-foreground hover:bg-primary/90"><Calculator size={16}/></Button>
             </div>
             <div><label className="text-muted-foreground text-xs">Contingency (%)</label><input name="contingencyPercent" type="number" value={formData.contingencyPercent} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
             <div><label className="text-muted-foreground text-xs">Overrun Risk (%)</label><input name="rehabOverrunPercent" type="number" value={formData.rehabOverrunPercent} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
             <div><label className="text-muted-foreground text-xs">Permit Fees ($)</label><input name="permitFees" type="number" value={formData.permitFees} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
             <div><label className="text-muted-foreground text-xs">Permit Delay (Mo)</label><input name="permitDelayMonths" type="number" value={formData.permitDelayMonths} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
        </InputSection>

        <InputSection title="E. Holding & Timeline" icon={RefreshCw}>
            <div><label className="text-muted-foreground text-xs">Holding (Months)</label><input name="holdingMonths" type="number" value={formData.holdingMonths} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Prop Tax (Mo)</label><input name="propertyTax" type="number" value={formData.propertyTax} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Insurance (Mo)</label><input name="insurance" type="number" value={formData.insurance} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Utilities/HOA (Mo)</label><input name="utilities" type="number" value={formData.utilities} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
        </InputSection>

        <InputSection title="F. Selling Costs" icon={DollarSign} total={sellingTotal}>
            <div><label className="text-muted-foreground text-xs">Agent Comm (%)</label><input name="realtorCommission" type="number" value={formData.realtorCommission} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Closing Costs (%)</label><input name="closingCostsSelling" type="number" value={formData.closingCostsSelling} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Staging ($)</label><input name="stagingCost" type="number" value={formData.stagingCost} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Marketing ($)</label><input name="marketingCost" type="number" value={formData.marketingCost} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
            <div><label className="text-muted-foreground text-xs">Market Appreciation (%)</label><input name="marketAppreciationPercent" type="number" value={formData.marketAppreciationPercent} onChange={handleChange} className="w-full bg-background border border-input p-2 rounded text-foreground" /></div>
        </InputSection>

        <div className="flex justify-end gap-4 mt-8 pb-12">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="text-foreground hover:bg-accent">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8">
               {isLoading ? 'Processing...' : 'Analyze Deal'}
            </Button>
        </div>
      </form>

      <Dialog open={duplicateDialogOpen} onOpenChange={(open) => { if (!open) { setPendingSubmitData(null); setExistingDealMatch(null); } setDuplicateDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>This property already has an analysis</DialogTitle>
            <DialogDescription>
              A deal for <strong>{existingDealMatch?.address}</strong> is already in your list. You can load that analysis or save this as a new entry.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleContinueAsNew} className="border-border text-foreground">
              Save as new deal anyway
            </Button>
            <Button type="button" onClick={handleLoadExistingDeal} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Load existing analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealInputForm;
