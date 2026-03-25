const LOGIN_ROUTE = '/login';
const SPLASH_DURATION_MS = 3000;

export default function Home() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.setTimeout(function(){window.location.replace('${LOGIN_ROUTE}');}, ${SPLASH_DURATION_MS});`,
        }}
      />
      <noscript>
        <meta httpEquiv="refresh" content={`3;url=${LOGIN_ROUTE}`} />
      </noscript>

      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-slate-800 to-slate-600 text-slate-400 flex items-center justify-center px-6">
        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-slate-300/20 blur-3xl animate-pulse [animation-delay:700ms]" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-white/10 blur-3xl animate-pulse [animation-delay:400ms]" />

        <div className="relative text-center z-10">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center shadow-2xl animate-bounce">
            <span className="text-4xl font-black tracking-tight text-slate-400">A</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-lg">E-store Admin Portal</h1>
          <p className="mt-3 text-sm sm:text-base font-semibold text-slate-400">
            Preparing your dashboard experience...
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-400 animate-bounce" />
            <span className="w-3 h-3 rounded-full bg-slate-400 animate-bounce [animation-delay:180ms]" />
            <span className="w-3 h-3 rounded-full bg-slate-400 animate-bounce [animation-delay:360ms]" />
          </div>

          <a
            href="/login"
            className="inline-block mt-6 text-sm font-semibold px-4 py-2 rounded-full bg-white/25 hover:bg-white/35 transition"
          >
            Go to Login
          </a>
        </div>
      </div>
    </>
  );
}
