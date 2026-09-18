import { Navbar } from '@/components/Navbar';

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="bg-slate-900 text-slate-400 text-center text-xs py-4 border-t border-slate-800">
        © 2026 DrainWatch · Civic Tech Hackathon Project ·{' '}
        <a href="/gov/login" className="text-blue-400 hover:text-blue-300 transition-colors">
          Government Portal →
        </a>
      </footer>
    </div>
  );
}
