const STATUS_CONFIG = {
  yangi:      { label: 'Zayavka',    bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500' },
  jarayonda:  { label: 'Yuvilmoqda', bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-500' },
  qadoqlash:  { label: 'Pardozda',   bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500' },
  dostavka:   { label: 'Dastavka',   bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  tugadi:     { label: 'Tugadi',     bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400' },
  otkaz:      { label: 'Otkaz',      bg: 'bg-red-100',     text: 'text-red-600',     dot: 'bg-red-500' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.yangi;
  const sizeClass = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${cfg.bg} ${cfg.text} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export { STATUS_CONFIG };
