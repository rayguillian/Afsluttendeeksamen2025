import React from 'react';
import OnboardingFlow from './OnboardingFlow';

const IPhoneFrame = () => {
  return (
    <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] md:max-w-[375px] aspect-[375/760] transform-gpu">
      {/* iPhone Frame */}
      <div className="absolute inset-0 bg-black rounded-[clamp(30px,8vw,60px)] shadow-2xl">
        {/* Screen */}
        <div className="absolute inset-0 bg-white rounded-[clamp(24px,6.5vw,47px)] m-[clamp(6px,1.6vw,12px)] overflow-hidden">
          {/* Status Bar */}
          <div className="absolute top-0 inset-x-0 h-[clamp(24px,6.5vw,47px)] bg-white flex items-center justify-between px-[clamp(12px,3vw,24px)] z-50">
            <div className="text-xs sm:text-sm font-medium">9:41</div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none">
                <path d="M18 10L21 7V17L18 14M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12ZM12 12C7.58172 12 4 15.5817 4 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none">
                <path d="M4 4H20V20H4V4Z M7 7H17V17H7V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div className="flex items-center scale-75 sm:scale-100">
                <div className="h-2.5 w-0.5 sm:w-1 bg-current rounded-sm mr-0.5"></div>
                <div className="h-3.5 w-0.5 sm:w-1 bg-current rounded-sm mr-0.5"></div>
                <div className="h-2.5 w-0.5 sm:w-1 bg-current rounded-sm mr-0.5"></div>
                <div className="h-1.5 w-0.5 sm:w-1 bg-current rounded-sm"></div>
              </div>
            </div>
          </div>

          {/* Dynamic Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[clamp(60px,16vw,120px)] h-[clamp(12px,3.2vw,24px)] bg-black rounded-b-[clamp(8px,2.1vw,16px)] z-50">
            <div className="absolute inset-x-[clamp(16px,4.3vw,32px)] top-[clamp(3px,0.8vw,6px)] h-[clamp(3px,0.8vw,6px)] bg-black rounded-lg"></div>
          </div>

          {/* Content Area */}
          <div className="relative h-full pt-[clamp(24px,6.5vw,47px)] pb-[env(safe-area-inset-bottom,16px)] flex flex-col">
            <OnboardingFlow />
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-[env(safe-area-inset-bottom,8px)] left-1/2 -translate-x-1/2 w-[clamp(48px,12.8vw,96px)] h-[clamp(2px,0.5vw,4px)] bg-black rounded-full opacity-20"></div>
        </div>
      </div>
    </div>
  );
};

export default IPhoneFrame;
