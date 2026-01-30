import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Wifi, ParkingCircle, UtensilsCrossed, BedDouble, MapPin, Star, Sun } from 'lucide-react';

const ZenAndZeezStayz = () => {
  const { toast } = useToast();

  const handleBookingClick = () => {
    toast({
      title: "🚧 Booking Feature Coming Soon!",
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const featuredRentals = [
    {
      name: 'The Decatur Dream',
      location: 'Decatur, GA',
      beds: 3,
      baths: 2,
      amenities: ['WiFi', 'Kitchen', 'Parking'],
      image: 'A beautifully renovated modern home exterior in Decatur',
    },
  ];

  const benefits = [
    {
      icon: Star,
      title: 'Comfort & Style',
      description: 'Our properties are fully furnished and thoughtfully designed for a relaxing and stylish stay.',
    },
    {
      icon: MapPin,
      title: 'Prime Locations',
      description: 'Stay close to schools, shopping, major attractions, and business centers in Atlanta.',
    },
    {
      icon: Sun,
      title: 'Hassle-Free Booking',
      description: 'Enjoy easy check-in, flexible terms, and dedicated support throughout your stay.',
    },
  ];

  const amenityIcons = {
    WiFi: Wifi,
    Kitchen: UtensilsCrossed,
    Parking: ParkingCircle,
  };

  return (
    <>
      <Helmet>
        <title>Zen & ZeeZ Stayz - Short-Term Rentals in Georgia</title>
        <meta name="description" content="Discover beautifully renovated short-term rental properties in Georgia with Zen & ZeeZ Stayz. Perfect for families, business travelers, and vacationers." />
      </Helmet>
      <div className="bg-white text-slate-800">
        {/* Hero Section */}
        <section className="relative py-20 min-h-[60vh] flex items-center justify-center text-white overflow-hidden"
          style={{
            backgroundImage: `url('https://horizons-cdn.hostinger.com/539b6f76-d474-4bf3-8847-2bf38fc4f1d6/a3e36b18d5b303b06cc3b55bde72f7d4.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/50"></div> {/* Overlay for text readability */}
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              Your Home Away From Home in Georgia
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-200"
            >
              Short-term stays in our beautifully renovated properties – perfect for families, business travelers, and vacationers.
            </motion.p>
          </div>
        </section>

        {/* Featured Rentals */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-slate-900">Featured Rentals</h2>
              <p className="text-xl text-slate-600 mt-2">Zen Where ever you are</p>
            </div>
            <div className="flex justify-center">
              {featuredRentals.map((rental, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col max-w-2xl w-full"
                >
                  <img alt={rental.image} className="w-full h-80 object-cover" src="https://images.unsplash.com/photo-1701202779560-80aa8df53ae1" />
                  <div className="p-8 flex flex-col flex-grow">
                    <h3 className="text-3xl font-bold text-[#16285B] mb-3">{rental.name}</h3>
                    <p className="text-slate-600 mb-5 flex items-center text-lg"><MapPin size={18} className="mr-2" />{rental.location}</p>
                    <div className="flex items-center space-x-6 text-slate-700 mb-5 text-lg">
                      <span className="flex items-center"><BedDouble size={20} className="mr-2" /> {rental.beds} Beds</span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center"><BedDouble size={20} className="mr-2" /> {rental.baths} Baths</span>
                    </div>
                    <div className="flex items-center space-x-6 mb-8">
                      {rental.amenities.map(amenity => {
                        const Icon = amenityIcons[amenity];
                        return Icon ? <Icon key={amenity} size={24} className="text-slate-500" title={amenity} /> : null;
                      })}
                    </div>
                    <div className="mt-auto">
                      <Button onClick={handleBookingClick} className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg py-6">
                        View Availability
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-12 text-center">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.15 }}
                  >
                    <div className="bg-orange-100 text-orange-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Icon size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                    <p className="text-slate-600">{benefit.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Booking CTA */}
        <section className="py-20 bg-[#16285B] text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready for a Five-Star Stay?</h2>
            <p className="text-lg text-gray-300 mb-8">Find your perfect home away from home in Georgia.</p>
            <Button onClick={handleBookingClick} size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 text-lg">
              Book Your Stay with Zen & ZeeZ
            </Button>
          </div>
        </section>
      </div>
    </>
  );
};

export default ZenAndZeezStayz;