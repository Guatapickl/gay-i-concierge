import ChatWindow from '@/components/ChatWindow';

export default function Home() {
  return (
    <div className="relative">
      <div className="flex justify-center relative z-10">
        <ChatWindow />
      </div>
    </div>
  );
}
