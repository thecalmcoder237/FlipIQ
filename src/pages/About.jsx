import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Award, Heart, Users, TrendingUp, Shield, Target } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const About = () => {
  const { toast } = useToast();

  const handleFeatureClick = () => {
    toast({
      title: "🚧 Feature Coming Soon!",
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const values = [
    {
      icon: TrendingUp,
      title: 'Win-Win Partnerships',
      description: 'We believe there\'s a win for all parties we work with in deals. Every partnership is structured for mutual benefit and long-term success.',
    },
    {
      icon: Users,
      title: 'Lasting Relationships',
      description: 'We believe in strong lasting relationships with all parties we work with. Trust and reliability are the foundation of our business.',
    },
    {
      icon: Shield,
      title: 'Transparency & Accountability',
      description: 'We believe in transparency and accountability in every transaction. Clear communication and honest dealings are our standard.',
    },
  ];

  const timeline = [
    {
      year: '2008',
      title: 'Healthcare Career Begins',
      description: 'Dr. Elna SaaH starts her journey in the Human Health Service industry',
    },
    {
      year: '2015',
      title: 'Emergency Unit Expertise',
      description: 'Specialized in emergency healthcare, gaining invaluable experience in critical situations',
    },
    {
      year: '2020',
      title: 'Real Estate Vision',
      description: 'Discovered real estate as another avenue to support people facing difficulties',
    },
    {
      year: '2023',
      title: 'Pavel REI Founded',
      description: 'Launched Pavel REI to combine healthcare compassion with real estate expertise',
    },
  ];

  return (
    <>
      <Helmet>
        <title>About Pavel REI - Our Story & Mission in Atlanta Real Estate</title>
        <meta name="description" content="Learn about Pavel REI's mission, values, and CEO Dr. Elna SaaH's journey from healthcare to real estate investment in Atlanta, Georgia." />
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
              About Pavel REI
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-300"
            >
              Combining healthcare compassion with real estate expertise to create meaningful partnerships and positive community impact in Atlanta, Georgia.
            </motion.p>
          </div>
        </section>

        {/* CEO Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h2 className="text-4xl font-bold text-slate-900">Meet Our CEO</h2>
                <h3 className="text-3xl font-bold text-[#16285B]">Dr. Elna SaaH</h3>
                <div className="space-y-4 text-slate-600 leading-relaxed text-lg">
                  <p>
                    With over 15 years of dedicated service in the Human Health Service industry, Dr. Elna SaaH brings a unique perspective to real estate investment that goes beyond profit margins.
                  </p>
                  <p>
                    Working extensively in emergency healthcare units, Dr. Elna has witnessed firsthand the challenges people face when dealing with health crises. This experience has shaped her vision for Pavel REI as more than just a real estate company.
                  </p>
                  <p>
                    Her passion for real estate serves as another avenue to support people who face difficulties, combining business acumen with genuine care for community welfare.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <img  
                  className="rounded-2xl shadow-2xl w-full h-auto object-cover"
                  alt="Dr. Elna SaaH, CEO of Pavel REI"
                 src="https://storage.googleapis.com/hostinger-horizons-assets-prod/539b6f76-d474-4bf3-8847-2bf38fc4f1d6/1634a23690d7bea296b51a92391ac0ba.png" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Our Core Values</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                The principles that guide every decision we make and every partnership we build.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <motion.div
                    key={value.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    className="bg-gray-50 rounded-lg p-8 text-center shadow-lg border-t-4 border-[#16285B]"
                  >
                    <div className="flex justify-center mb-6">
                      <div className="p-4 bg-[#16285B] rounded-full inline-block">
                        <Icon size={32} className="text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-[#16285B] mb-4">{value.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{value.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Company Timeline */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Our Journey</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                From healthcare service to real estate excellence.
              </p>
            </motion.div>

            <div className="relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gray-200 rounded-full"></div>
              
              <div className="space-y-12">
                {timeline.map((item, index) => (
                  <motion.div
                    key={item.year}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                      <div className="bg-white rounded-xl p-6 shadow-lg">
                        <div className="text-2xl font-bold text-[#16285B] mb-2">{item.year}</div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-3">{item.title}</h3>
                        <p className="text-slate-600">{item.description}</p>
                      </div>
                    </div>
                    
                    <div className="relative z-10 w-4 h-4 bg-[#16285B] rounded-full border-4 border-white"></div>
                    
                    <div className="w-1/2"></div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default About;