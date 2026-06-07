import Image from 'next/image';
import { BROKERS, type BrokerType } from '@/constants/brokers';

interface BrokerSelectionProps {
  selectedBroker: BrokerType;
  onSelectBroker: (broker: BrokerType) => void;
}

export function BrokerSelection({ selectedBroker, onSelectBroker }: BrokerSelectionProps) {
  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-4 pt-8">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
        Seleccioná tu broker
      </p>
      <div className="flex flex-wrap justify-center items-center gap-5">
        {(Object.keys(BROKERS) as BrokerType[]).map((brokerId) => {
          const broker = BROKERS[brokerId];
          const isSelected = selectedBroker === broker.id;
          return (
            <button
              key={broker.id}
              onClick={() => onSelectBroker(broker.id)}
              title={broker.name}
              className={`cursor-pointer relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl transition-all duration-300 overflow-hidden`}
            >
              <div
                className={`flex items-center justify-center w-full h-full transition-all duration-300 ${
                  isSelected
                    ? 'grayscale-0 opacity-100'
                    : 'grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                }`}
              >
                <Image
                  src={broker.logoUrl}
                  alt={broker.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-contain p-2"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
