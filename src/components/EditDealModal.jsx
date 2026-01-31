
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dealService } from '@/services/dealService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const EditDealModal = ({ isOpen, onClose, deal, onSave }) => {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (deal) {
      setFormData(deal); // Assumes deal is already in camelCase from loadDeal
    }
  }, [deal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedDeal = await dealService.saveDeal(formData, currentUser.id);

      toast({
        title: "Deal Updated",
        description: "Your changes have been saved successfully.",
      });
      
      onSave(updatedDeal);
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          <div className="sticky top-0 bg-card border-b border-border p-4 flex justify-between items-center z-10">
            <div>
              <h2 className="text-xl font-bold text-foreground">Edit Deal Details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Vital inputs (~60% of full Deal Input form)</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground block mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  placeholder="123 Main St, City, State ZIP"
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Zip Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode || ''}
                  onChange={handleChange}
                  placeholder="5-digit ZIP"
                  maxLength={5}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status || 'Analyzing'}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                >
                  <option value="Analyzing">Analyzing</option>
                  <option value="Under Contract">Under Contract</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Abandoned">Abandoned</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Purchase Price ($)</label>
                <input
                  type="number"
                  name="purchasePrice"
                  value={formData.purchasePrice || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">ARV ($)</label>
                <input
                  type="number"
                  name="arv"
                  value={formData.arv || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Down Payment (%)</label>
                <input
                  type="number"
                  name="downPaymentPercent"
                  value={formData.downPaymentPercent || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Closing Costs Buy ($)</label>
                <input
                  type="number"
                  name="closingCostsBuying"
                  value={formData.closingCostsBuying || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Hard Money Rate (%)</label>
                <input
                  type="number"
                  name="hardMoneyRate"
                  value={formData.hardMoneyRate || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Hard Money Points (%)</label>
                <input
                  type="number"
                  name="hardMoneyPoints"
                  value={formData.hardMoneyPoints || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Rehab Category</label>
                <select
                  name="rehabCategory"
                  value={formData.rehabCategory || 'Cosmetic'}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                >
                  <option value="Cosmetic">Cosmetic ($25/sf)</option>
                  <option value="Moderate">Moderate ($50/sf)</option>
                  <option value="Heavy">Heavy ($85/sf)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Rehab Costs ($)</label>
                <input
                  type="number"
                  name="rehabCosts"
                  value={formData.rehabCosts || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Contingency (%)</label>
                <input
                  type="number"
                  name="contingencyPercent"
                  value={formData.contingencyPercent || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Holding Months</label>
                <input
                  type="number"
                  name="holdingMonths"
                  value={formData.holdingMonths || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Realtor Commission (%)</label>
                <input
                  type="number"
                  name="realtorCommission"
                  value={formData.realtorCommission || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Closing Costs Sell (%)</label>
                <input
                  type="number"
                  name="closingCostsSelling"
                  value={formData.closingCostsSelling || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Staging Cost ($)</label>
                <input
                  type="number"
                  name="stagingCost"
                  value={formData.stagingCost || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Property Tax / mo ($)</label>
                <input
                  type="number"
                  name="propertyTax"
                  value={formData.propertyTax || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Insurance / mo ($)</label>
                <input
                  type="number"
                  name="insurance"
                  value={formData.insurance || ''}
                  onChange={handleChange}
                  className="w-full bg-background border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border">
              <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EditDealModal;
