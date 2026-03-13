import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  MessageSquare,
  FileText,
  KanbanSquare,
  RefreshCcw,
  ArrowRight,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

// Custom hook for simple scroll animations
const useFadeInOnScroll = () => {
  const domRef = useRef();
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    const { current } = domRef;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  return [domRef, isVisible];
};

const FadeInSection = ({ children, delay = "0ms", className = "" }) => {
  const [ref, isVisible] = useFadeInOnScroll();
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: delay }}
    >
      {children}
    </div>
  );
};

// Orbiting image that traces a circle and counter-rotates to stay upright
const OrbitingImage = ({ src, alt, size, radius, startAngle = 0, duration = 90, reverse = false }) => {
  const half = size / 2;
  return (
    <div
      className="absolute"
      style={{
        width: size,
        height: size,
        top: '50%',
        left: '50%',
        marginTop: -half,
        marginLeft: -half,
        '--start': `${startAngle}deg`,
        '--radius': `${radius}px`,
        animation: `orbit-${reverse ? 'reverse' : 'forward'} ${duration}s linear infinite`,
        transformOrigin: '50% 50%',
      }}
    >
      <div className="bg-white rounded-full border border-[#e9e8e4] p-0.5 w-full h-full">
        <img src={src} alt={alt} className="w-full h-full rounded-full object-cover" />
      </div>
    </div>
  );
};

export default function App() {
  const navigate = useNavigate();

  // Auto-redirect to /app if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => { if (res.ok) navigate('/app', { replace: true }); })
        .catch(() => {});
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white text-[#37352f] font-sans selection:bg-[rgba(45,170,219,0.3)] overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e9e8e4]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 font-medium text-xl tracking-tight">
            <img src="/icons/cortex-header-logo.png" alt="Cortex" className="w-6 h-6 rounded-[3px]" />
            <span>Cortex</span>
          </button>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#787774]">
            <a href="#product" className="hover:text-[#37352f]">Product</a>
            <a href="#features" className="hover:text-[#37352f]">How it Works</a>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/app')} className="border border-[#e9e8e4] hover:bg-[rgba(55,53,47,0.08)] text-sm font-medium text-[#37352f] px-5 py-2 rounded-[3px] hidden sm:block">
              Log in
            </button>
            <button onClick={() => navigate('/app')} className="bg-[#2383e2] hover:bg-[#1b6abf] text-white text-sm font-medium px-5 py-2 rounded-[3px]">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-0 px-6 relative overflow-hidden">
        {/* Concentric Circles — 2 rings with orbiting images & icons */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '45%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '1400px',
            height: '1400px',
            zIndex: 1,
            maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 72%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 72%)',
          }}
        >
          {/* Outer Ring — 1200px */}
          <div
            className="absolute rounded-full border border-[#e9e8e4]/35"
            style={{
              width: '1200px',
              height: '1200px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Outer ring — 12 items at exactly 30° apart, icons at 90°/210°/330° (120° spacing) */}
            <OrbitingImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" alt="Person" size={50} radius={600} startAngle={0} duration={220} reverse />
            <OrbitingImage src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" alt="Person" size={46} radius={600} startAngle={30} duration={220} reverse />
            <OrbitingImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop" alt="Person" size={48} radius={600} startAngle={60} duration={220} reverse />
            <OrbitingImage src="/icons/jira.png" alt="Jira" size={46} radius={600} startAngle={90} duration={220} reverse />
            <OrbitingImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" alt="Person" size={44} radius={600} startAngle={120} duration={220} reverse />
            <OrbitingImage src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop" alt="Person" size={50} radius={600} startAngle={150} duration={220} reverse />
            <OrbitingImage src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop" alt="Person" size={46} radius={600} startAngle={180} duration={220} reverse />
            <OrbitingImage src="/icons/teams.png" alt="Teams" size={46} radius={600} startAngle={210} duration={220} reverse />
            <OrbitingImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" alt="Person" size={44} radius={600} startAngle={240} duration={220} reverse />
            <OrbitingImage src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop" alt="Person" size={48} radius={600} startAngle={270} duration={220} reverse />
            <OrbitingImage src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop" alt="Person" size={46} radius={600} startAngle={300} duration={220} reverse />
            <OrbitingImage src="/icons/slack.png" alt="Slack" size={46} radius={600} startAngle={330} duration={220} reverse />
          </div>

        </div>

        {/* Gradient fade to white — dissolves circles before video */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-b from-transparent to-white pointer-events-none" style={{ zIndex: 2 }}></div>

        <div className="max-w-4xl mx-auto text-center relative" style={{ zIndex: 3 }}>
          <FadeInSection delay="0ms">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[#37352f] mb-6 leading-[1.1]">
              Conversations in. <br className="hidden md:block" />
              Features out.
            </h1>
          </FadeInSection>

          <FadeInSection delay="150ms">
            <p className="text-xl text-[#787774] mb-10 max-w-2xl mx-auto leading-relaxed">
              The agentic workflow that listens to your Teams meetings, drafts perfect product requirements, and syncs seamlessly with Jira. Idea to execution, without the busywork.
            </p>
          </FadeInSection>

          <FadeInSection delay="300ms" className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/app')} className="w-full sm:w-auto bg-[#2383e2] hover:bg-[#1b6abf] text-white font-medium px-8 py-3.5 rounded-[3px] flex items-center justify-center gap-2">
              Start Free Trial
              <ChevronRight className="w-4 h-4" />
            </button>
            <button className="w-full sm:w-auto bg-[#F7F7F9] hover:bg-[#EDEDF0] text-[#37352f] font-medium px-8 py-3.5 rounded-[3px] flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              Watch Demo
            </button>
          </FadeInSection>
        </div>

        {/* Video Placeholder */}
        <div style={{ position: 'relative', zIndex: 3 }}>
        <FadeInSection delay="500ms" className="max-w-5xl mx-auto mt-20 pb-20 relative group cursor-pointer">
          <div className="relative aspect-video bg-[#F7F7F9] rounded-[6px] border border-[#e9e8e4] overflow-hidden flex items-center justify-center">
            {/* UI Mockup background */}
            <div className="absolute inset-0 bg-white flex flex-col">
              <div className="h-12 border-b border-[#e9e8e4] flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#e9e8e4]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#e9e8e4]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#e9e8e4]"></div>
                </div>
                <div className="mx-auto w-64 h-6 bg-[#F7F7F9] rounded-[3px] border border-[#e9e8e4]"></div>
              </div>
              <div className="flex-1 bg-[#F7F7F9]/50 p-8 flex items-center justify-center">
                 <div className="w-full h-full max-w-3xl border border-[#e9e8e4] rounded-[3px] bg-white flex flex-col">
                   {/* Fake editor lines */}
                   <div className="p-6 space-y-4">
                      <div className="w-1/3 h-6 bg-[#F7F7F9] rounded-[3px]"></div>
                      <div className="w-full h-4 bg-[#F7F7F9]/60 rounded-[3px] mt-4"></div>
                      <div className="w-5/6 h-4 bg-[#F7F7F9]/60 rounded-[3px]"></div>
                      <div className="w-4/6 h-4 bg-[#F7F7F9]/60 rounded-[3px]"></div>
                   </div>
                 </div>
              </div>
            </div>

            {/* Video Overlay */}
            <div className="absolute inset-0 bg-[rgba(55,53,47,0.05)] group-hover:bg-[rgba(55,53,47,0.1)]"></div>

            {/* Play Button */}
            <div className="absolute z-10 w-20 h-20 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-notion-popup group-hover:scale-110 transition-transform duration-500 ease-out">
              <Play className="w-8 h-8 text-[#37352f] translate-x-0.5" fill="currentColor" />
            </div>
          </div>
        </FadeInSection>
        </div>
      </section>

      {/* The 3 Pillars Section */}
      <section id="features" className="py-24 bg-[#F7F7F9]">
        <div className="max-w-7xl mx-auto px-6">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-[#37352f]">
              The seamless product pipeline.
            </h2>
            <p className="text-lg text-[#787774] max-w-2xl mx-auto">
              Three flawless steps. Complete bidirectional synchronization. Never lose context from a meeting again.
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-[#e9e8e4] -z-0"></div>

            {/* Pillar 1 */}
            <FadeInSection delay="100ms" className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white rounded-[6px] border border-[#e9e8e4] flex items-center justify-center mb-6 group hover:-translate-y-2 transition-transform duration-300">
                <MessageSquare className="w-10 h-10 text-[#37352f] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. AI Context Capture</h3>
              <p className="text-[#787774] leading-relaxed">
                Our agent quietly joins your MS Teams or Slack huddles, transcribing and extracting product decisions in real-time.
              </p>
            </FadeInSection>

            {/* Pillar 2 */}
            <FadeInSection delay="300ms" className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-[#2383e2] rounded-[6px] flex items-center justify-center mb-6 group hover:-translate-y-2 transition-transform duration-300">
                <FileText className="w-10 h-10 text-white group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Smart Requirements</h3>
              <p className="text-[#787774] leading-relaxed">
                Raw conversations are transformed into beautiful, structured PRDs. Product Owners can refine and edit seamlessly.
              </p>
            </FadeInSection>

            {/* Pillar 3 */}
            <FadeInSection delay="500ms" className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white rounded-[6px] border border-[#e9e8e4] flex items-center justify-center mb-6 group hover:-translate-y-2 transition-transform duration-300">
                <KanbanSquare className="w-10 h-10 text-[#37352f] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Jira Execution</h3>
              <p className="text-[#787774] leading-relaxed">
                Approved requirements instantly generate Jira epics and tickets. Changes in Jira? They sync right back to the PRD.
              </p>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Magic Sync Feature Detail */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeInSection>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-[#37352f]">
                A single source of truth,<br />
                constantly in sync.
              </h2>
              <p className="text-lg text-[#787774] mb-8 leading-relaxed">
                Forget manually copying text from a Word document to a Jira ticket. Cortex establishes a bi-directional living link between your product requirements and developer tasks.
              </p>

              <ul className="space-y-5">
                {[
                  "Edit the PRD, and Jira tickets update automatically.",
                  "Developers adjust scope in Jira, your PRD reflects the change.",
                  "Full version history and audit trails for complete visibility."
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#0f7b6c] shrink-0" />
                    <span className="text-[#37352f]">{item}</span>
                  </li>
                ))}
              </ul>
            </FadeInSection>

            <FadeInSection delay="200ms" className="relative">
              <div className="absolute inset-0 bg-[#F7F7F9] transform -skew-y-3 rounded-[6px] -z-10"></div>
              <div className="p-8">
                {/* Abstract Sync Visualization */}
                <div className="bg-white rounded-[6px] border border-[#e9e8e4] p-6 flex flex-col gap-6">

                  {/* PRD Mockup */}
                  <div className="flex items-center justify-between p-4 rounded-[3px] bg-[#F7F7F9] border border-[#e9e8e4]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[3px] bg-[rgba(55,53,47,0.08)] flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#37352f]" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#37352f]">User Auth PRD</div>
                        <div className="text-xs text-[#9b9a97]">Last edited just now</div>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-[#0f7b6c] animate-pulse"></div>
                  </div>

                  {/* Sync Animation Area */}
                  <div className="flex justify-center py-2 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#F7F7F9] rounded-full flex items-center justify-center z-10">
                      <RefreshCcw className="w-4 h-4 text-[#37352f] animate-[spin_3s_linear_infinite]" />
                    </div>
                    <div className="w-[2px] h-16 bg-gradient-to-b from-[#e9e8e4] via-[#787774] to-[#e9e8e4]"></div>
                  </div>

                  {/* Jira Mockup */}
                  <div className="flex items-center justify-between p-4 rounded-[3px] bg-[#F7F7F9] border border-[#e9e8e4]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[3px] bg-[#DEEBFF] flex items-center justify-center">
                        <KanbanSquare className="w-5 h-5 text-[#0052CC]" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#37352f]">PROJ-142: OAuth Login</div>
                        <div className="text-xs text-[#9b9a97]">In Progress &middot; Updated 1m ago</div>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-[#0f7b6c] bg-[rgba(15,123,108,0.08)] px-2 py-1 rounded-[3px]">Synced</div>
                  </div>

                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 relative overflow-hidden bg-[#2383e2] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FadeInSection>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Ready to ship faster?
            </h2>
            <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              Join the innovative product teams who have automated their workflow from meetings to deployment.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate('/app')} className="w-full sm:w-auto bg-white hover:bg-[#F7F7F9] text-[#2383e2] font-medium px-8 py-4 rounded-[3px] flex items-center justify-center gap-2 text-lg">
                Get Started for Free
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-6 text-sm text-white/50">No credit card required. 14-day free trial.</p>
          </FadeInSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e9e8e4] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-medium text-xl tracking-tight text-[#37352f]">
            <img src="/icons/cortex-header-logo.png" alt="Cortex" className="w-6 h-6 rounded-[3px]" />
            <span>Cortex</span>
          </div>
          <div className="flex gap-8 text-sm text-[#787774]">
            <a href="#" className="hover:text-[#37352f]">Privacy</a>
            <a href="#" className="hover:text-[#37352f]">Terms</a>
            <a href="#" className="hover:text-[#37352f]">Twitter</a>
            <a href="#" className="hover:text-[#37352f]">LinkedIn</a>
          </div>
          <p className="text-sm text-[#9b9a97]">
            &copy; {new Date().getFullYear()} Cortex Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
