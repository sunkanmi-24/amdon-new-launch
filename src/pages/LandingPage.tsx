import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Shield, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import AMDONlogo from "@/asset/images/AMDON-logo.png";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">

            <img src={AMDONlogo} alt="AMDON Logo" className="h-10 w-auto object contain"  />
           
          
    
          </div>
          <div className="flex items-center gap-2">
            <Link to="/query">
              <Button variant="ghost" size="sm">
                <Search className="w-4 h-4 mr-1.5" /> Look Up ID
              </Button>
            </Link>
           <Link to="/login">
  <Button variant="outline" size="sm">Member Login</Button>
</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Cars"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/95" />
        </div>

        <div className="container mx-auto px-4 text-center max-w-3xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Official Member Registration Portal
            </div>
            <h2 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight mb-5">
              Join the <span className="text-gradient-primary">AMDON</span> Network
            </h2>
            <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
              The Automobile and Motorcycle Dealers Association of Nigeria (AMDON) unites automobile professionals across the nation. Register to receive your unique Member ID and access exclusive member benefits.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register">
                <Button size="lg" className="min-w-[200px] text-base h-12">
                  Register Now <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/query">
                <Button variant="outline" size="lg" className="min-w-[200px] text-base h-12">
                  Already registered? Look Up ID
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Quick Registration"
              description="Complete your registration in 3 simple steps. Get your unique AMDON Member ID instantly."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Member Dashboard"
              description="Access your personal dashboard to view and manage your profile information anytime."
            />
            <FeatureCard
              icon={<Search className="w-6 h-6" />}
              title="ID Lookup"
              description="Quickly verify membership by searching with a Member ID or name."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AMDON — Automobile and Motorcycle Dealers Association of Nigeria</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4 }}
    className="bg-card rounded-xl p-6 border shadow-sm"
  >
    <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center text-accent-foreground mb-4">
      {icon}
    </div>
    <h3 className="font-heading font-semibold text-lg mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
  </motion.div>
);

export default LandingPage;
