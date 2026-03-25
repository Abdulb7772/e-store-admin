import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} STORE. All rights reserved.</p>
        <div className="flex gap-5 text-xs">
          <Link href="#" className="text-slate-400 hover:text-blue-600 transition-colors">Privacy Policy</Link>
          <Link href="#" className="text-slate-400 hover:text-blue-600 transition-colors">Terms of Service</Link>
          <Link href="#" className="text-slate-400 hover:text-blue-600 transition-colors">Cookie Policy</Link>
        </div>
      </div>
    </footer>
  );
}
