import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '@/context/PrivacyContext';

export function PrivacyToggle() {
  const { isPrivate, togglePrivacy } = usePrivacy();

  return (
    <button
      onClick={togglePrivacy}
      className={`cursor-pointer flex items-center justify-center w-10 h-10 rounded-md transition-colors ${
        isPrivate ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {isPrivate ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}
