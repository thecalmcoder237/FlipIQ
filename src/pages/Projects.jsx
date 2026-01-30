import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Building, MapPin, Calendar, DollarSign, TrendingUp, Eye, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const Projects = () => {
  const { toast } = useToast();

  const handleProjectClick = () => {
    toast({
      title: "🚧 Project Details Coming Soon!",
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const ongoingProjects = [
    {
      id: 1,
      title: 'Midtown Atlanta Renovation',
      location: 'Midtown, Atlanta, GA',
      type: 'Flip Project',
      status: 'In Progress',
      image: 'https://images.unsplash.com/photo-1702948545240-b44e3c1b86f4'
    },
    {
      id: 2,
      title: 'East Atlanta Village Duplex',
      location: 'East Atlanta Village, GA',
      type: 'Rental Property',
      status: 'Planning',
      image: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716'
    },
    {
      id: 3,
      title: 'Decatur Historic Restoration',
      location: 'Decatur, GA',
      type: 'Flip Project',
      status: 'In Progress',
      image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994'
    }
  ];

  const completedProjects = [
    {
      id: 4,
      title: 'Grant Park Cottage Flip',
      location: 'Grant Park, Atlanta, GA',
      profit: '$75,000',
      image: 'https://images.unsplash.com/photo-1696237583261-029171ee31fa'
    },
    {
      id: 5,
      title: 'Virginia Highland Townhome',
      location: 'Virginia Highland, Atlanta, GA',
      profit: '$120,000',
      image: 'https://images.unsplash.com/photo-1598228723793-52759bba239c'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Projects - Pavel REI's Real Estate Portfolio in Atlanta</title>
        <meta name="description" content="Explore Pavel REI's ongoing and completed real estate projects in Atlanta, Georgia. See our successful property flips and rental investments." />
      </Helmet>

      <div className="bg-white text-slate-800">
        {/* Hero Section */}
        <section className="py-20 bg-[#16285B] text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              Our Projects
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-300"
            >
              A showcase of our commitment to quality renovations and profitable investments across Atlanta.
            </motion.p>
          </div>
        </section>

        {/* Ongoing Projects */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Ongoing Projects</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Current projects in various stages of development across Atlanta.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-8">
              {ongoingProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col group"
                  onClick={handleProjectClick}
                >
                  <div className="relative">
                    <img  
                      className="w-full h-56 object-cover"
                      alt={`${project.title} - Real estate project in ${project.location}`}
                      src={project.image} />
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        project.status === 'In Progress' ? 'bg-blue-600 text-white' : 'bg-yellow-600 text-white'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#16285B]">{project.title}</h3>
                    <div className="flex items-center space-x-2 text-gray-500 text-sm mb-4">
                      <MapPin size={16} />
                      <span>{project.location}</span>
                    </div>
                    <div className="mt-auto">
                       <span className="font-bold text-[#16285B] group-hover:underline">
                        View Details <ArrowRight className="inline-block" size={16} />
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Completed Projects */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Completed Projects</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                A look at our track record of successful, profitable flips.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8">
              {completedProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="bg-gray-50 rounded-lg shadow-lg overflow-hidden flex flex-col group"
                  onClick={handleProjectClick}
                >
                  <img  
                    className="w-full h-64 object-cover"
                    alt={`${project.title} - Completed real estate project in ${project.location}`}
                    src={project.image} />
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-[#16285B]">{project.title}</h3>
                    <div className="flex items-center space-x-2 text-gray-500 text-sm mb-4">
                      <MapPin size={16} />
                      <span>{project.location}</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">Profit: {project.profit}</p>
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
                Want to Invest in Our Next Project?
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Join our investor network and get access to exclusive, high-return real estate opportunities across Atlanta.
              </p>
              <Button asChild size="lg" className="bg-white text-[#152246] hover:bg-gray-200 px-8 py-3 text-lg">
                <Link to="/sellers-partners">Become an Investor <ArrowRight className="ml-2" size={20} /></Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Projects;