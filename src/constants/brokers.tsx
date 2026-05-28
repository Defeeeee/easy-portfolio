export type BrokerType = 'balanz' | 'cocos';

export interface BrokerConfig {
  id: BrokerType;
  name: string;
  textColorClass: string;
  logoUrl: string;
  fontFamily?: string;
  renderText?: (text: string) => React.ReactNode;
}

export const BROKERS: Record<BrokerType, BrokerConfig> = {
  balanz: {
    id: 'balanz',
    name: 'BALANZ',
    textColorClass: 'text-[#192572]',
    logoUrl: '/balanz-logo.png',
  },
  cocos: {
    id: 'cocos',
    name: 'cocos capital',
    textColorClass: 'text-[#0062e1] font-extrabold',
    logoUrl: '/cocos-logo.png',
    fontFamily: 'Fonarto, sans-serif',
    renderText: (text: string) => {
      const parts = text.split(' ');
      if (parts.length === 1) {
        return <span style={{ color: '#002c65' }}>{parts[0]}</span>;
      }
      return (
        <>
          <span style={{ color: '#002c65' }}>{parts[0]}</span>{' '}
          <span style={{ color: '#0062e1' }}>{parts.slice(1).join(' ')}</span>
        </>
      );
    },
  },
};
