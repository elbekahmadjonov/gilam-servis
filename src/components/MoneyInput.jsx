import { formatMoneyInput, parseSum } from '../utils/formatlash';

// Pul kiritish maydoni — kiritilayotganda vergul bilan ajratib ko'rsatadi
// (1,000,000), lekin onChange orqali toza raqam qatorini (1000000) qaytaradi.
// value: string|number (toza raqam yoki bo'sh), onChange: (rawDigits: string) => void
export default function MoneyInput({ value, onChange, className, placeholder = '0', ...rest }) {
  const display = formatMoneyInput(value);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      placeholder={placeholder}
      onChange={e => onChange(parseSum(e.target.value))}
      className={className}
      {...rest}
    />
  );
}
