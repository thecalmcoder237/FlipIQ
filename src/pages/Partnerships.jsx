import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Users, HeartHandshake as Handshake, Building, Hammer, DollarSign, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const Partnerships = () => {
  const { toast } = useToast();

  const handlePartnershipClick = () => {
    toast({
      title: "🚧 Partnership Application Coming Soon!",
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const partnerTypes = [
    {
      icon: Users,
      title: 'Wholesalers & Agents',
      description: 'Bring us your off-market deals. We close fast and protect your fees.',
    },
    {
      icon: DollarSign,
      title: 'Lenders & Investors',
      description: 'Partner with a proven operator for secured, high-return investments.',
    },
    {
      icon: Hammer,
      title: 'Contractors',
      description: 'Join our network for a steady pipeline of rehab and renovation projects.',
    },
  ];

  const partnershipProcess = [
    {
      step: '01',
      title: 'Submit Your Interest',
      description: 'Fill out our contact form with your details and partnership type.'
    },
    {
      step: '02',
      title: 'Initial Call',
      description: 'Our team will schedule a call to discuss goals and alignment.'
    },
    {
      step: '03',
      title: 'Partnership Agreement',
      description: 'We establish clear, win-win terms for our collaboration.'
    },
    {
      step: '04',
      title: 'Let\'s Close Deals!',
      description: 'Begin working together on profitable real estate deals and projects.'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Sellers & Partners - Join Pavel REI's Network in Atlanta</title>
        <meta name="description" content="Partner with Pavel REI. We work with sellers, wholesalers, realtors, contractors, and investors for mutual success in the Atlanta real estate market." />
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
              Sellers & Partners
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-300"
            >
              Join our network to close deals fast, earn securely, and build lasting relationships in Atlanta's real estate market.
            </motion.p>
          </div>
        </section>

        {/* Partner Types */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Who We Partner With</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                We create win-win opportunities for every professional in the real estate ecosystem.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {partnerTypes.map((partner, index) => {
                const Icon = partner.icon;
                return (
                  <motion.div
                    key={partner.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="bg-white rounded-lg p-8 text-center shadow-lg border-t-4 border-[#16285B]"
                  >
                    <div className="flex justify-center mb-6">
                      <div className="p-4 bg-[#16285B] rounded-full inline-block">
                        <Icon size={32} className="text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-[#16285B] mb-4">{partner.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{partner.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Partnership Process */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Our Partnership Process</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                A simple, transparent process to get started.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {partnershipProcess.map((process, index) => (
                <motion.div
                  key={process.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="relative text-center"
                >
                  <div className="bg-gray-50 rounded-lg p-6 shadow-md h-full">
                    <div className="text-4xl font-bold text-[#16285B] mb-4">{process.step}</div>
                    <h3 className="text-xl font-bold text-slate-800 mb-4">{process.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{process.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-[#152246] text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl md:text-5xl font-bold">
                Ready to Work Together?
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Whether you have a deal to submit or capital to lend, we're ready to connect. Let's build something great together.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-[#152246] hover:bg-gray-200 px-8 py-3 text-lg">
                  <Link to="/contact?inquiry=partnership">Submit a Deal <ArrowRight className="ml-2" size={20} /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white text-[#16285B] hover:bg-white hover:text-blue-900 px-8 py-3 text-lg">
                  <Link to="/contact?inquiry=partnership">Discuss Partnership</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Partnerships;