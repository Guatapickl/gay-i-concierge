import type { Metadata } from 'next';
export const metadata: Metadata = {title:'Account access',description:'Sign in or create your Gay I Club account.',robots:{index:false,follow:false},alternates:{canonical:null}};
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-8rem)] py-8">
      <Link href="/" className="mb-8 flex items-center gap-4">

        <span className="text-2xl font-display font-semibold text-foreground">
          Gay I Club
        </span>
      </Link>
      {children}
    </div>
  );
}
