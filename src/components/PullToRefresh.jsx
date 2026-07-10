import { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

// Tepadan pastga surish orqali yangilash (mobil brauzerdek).
// window.scrollY === 0 bo'lganda pastga tortilsa — onRefresh() chaqiriladi.
export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const THRESHOLD = 70;

  const onTouchStart = (e) => {
    startY.current = (window.scrollY <= 0 && !refreshing) ? e.touches[0].clientY : null;
  };

  const onTouchMove = (e) => {
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY <= 0) {
      setPull(Math.min(dy * 0.5, 90)); // qarshilik (damping)
    } else {
      setPull(0);
    }
  };

  const onTouchEnd = async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(46);
      try { await onRefresh?.(); } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const active = pull > 0 || refreshing;
  const ready = pull >= THRESHOLD;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {/* Yangilash indikatori */}
      <div
        className="flex items-center justify-center overflow-hidden pointer-events-none"
        style={{
          height: pull,
          opacity: active ? 1 : 0,
          transition: startY.current === null ? 'height 0.25s ease, opacity 0.25s ease' : 'none',
        }}
      >
        <RefreshCw
          size={22}
          className={`text-blue-500 ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: refreshing ? 'none' : `rotate(${pull * 3}deg)`, opacity: ready || refreshing ? 1 : 0.5 }}
        />
      </div>

      {/* Kontent */}
      <div
        style={{
          transform: `translateY(${refreshing ? 0 : 0}px)`,
          transition: startY.current === null ? 'transform 0.25s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
