import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LunaFemCare — Your AI Women's Health Sanctuary",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-earth-100">
      {/* Top Nav */}
      <header className="w-full py-4 px-8 flex items-center justify-between border-b border-white/40 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
            LF
          </div>
          <span className="font-display font-semibold text-earth-900 text-xl tracking-tight">
            LunaFemCare
          </span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-earth-700">
          <a href="#features" className="hover:text-primary-600 transition-colors">Features</a>
          <a href="#" className="hover:text-primary-600 transition-colors">About</a>
        </nav>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="w-full py-8 text-center border-t border-earth-200/60 bg-earth-200/40">
        <p className="font-medium text-sm text-earth-700">© {new Date().getFullYear()} LunaFemCare. All rights reserved.</p>
        <p className="text-xs max-w-xl mx-auto mt-2 text-earth-500 leading-relaxed">
          All data is for informational purposes only. LunaFemCare does not provide medical advice. Please consult a doctor for severe symptoms.
        </p>
      </footer>
    </div>
  );
}
