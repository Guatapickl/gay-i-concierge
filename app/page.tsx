import ChatWindow from '@/components/ChatWindow';

export default function Home() {
  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-center relative z-10 px-6 sm:px-12 lg:px-20">
        <ChatWindow />
      </div>
    </div>
  );
}
