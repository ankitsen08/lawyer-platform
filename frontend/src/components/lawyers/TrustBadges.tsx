import { ShieldCheck, Award, Star } from "lucide-react";

export function TrustBadges({ rating, reviewCount }: { rating: number, reviewCount?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 10.0/10 Rating Box - The Super Lawyers/Avvo hybrid score */}
      <div className="group relative flex items-center gap-1.5 border border-black px-2.5 py-1 text-xs font-bold uppercase tracking-widest cursor-default hover:bg-neutral-50 transition-colors">
        <Star className="w-3.5 h-3.5 fill-black" />
        <span>{rating.toFixed(1)}/10</span>
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none bg-black text-white text-[10px] px-3 py-2 text-center tracking-widest z-10 shadow-xl">
          Perfect Peer & Client Score
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
        </div>
      </div>

      {/* Top 1% Rated Pill */}
      <div className="group relative flex items-center bg-neutral-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black cursor-default rounded-full hover:bg-neutral-200 transition-colors">
        <Award className="w-3.5 h-3.5 mr-1.5" />
        Top 1% Rated
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none bg-black text-white text-[10px] px-3 py-2 text-center tracking-widest z-10 shadow-xl rounded-sm">
          Awarded to top performers nationwide
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
        </div>
      </div>

      {/* Verified License */}
      <div className="group relative flex items-center text-neutral-500 hover:text-black transition-colors cursor-default text-[10px] font-bold uppercase tracking-widest">
        <ShieldCheck className="w-4 h-4 mr-1" />
        Verified License
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none bg-black text-white text-[10px] px-3 py-2 text-center tracking-widest z-10 shadow-xl rounded-sm">
          State Bar License Active & Clear
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
        </div>
      </div>
    </div>
  );
}
