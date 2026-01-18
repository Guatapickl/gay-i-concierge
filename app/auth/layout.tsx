import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-8rem)] py-12">
      <Link href="/" className="mb-8 flex items-center gap-4">
        <img src="/logo.png" alt="Gay I Club" className="w-16 h-16" />
        <span className="text-2xl font-display font-bold text-foreground">
          Gay I Club
        </span>
      </Link>
      {children}
    </div>
  );
}
