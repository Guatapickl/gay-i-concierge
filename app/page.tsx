export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center z-10">
        <div className="mb-8 animate-pulse">
          <img
            src="/logo.png"
            alt="Gay-I Club Logo"
            className="w-48 h-48 mx-auto drop-shadow-[0_0_20px_rgba(255,0,204,0.8)]"
          />
        </div>
        <div className="relative">
          <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-accent font-orbitron tracking-tighter drop-shadow-[0_0_10px_rgba(255,0,204,0.8)] animate-pulse">
            WELCOME TO THE <br />
            <span className="text-8xl">GAY-I CLUB</span>
          </h1>
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        </div>

        <p className="mt-6 text-2xl text-gray-300 font-space tracking-wide max-w-2xl">
          Your <span className="text-accent">AI-powered</span> club concierge.
          <br />
          Experience the future of community.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-8 mt-12 sm:w-full">
          <a
            href="/auth/sign-in"
            className="group relative w-96 p-8 text-left rounded-xl overflow-hidden transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 group-hover:border-primary/50 transition-colors duration-300"></div>
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
            <div className="relative z-10">
              <h3 className="text-3xl font-bold font-orbitron text-white group-hover:text-primary transition-colors">Sign In &rarr;</h3>
              <p className="mt-4 text-xl text-gray-300 group-hover:text-white transition-colors">
                Already a member? Jack in to access your account.
              </p>
            </div>
          </a>

          <a
            href="/auth/sign-up"
            className="group relative w-96 p-8 text-left rounded-xl overflow-hidden transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 group-hover:border-accent/50 transition-colors duration-300"></div>
            <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
            <div className="relative z-10">
              <h3 className="text-3xl font-bold font-orbitron text-white group-hover:text-accent transition-colors">Sign Up &rarr;</h3>
              <p className="mt-4 text-xl text-gray-300 group-hover:text-white transition-colors">
                Not a member yet? Initialize your profile sequence.
              </p>
            </div>
          </a>
        </div>
      </main>
    </div>
  );
}
