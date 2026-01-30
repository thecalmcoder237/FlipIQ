import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { MapPin, Phone, Mail, Send, MessageCircle, Building, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const Contact = () => {
  const { toast } = useToast();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const inquiryType = params.get('inquiry');
    if (inquiryType) {
      setFormData(prev => ({ ...prev, inquiryType }));
    }
  }, [location]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from('contact_submissions')
      .insert([
        { 
          name: formData.name, 
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          inquiry_type: formData.inquiryType
        }
      ]);

    setIsSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Something went wrong. Please try again.",
      });
    } else {
      toast({
        title: "✅ Form Submitted!",
        description: "Thank you! We've received your message and will be in touch shortly.",
      });
      e.target.reset();
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        inquiryType: 'general'
      });
    }
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Our Location',
      details: ['Atlanta, Georgia'],
    },
    {
      icon: Phone,
      title: 'Text Us',
      details: ['(404) 919-6808'],
    },
    {
      icon: Mail,
      title: 'Email Us',
      details: ['info@pavelreiproperties.com'],
    }
  ];

  const inquiryTypes = [
    { value: 'general', label: 'General Inquiry', icon: MessageCircle },
    { value: 'partnership', label: 'Sellers & Partners', icon: Users },
    { value: 'investment', label: 'Investment Interest', icon: Building },
  ];

  return (
    <>
      <Helmet>
        <title>Contact Pavel REI - Get in Touch for Real Estate Opportunities</title>
        <meta name="description" content="Contact Pavel REI for real estate partnerships, investment opportunities, and property sales in Atlanta, Georgia." />
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
              Get in Touch
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-300"
            >
              Ready to start a partnership, sell a property, or learn more? We'd love to hear from you.
            </motion.p>
          </div>
        </section>

        {/* Contact Info & Form */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-start">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-bold text-slate-900">Contact Information</h2>
              <p className="text-lg text-slate-600">
                Reach out to us through any of the methods below. We're responsive and ready to help.
              </p>
              <div className="space-y-6">
                {contactInfo.map((info, index) => {
                  const Icon = info.icon;
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <div className="bg-[#16285B] text-white rounded-full p-3">
                        <Icon size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-800">{info.title}</h3>
                        {info.details.map((detail, idx) => (
                          <p key={idx} className="text-slate-600 text-lg">{detail}</p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-gray-50 p-8 rounded-lg shadow-lg"
            >
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type of Inquiry</label>
                  <div className="grid grid-cols-3 gap-2">
                    {inquiryTypes.map((type) => (
                      <label
                        key={type.value}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.inquiryType === type.value
                            ? 'border-[#16285B] bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="inquiryType"
                          value={type.value}
                          checked={formData.inquiryType === type.value}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <type.icon size={20} className="text-[#16285B] mb-1" />
                        <span className="text-xs text-center font-semibold text-slate-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700">Full Name</label>
                    <input type="text" id="name" name="name" required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#16285B] focus:border-[#16285B]" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
                    <input type="email" id="email" name="email" required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#16285B] focus:border-[#16285B]" />
                  </div>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-700">Subject</label>
                  <input type="text" id="subject" name="subject" required onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#16285B] focus:border-[#16285B]" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700">Message</label>
                  <textarea id="message" name="message" required rows={5} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#16285B] focus:border-[#16285B]"></textarea>
                </div>
                <Button type="submit" size="lg" className="w-full bg-[#152246] hover:bg-blue-900 text-white" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message <Send className="ml-2" size={18} />
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Contact;