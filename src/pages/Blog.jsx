import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Blog = () => {
  const { toast } = useToast();

  const handleBlogClick = () => {
    toast({
      title: "🚧 Blog Post Coming Soon!",
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const blogPosts = [
    {
      id: 1,
      title: 'Top 5 Atlanta Neighborhoods for Real Estate Investment in 2025',
      author: 'Dr. Elna SaaH',
      date: 'October 3, 2025',
      excerpt: 'Discover the most promising neighborhoods in Atlanta for property flipping and rental income. We break down the data and trends you need to know.',
      category: 'Investment',
      image: 'A vibrant street in an Atlanta neighborhood with modern houses'
    },
    {
      id: 2,
      title: 'The Ultimate Guide to Working with Wholesalers in Georgia',
      author: 'Pavel REI Team',
      date: 'September 28, 2025',
      excerpt: 'Learn how to build strong, lasting relationships with real estate wholesalers to find the best off-market deals in the Atlanta area.',
      category: 'Partnerships',
      image: 'Two real estate professionals shaking hands in front of a property'
    },
    {
      id: 3,
      title: 'Navigating Rehab Projects: Tips for a Successful House Flip',
      author: 'Dr. Elna SaaH',
      date: 'September 15, 2025',
      excerpt: 'From budgeting to finding the right contractors, we share our top tips for managing a successful and profitable rehab project in Atlanta.',
      category: 'Rehabbing',
      image: 'A construction site of a house being renovated'
    }
  ];

  const categories = ['All', 'Investment', 'Partnerships', 'Rehabbing', 'Market News'];

  return (
    <>
      <Helmet>
        <title>Resources - Pavel REI Blog</title>
        <meta name="description" content="Stay informed with the latest real estate news, tips, and insights from the Pavel REI team. Our blog covers property investment, partnerships, and rehabbing in Atlanta." />
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
              Pavel REI Resources
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-300"
            >
              Your source for real estate insights, market trends, and investment strategies in Atlanta.
            </motion.p>
          </div>
        </section>

        {/* Blog Content */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Search and Categories */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
              <div className="relative w-full md:w-1/3">
                <input
                  type="text"
                  placeholder="Search articles..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#16285B]"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {categories.map(category => (
                  <Button key={category} variant={category === 'All' ? 'default' : 'outline'} className={`rounded-full ${category === 'All' ? 'bg-[#152246] text-white' : 'border-[#16285B] text-[#16285B]'}`}>
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            {/* Blog Posts Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col group"
                  onClick={handleBlogClick}
                >
                  <div className="relative">
                    <img alt={post.image} className="w-full h-56 object-cover" src="https://images.unsplash.com/photo-1582407947304-fd86f028f716" />
                    <div className="absolute top-4 left-4 bg-[#16285B] text-white text-xs font-bold px-2 py-1 rounded">
                      {post.category}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-[#16285B] transition-colors">{post.title}</h2>
                    <div className="flex items-center text-sm text-gray-500 mb-4 space-x-4">
                      <span className="flex items-center"><User size={14} className="mr-1" /> {post.author}</span>
                      <span className="flex items-center"><Calendar size={14} className="mr-1" /> {post.date}</span>
                    </div>
                    <p className="text-slate-600 mb-6 flex-grow">{post.excerpt}</p>
                    <div className="mt-auto">
                      <span className="font-bold text-[#16285B] group-hover:underline">
                        Read More <ArrowRight className="inline-block" size={16} />
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Blog;