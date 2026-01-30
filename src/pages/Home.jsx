import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Clock, DollarSign, Home as HomeIcon, HeartHandshake as Handshake, CheckCircle, BedDouble, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"

const Home = () => {
  const { toast } = useToast();

  const handleFeatureClick = () => {
    toast({
      title: "🚧 Feature Coming Soon!",
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const whyChooseUs = [
    {
      icon: Clock,
      title: 'Fast Decisions',
      description: 'Get an offer in as little as 24 hours',
    },
    {
      icon: DollarSign,
      title: 'Strong Funding',
      description: 'Backed by private capital and lender partners',
    },
    {
      icon: HomeIcon,
      title: 'Any Condition',
      description: 'Distressed, fire, probate, hoarder, or code violations',
    },
    {
      icon: Handshake,
      title: 'Trusted Relationships',
      description: 'Your commissions and fees are always protected',
    },
  ];

  const whoWeServe = [
    {
      title: 'For Homeowners (Sell As-Is)',
      description: 'Sell fast without repairs, cleanouts, or showings. Close in 7–14 days with a fair cash offer.',
      linkText: 'Learn More – Sell Your Property',
      linkTo: '/sell-your-property'
    },
    {
      title: 'For Lenders & Funders',
      description: 'Partner with a proven Atlanta operator. Safe, secured, and backed investments with a steady pipeline of projects.',
      linkText: 'Learn More – Funding Opportunities',
      linkTo: '/sellers-partners'
    },
    {
      title: 'For Agents, Wholesalers & Attorneys',
      description: 'We buy probate, foreclosure, and off-market deals. Commissions and assignment fees always protected. Same-day EMD.',
      linkText: 'Learn More – Submit Deals',
      linkTo: '/sellers-partners'
    }
  ];
  
  const howItWorksSteps = [
      { step: 1, text: "Submit your property or investment interest" },
      { step: 2, text: "Get an evaluation within 24 hours" },
      { step: 3, text: "Close quickly & profit securely" },
  ];

  const caseStudies = [
      { before: "Distressed Decatur Bungalow", after: "Modern Family Home", roi: "35% ROI", image: "A modern renovated home exterior" },
      { before: "Outdated College Park Ranch", after: "Chic Open-Concept Living", roi: "40% ROI", image: "A stylish open-concept living room interior" },
  ];

  const whyWorkWithUs = [
      "Local Expertise in Georgia Markets",
      "Systemized Virtual Office for Speed & Efficiency",
      "Trusted By Homeowners & Investors Alike"
  ];

  const testimonials = [
    {
      quote: "“They closed my wholesale deal in 7 days – earnest money wired same day. Smoothest transaction ever.”",
      author: "Local Wholesaler",
    },
    {
      quote: "“As an agent, my commission was protected. They’re my go-to buyer for off-market deals.”",
      author: "Atlanta Realtor",
    },
    {
      quote: "“They helped my client resolve probate quickly and fairly. Professional and discreet.”",
      author: "Probate Attorney",
    }
  ];

  return (
    <>
      <Helmet>
        <title>Pavel REI - Atlanta’s Trusted Off-Market Real Estate Buyer</title>
        <meta name="description" content="Pavel REI offers fast, fair, and reliable closings for sellers, lenders, agents, wholesalers, and attorneys in Atlanta, Georgia. We buy properties in any condition." />
      </Helmet>

      <div className="min-h-screen bg-white text-slate-800">
        {/* Hero Section */}
        <section 
          className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: `url('https://horizons-cdn.hostinger.com/539b6f76-d474-4bf3-8847-2bf38fc4f1d6/fa9e4dbe0f2f74d089167c1384c1100f.png')` }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <h1 className="text-4xl md:text-6xl font-bold text-white" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
                Atlanta’s Trusted Off-Market Real Estate Buyer
              </h1>
              <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
                Fast, Fair, and Reliable Closings for Sellers, Lenders, Agents, Wholesalers, and Attorneys.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Button asChild size="lg" className="bg-[#152246] hover:bg-blue-900 text-white px-6 py-3 w-full sm:w-auto">
                  <Link to="/sell-your-property">I’m Selling a Property</Link>
                </Button>
                <Button asChild size="lg" className="bg-white hover:bg-gray-200 text-[#152246] px-6 py-3 w-full sm:w-auto">
                  <Link to="/sellers-partners">I Have Capital to Lend</Link>
                </Button>
                <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 w-full sm:w-auto">
                   <Link to="/sellers-partners">I’m an Agent / Wholesaler / Attorney</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Why Choose Pavel REI */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {whyChooseUs.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex flex-col items-center"
                  >
                    <Icon className="h-12 w-12 text-[#16285B] mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                    <p className="text-slate-600">{item.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Who We Serve */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-center mb-12 text-slate-900">Who We Serve</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {whoWeServe.map((card, index) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="bg-white p-8 rounded-lg shadow-lg flex flex-col border-t-4 border-[#16285B]"
                >
                  <h3 className="text-2xl font-bold mb-4 text-[#16285B]">{card.title}</h3>
                  <p className="text-slate-600 mb-6 flex-grow">{card.description}</p>
                  <Link to={card.linkTo} className="font-bold text-[#16285B] hover:text-blue-700 self-start">
                    {card.linkText} <ArrowRight className="inline-block" size={16} />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-4xl font-bold mb-12 text-slate-900">How It Works</h2>
                <div className="flex flex-col md:flex-row justify-center items-center gap-8">
                    {howItWorksSteps.map((item, index) => (
                        <React.Fragment key={item.step}>
                            <div className="flex flex-col items-center">
                                <div className="bg-[#16285B] text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mb-2">{item.step}</div>
                                <p className="max-w-[200px]">{item.text}</p>
                            </div>
                            {index < howItWorksSteps.length - 1 && <ArrowRight className="hidden md:block text-gray-300" size={40}/>}
                        </React.Fragment>
                    ))}
                </div>
                <Button asChild size="lg" className="mt-12 bg-[#152246] hover:bg-blue-900 text-white">
                    <Link to="/how-it-works">See Full Process</Link>
                </Button>
            </div>
        </section>

        {/* Featured Properties / Case Studies */}
        <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-bold text-center mb-12 text-slate-900">Featured Deals</h2>
                <div className="grid md:grid-cols-2 gap-8">
                    {caseStudies.map((study, index) => (
                        <motion.div 
                            key={index}
                            className="bg-white rounded-lg shadow-lg overflow-hidden"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.2 }}
                        >
                            <img alt={study.image} className="w-full h-64 object-cover" src="https://images.unsplash.com/photo-1601429675201-f66be94607bb" />
                            <div className="p-6">
                                <p className="text-sm text-gray-500">Before: {study.before}</p>
                                <p className="text-lg font-semibold text-slate-800">After: {study.after}</p>
                                <p className="text-2xl font-bold text-green-600 mt-2">{study.roi}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
                <div className="text-center mt-12">
                    <Button asChild size="lg" variant="outline" className="border-[#16285B] text-[#16285B] hover:bg-[#16285B] hover:text-white">
                        <Link to="/projects">View More Deals</Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Zen & Zeez Stayz */}
        <section className="py-20 bg-orange-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <BedDouble className="mx-auto h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-4xl font-bold mb-4 text-slate-900">Short Stay Rentals - Zen & Zeez Stayz</h2>
                <h3 className="text-2xl mb-4 text-orange-600">“Your Home Away From Home in Georgia”</h3>
                <p className="text-lg text-slate-600 max-w-3xl mx-auto mb-8">
                    Short-term stays in our beautifully renovated properties – perfect for families, business travelers, and vacationers.
                </p>
                <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Link to="/zen-and-zeez-stayz">Explore Our Stays</Link>
                </Button>
            </div>
        </section>

        {/* Why Work With Us */}
        <section className="py-20 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-4xl font-bold mb-12 text-slate-900">Why Work With Us</h2>
                <div className="space-y-6">
                    {whyWorkWithUs.map((reason, index) => (
                        <div key={index} className="flex items-center justify-center gap-4">
                            <CheckCircle className="h-6 w-6 text-green-500" />
                            <span className="text-xl text-slate-700">{reason}</span>
                        </div>
                    ))}
                </div>
                <Button asChild size="lg" className="mt-12 bg-[#152246] hover:bg-blue-900 text-white">
                    <Link to="/about">Learn About Our Company</Link>
                </Button>
            </div>
        </section>

        {/* Success Stories */}
        <section className="py-20 bg-[#152246] text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-12">Success Stories</h2>
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              plugins={[
                Autoplay({
                  delay: 4000,
                }),
              ]}
              className="w-full max-w-2xl mx-auto"
            >
              <CarouselContent>
                {testimonials.map((testimonial, index) => (
                  <CarouselItem key={index}>
                    <div className="p-1">
                      <p className="text-2xl italic">"{testimonial.quote}"</p>
                      <p className="mt-4 font-bold text-gray-300">– {testimonial.author}</p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="text-white border-white hover:bg-white/20 -left-4" />
              <CarouselNext className="text-white border-white hover:bg-white/20 -right-4" />
            </Carousel>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-16 bg-[#16285B] text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Got a Deal or Property Right Now? Get a Serious Offer in 4 Hours.</h2>
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="bg-white hover:bg-gray-200 text-[#16285B] px-8 py-3">
                <Link to="/contact?inquiry=partnership">
                  <ArrowRight className="mr-2 h-4 w-4 rotate-180" /> Submit a Deal Online
                </Link>
              </Button>
              <a href="mailto:info@pavelreiproperties.com" className="text-lg inline-flex items-center gap-2">
                <Mail className="h-5 w-5" /> Email: info@pavelreiproperties.com
              </a>
              <span className="text-lg inline-flex items-center gap-2">
                <Phone className="h-5 w-5" /> Text Pavel: (404) 919-6808
              </span>
            </div>
          </div>
        </section>

        {/* CEO Section */}
        <section className="py-20 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <img
                  className="rounded-2xl shadow-2xl w-full h-96 object-cover"
                  alt="Dr. Elna SaaH, CEO of Pavel REI"
                 src="https://storage.googleapis.com/hostinger-horizons-assets-prod/539b6f76-d474-4bf3-8847-2bf38fc4f1d6/1634a23690d7bea296b51a92391ac0ba.png" />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 to-transparent rounded-2xl"></div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h2 className="text-4xl font-bold text-white">Meet Our CEO</h2>
                <h3 className="text-2xl gradient-text font-semibold">Dr. Elna SaaH</h3>
                <p className="text-xl text-gray-300 leading-relaxed">
                  With over 15 years in the Human Health Service industry and extensive 
                  experience in emergency healthcare, Dr. Elna brings a unique perspective 
                  to real estate investment. Her passion for real estate serves as 
                  another avenue to support people who face difficulties.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
};

export default Home;