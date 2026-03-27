import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-slate-800">
      <div className="w-full px-4 py-3 sm:px-6 lg:px-8 2xl:px-10 flex flex-col sm:flex-row sm:flex-wrap items-center sm:items-start justify-between gap-3">
        <p className="text-xs text-slate-400 text-center sm:text-left">© {new Date().getFullYear()} e-Store. All rights reserved.</p>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-5 gap-y-2 text-xs">
          <Link href="#" className="text-slate-400 hover:text-slate-400 transition-colors">Privacy Policy</Link>
          <Link href="#" className="text-slate-400 hover:text-slate-400 transition-colors">Terms of Service</Link>
          <Link href="#" className="text-slate-400 hover:text-slate-400 transition-colors">Cookie Policy</Link>
        </div>
      </div>
    </footer>
  );
}
