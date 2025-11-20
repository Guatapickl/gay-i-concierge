import FuturisticRobot from '@/components/FuturisticRobot';

export default function RobotPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent font-orbitron mb-8 animate-pulse">
                GAY-I UNIT 01
            </h1>
            <div className="w-full max-w-2xl aspect-square relative">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent rounded-full blur-3xl -z-10" />
                <FuturisticRobot className="drop-shadow-[0_0_30px_rgba(0,255,255,0.3)]" />
            </div>
            <p className="mt-8 text-xl text-gray-400 font-mono">
                SYSTEM STATUS: <span className="text-green-400">ONLINE</span>
            </p>
        </div>
    );
}
