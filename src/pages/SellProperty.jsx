import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, DollarSign, Clock, Zap } from 'lucide-react';

const SellProperty = () => {
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    toast({
      title: "✅ Form Submitted!",
      description: "Thank you! We've received your property details and will be in touch within 24 hours.",
    });
    e.target.reset();
  };

  const benefits = [
    { icon: DollarSign, text: "No Commissions or Hidden Fees" },
    { icon: Clock, text: "Close on Your Timeline (7-30 Days)" },
    { icon: Zap, text: "Sell 'As-Is' - No Repairs Needed" },
    { icon: CheckCircle, text: "Receive a Fair, No-Obligation Cash Offer" },
  ];

  return (
    <>
      <Helmet>
        <title>Sell Your Georgia Home Fast - Pavel REI</title>
        <meta name="description" content="Sell your house fast in Georgia for cash. No fees, no repairs, no stress. Get a fair cash offer from Pavel REI today." />
      </Helmet>
      <div className="bg-white text-slate-800">
        {/* Hero Section */}
        <section className="py-20 bg-[#0F172A] text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              Sell Your Georgia Home Fast – No Fees, No Stress.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-300"
            >
              Get a fair cash offer and close on your schedule. It's that simple.
            </motion.p>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-start">
            {/* Form Section */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gray-50 p-8 rounded-lg shadow-lg"
            >
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Get Your Offer Now</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700">Full Name</label>
                  <input type="text" id="name" required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#16285B] focus:border-[#16285B]" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
                  <input type="email" id="email" required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#16285B] focus:border-[#16285B]" />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Phone Number</label>
                  <input type="tel" id="phone" required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#16285B] focus:border-[#16285B]" />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-slate-700">Property Address</label>
                  <input type="text" id="address" required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#16285B] focus:border-[#16285B]" />
                </div>
                <div>
                  <label htmlFor="condition" className="block text-sm font-medium text-slate-700">Property Condition</label>
                  <select id="condition" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#16285B] focus:border-[#16285B]">
                    <option>Excellent</option>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Needs Work</option>
                    <option>Major Rehab</option>
                  </select>
                </div>
                <Button type="submit" size="lg" className="w-full bg-[#152246] hover:bg-blue-900 text-white">
                  Get My Free Cash Offer
                </Button>
              </form>
            </motion.div>

            {/* Benefits Section */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-bold text-slate-900">The Pavel REI Advantage</h2>
              <div className="space-y-6">
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <div className="bg-green-100 text-green-600 rounded-full p-2">
                        <Icon size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{benefit.text}</h3>
                        <p className="text-slate-600">We simplify the selling process to benefit you.</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-10">
                <img alt="A happy family in front of their sold home" className="w-full h-auto object-cover rounded-lg shadow-md" src="https://images.unsplash.com/photo-1672870153272-1ce7b03bf04b" />
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default SellProperty;