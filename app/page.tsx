import ChatWindow from '@/components/ChatWindow';
import BackgroundParticles from '@/components/BackgroundParticles';

export default function Home() {
  return (
    <div className="relative">
      <BackgroundParticles />
      <div className="flex justify-center relative z-10">
        <ChatWindow />
      </div>
    </div>
  );
}
