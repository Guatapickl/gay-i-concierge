import ChatWindow from '@/components/ChatWindow';

export default function Home() {
  return (
    <div className="relative w-full max-w-6xl mx-auto">
      <div className="flex justify-center relative z-10">
        <ChatWindow />
      </div>
    </div>
  );
}
