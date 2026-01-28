import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Heart, Home, Users, MapPin, Calendar, Target, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const CharityProgram = () => {
  const { toast } = useToast();

  const handleCharityClick = () => {
    toast({
      title: "🚧 Charity Program Feature Coming Soon!",
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const programGoals = [
    {
      icon: Home,
      title: 'Subsidized Housing',
      description: 'Create affordable housing options for people with critical health conditions who need regular hospital access.',
    },
    {
      icon: MapPin,
      title: 'Strategic Locations',
      description: 'Develop housing near major medical facilities to reduce travel time and costs for patients.',
    },
    {
      icon: Users,
      title: 'Community Support',
      description: 'Build a supportive community network for residents facing health challenges.',
    },
    {
      icon: Target,
      title: 'Long-term Impact',
      description: 'Create sustainable solutions that provide lasting benefits to our community.',
    },
  ];

  const impactStats = [
    { number: '50+', label: 'Families to be Served', description: 'Initial program capacity' },
    { number: '3', label: 'Medical Centers', description: 'Partner hospitals in Atlanta' },
    { number: '75%', label: 'Cost Reduction', description: 'Average savings on transportation' },
    { number: '24/7', label: 'Support Access', description: 'Round-the-clock assistance' },
  ];

  const timeline = [
    {
      phase: 'Phase 1',
      title: 'Research & Planning',
      status: 'In Progress',
      description: 'Conducting community needs assessment and identifying optimal locations.',
      timeline: 'Q2 2024',
    },
    {
      phase: 'Phase 2',
      title: 'Partnership Development',
      status: 'Upcoming',
      description: 'Establishing partnerships with healthcare providers and community organizations.',
      timeline: 'Q3 2024',
    },
    {
      phase: 'Phase 3',
      title: 'Property Acquisition',
      status: 'Planned',
      description: 'Securing properties near major medical facilities for conversion.',
      timeline: 'Q4 2024',
    },
    {
      phase: 'Phase 4',
      title: 'Program Launch',
      status: 'Planned',
      description: 'Opening the first subsidized housing units for qualifying residents.',
      timeline: 'Q1 2025',
    },
  ];

  const eligibilityCriteria = [
    'Diagnosed with a critical health condition requiring regular hospital visits',
    'Currently living outside Atlanta metro area',
    'Demonstrable financial hardship related to medical transportation costs',
    'Commitment to participate in community support programs',
    'Referral from healthcare provider or social services',
  ];

  return (
    <>
      <Helmet>
        <title>Charity Program - Pavel REI's Community Health Initiative</title>
        <meta name="description" content="Learn about Pavel REI's charity program creating subsidized housing for people with critical health conditions in Atlanta, Georgia." />
      </Helmet>

      <div className="min-h-screen pt-16">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-red-900 via-purple-900 to-blue-900 hero-pattern">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center space-y-8"
            >
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-600/20 rounded-full">
                  <Heart size={48} className="text-red-400" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white text-shadow">
                <span className="gradient-text">Charity Program</span>
                <br />
                <span className="text-3xl md:text-4xl">Healing Through Housing</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
                Creating subsidized housing for people in critical health conditions who need 
                regular hospital visits but live outside the city and can't afford the trips.
              </p>
              <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg"
                onClick={handleCharityClick}
              >
                Support Our Mission
                <Heart className="ml-2" size={20} />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="py-20 bg-slate-800/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-4xl font-bold text-white mb-6">Our Mission</h2>
                  <p className="text-xl text-gray-300 leading-relaxed mb-6">
                    We believe that access to healthcare should not be limited by geography or financial constraints. 
                    Our charity program addresses a critical gap in our healthcare system by providing affordable 
                    housing solutions for those who need to be close to medical facilities.
                  </p>
                  <p className="text-lg text-gray-400 leading-relaxed">
                    Drawing from CEO Dr. Elna SaaH's 15+ years of experience in healthcare, we understand the challenges 
                    patients face when they must travel long distances for regular treatments. This program represents 
                    our commitment to using real estate as a force for positive community impact.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <img  
                  className="rounded-2xl shadow-2xl w-full h-96 object-cover"
                  alt="Healthcare workers helping patients in a compassionate medical setting"
                 src="https://images.unsplash.com/photo-1580281657702-257584239a55" />
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/40 to-transparent rounded-2xl"></div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Program Goals */}
        <section className="py-20 bg-pattern">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Program Goals</h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Our comprehensive approach to addressing healthcare accessibility through housing
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {programGoals.map((goal, index) => {
                const Icon = goal.icon;
                return (
                  <motion.div
                    key={goal.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="glass-effect rounded-2xl p-6 text-center card-hover"
                  >
                    <div className="flex justify-center mb-6">
                      <div className="p-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-full">
                        <Icon size={32} className="text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4">{goal.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{goal.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Impact Statistics */}
        <section className="py-20 bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-white mb-6">Expected Impact</h2>
              <p className="text-xl text-gray-400">Measurable outcomes we aim to achieve</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {impactStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center space-y-4"
                >
                  <div className="text-5xl font-bold gradient-text">{stat.number}</div>
                  <div className="text-xl font-semibold text-white">{stat.label}</div>
                  <div className="text-gray-400">{stat.description}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Development Timeline */}
        <section className="py-20 bg-gradient-to-br from-slate-900 to-blue-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-white mb-6">Development Timeline</h2>
              <p className="text-xl text-gray-400">Our roadmap to launching the charity program</p>
            </motion.div>

            <div className="space-y-8">
              {timeline.map((phase, index) => (
                <motion.div
                  key={phase.phase}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="glass-effect rounded-2xl p-8"
                >
                  <div className="grid lg:grid-cols-4 gap-6 items-center">
                    <div className="text-center lg:text-left">
                      <div className="text-2xl font-bold gradient-text mb-2">{phase.phase}</div>
                      <div className="text-lg font-semibold text-white">{phase.title}</div>
                    </div>
                    
                    <div className="lg:col-span-2">
                      <p className="text-gray-400 leading-relaxed">{phase.description}</p>
                    </div>
                    
                    <div className="text-center lg:text-right">
                      <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold mb-2 ${
                        phase.status === 'In Progress' ? 'bg-blue-600 text-white' :
                        phase.status === 'Upcoming' ? 'bg-yellow-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {phase.status}
                      </div>
                      <div className="text-gray-400">{phase.timeline}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Eligibility Criteria */}
        <section className="py-20 bg-slate-800/30">
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
                  alt="Diverse group of people receiving healthcare support and assistance"
                 src="https://images.unsplash.com/photo-1680778470701-b64ce61294ca" />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent rounded-2xl"></div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-4xl font-bold text-white mb-6">Eligibility Criteria</h2>
                  <p className="text-xl text-gray-400 leading-relaxed mb-8">
                    Our program is designed to serve those who need it most. Here are the 
                    criteria for participation in our subsidized housing program.
                  </p>
                </div>

                <div className="space-y-4">
                  {eligibilityCriteria.map((criteria, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-start space-x-3"
                    >
                      <CheckCircle className="text-green-400 flex-shrink-0 mt-1" size={20} />
                      <span className="text-gray-300 leading-relaxed">{criteria}</span>
                    </motion.div>
                  ))}
                </div>

                <Button 
                  size="lg" 
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleCharityClick}
                >
                  Apply for Program
                  <ArrowRight className="ml-2" size={20} />
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-red-600 to-purple-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                Help Us Make a Difference
              </h2>
              <p className="text-xl text-red-100 max-w-2xl mx-auto">
                Join us in creating a community where healthcare access isn't limited by 
                geography or financial constraints. Together, we can heal through housing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-red-600 hover:bg-gray-100 px-8 py-4 text-lg"
                  onClick={handleCharityClick}
                >
                  Donate to Program
                  <Heart className="ml-2" size={20} />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-white text-white hover:bg-white hover:text-red-600 px-8 py-4 text-lg"
                  onClick={handleCharityClick}
                >
                  Volunteer with Us
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default CharityProgram;