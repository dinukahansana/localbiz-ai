import { Heart, Sparkles, TrendingUp } from 'lucide-react';

// A small CSS illustration keeps the starter self-contained and fast to load.
export default function StoreIllustration() {
  return (
    <div className="store-scene" aria-hidden="true">
      <div className="store-orbit" />
      <Sparkles className="store-spark" size={31} strokeWidth={1.4} />
      <div className="store-building">
        <div className="store-roof">
          <span>YOUR LOCAL FAVORITE</span>
        </div>
        <div className="store-awning">
          {Array.from({ length: 7 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="store-front">
          <div className="store-window">
            <span />
            <span />
          </div>
          <div className="store-door">
            <span>hello!</span>
            <i />
          </div>
        </div>
        <div className="store-step" />
      </div>
      <div className="store-tag store-tag-heart">
        <Heart size={15} fill="currentColor" />
        <span>Locally loved</span>
      </div>
      <div className="store-tag store-tag-growth">
        <TrendingUp size={18} />
        <span>Room to grow</span>
      </div>
      <div className="store-plant">
        <i />
        <i />
        <i />
        <span />
      </div>
    </div>
  );
}
