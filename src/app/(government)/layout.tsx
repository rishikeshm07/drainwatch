// Government portal has its own layout — no consumer Navbar
export default function GovLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
