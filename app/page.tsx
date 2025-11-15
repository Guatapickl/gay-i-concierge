export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold text-primary font-orbitron">
          Welcome to the Gay-I Club
        </h1>

        <p className="mt-3 text-2xl text-foreground">
          Your AI-powered club concierge
        </p>

        <div className="flex flex-wrap items-center justify-around max-w-4xl mt-6 sm:w-full">
          <a
            href="/auth/sign-in"
            className="p-6 mt-6 text-left border w-96 rounded-xl hover:text-primary focus:text-primary"
          >
            <h3 className="text-2xl font-bold">Sign In &rarr;</h3>
            <p className="mt-4 text-xl">
              Already a member? Sign in to access your account.
            </p>
          </a>

          <a
            href="/auth/sign-up"
            className="p-6 mt-6 text-left border w-96 rounded-xl hover:text-primary focus:text-primary"
          >
            <h3 className="text-2xl font-bold">Sign Up &rarr;</h3>
            <p className="mt-4 text-xl">
              Not a member yet? Sign up to join the club.
            </p>
          </a>
        </div>
      </main>
    </div>
  );
}
