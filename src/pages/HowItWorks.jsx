import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, Search, HeartHandshake as Handshake, DollarSign, Home, Users } from 'lucide-react';

const HowItWorks = () => {
  const sellerProcess = [
    {
      icon: FileText,
      title: 'Step 1: Submit Your Property',
      description: 'Fill out our simple online form with your property details. It takes less than 2 minutes.',
    },
    {
      icon: Search,
      title: 'Step 2: We Evaluate Your Property',
      description: 'Our team reviews your submission and researches the property. We may contact you for more details.',
    },
    {
      icon: Handshake,
      title: 'Step 3: Receive a Fair Offer',
      description: 'We present you with a no-obligation, fair cash offer within 24-48 hours.',
    },
    {
      icon: DollarSign,
      title: 'Step 4: Close & Get Paid',
      description: 'If you accept, we close on your timeline, often in as little as 7-14 days. No fees, no commissions.',
    },
  ];

  const investorProcess = [
    {
      icon: Users,
      title: 'Step 1: Join Our Investor Network',
      description: 'Apply to join our exclusive network of capital partners and get access to vetted deals.',
    },
    {
      icon: Home,
      title: 'Step 2: Review Exclusive Deals',
      description: 'We send you off-market investment opportunities that match your criteria, complete with analysis.',
    },
    {
      icon: DollarSign,
      title: 'Step 3: Fund a Project',
      description: 'Choose a project to fund. Your investment is secured by the real estate asset.',
    },
    {
      icon: Handshake,
      title: 'Step 4: Profit Securely',
      description: 'Once the project is completed and sold, you receive your principal plus a handsome return.',
    },
  ];

  return (
    <>
      <Helmet>
        <title>How It Works - Pavel REI</title>
        <meta name="description" content="Learn the simple process for selling your property fast for cash or joining our investor network for exclusive real estate deals in Atlanta." />
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
              Simple, Transparent Processes
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-300"
            >
              Whether you're selling a property or investing capital, we make it easy.
            </motion.p>
          </div>
        </section>

        {/* Seller Process */}
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-center mb-12 text-slate-900">The Seller Process</h2>
            <div className="relative">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2"></div>
              <div className="grid md:grid-cols-4 gap-8 text-center">
                {sellerProcess.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.15 }}
                      className="relative flex flex-col items-center bg-white p-6 rounded-lg"
                    >
                      <div className="bg-[#16285B] text-white rounded-full w-16 h-16 flex items-center justify-center mb-4">
                        <Icon size={32} />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                      <p className="text-slate-600">{step.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            <div className="text-center mt-12">
              <Button asChild size="lg" className="bg-[#152246] hover:bg-blue-900 text-white">
                <Link to="/sell-your-property">Sell My House Fast <ArrowRight className="ml-2" size={20} /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Investor Process */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-center mb-12 text-slate-900">The Investor Process</h2>
            <div className="relative">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2"></div>
              <div className="grid md:grid-cols-4 gap-8 text-center">
                {investorProcess.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.15 }}
                      className="relative flex flex-col items-center bg-white p-6 rounded-lg shadow-md"
                    >
                      <div className="bg-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center mb-4">
                        <Icon size={32} />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                      <p className="text-slate-600">{step.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            <div className="text-center mt-12">
              <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
                <Link to="/investor-partnerships">Join Investor Network <ArrowRight className="ml-2" size={20} /></Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default HowItWorks;