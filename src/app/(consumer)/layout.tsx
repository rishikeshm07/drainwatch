import { Navbar } from '@/components/Navbar';

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid sm:grid-cols-3 gap-6 mb-6 text-sm">
            <div>
              <p className="text-white font-bold mb-2">🌊 DrainWatch Kerala</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                AI-powered civic technology for real-time drain and canal blockage reporting
                across all districts of Kerala.
              </p>
            </div>
            <div>
              <p className="text-slate-300 font-semibold mb-2">Quick Links</p>
              <div className="space-y-1">
                <a href="/report" className="block text-slate-400 hover:text-blue-400 text-xs transition-colors">Report a Blockage</a>
                <a href="/track"  className="block text-slate-400 hover:text-blue-400 text-xs transition-colors">Track Complaint</a>
                <a href="/gov/login" className="block text-slate-400 hover:text-blue-400 text-xs transition-colors">Government Portal</a>
              </div>
            </div>
            <div>
              <p className="text-slate-300 font-semibold mb-2">Emergency Contacts</p>
              <div className="space-y-1 text-xs text-slate-400">
                <p>Kerala DEOC: <span className="text-white font-mono">1070</span></p>
                <p>Flood Control: <span className="text-white font-mono">0471-2331869</span></p>
                <p>Municipal Helpline: <span className="text-white font-mono">1800-425-1554</span></p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-slate-500 text-xs">
              © 2026 DrainWatch Kerala · Built for Kerala Flood Relief · Hackathon Project
            </p>
            <p className="text-slate-600 text-xs">
              Powered by AI · Satellite Maps by ESRI · Open Source
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
