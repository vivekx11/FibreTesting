import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SpeedometerProps {
  speed: number;       // Current speed in Mbps
  stage: 'idle' | 'ping' | 'download' | 'upload' | 'complete' | 'error';
  percent: number;     // Progress percentage (0 - 100) of the current test
}

export const Speedometer: React.FC<SpeedometerProps> = ({ speed, stage, percent }) => {
  const [maxScale, setMaxScale] = useState(100);

  // Auto-scale the dial max limit based on speed
  useEffect(() => {
    if (speed > maxScale) {
      if (speed <= 500) setMaxScale(500);
      else if (speed <= 1000) setMaxScale(1000);
      else setMaxScale(2000);
    } else if (stage === 'idle') {
      setMaxScale(100);
    }
  }, [speed, stage, maxScale]);

  // Map speed to arc degrees (we use a 270-degree arc from 135 to 405 deg)
  const angleStart = 135;
  const angleEnd = 405;
  const totalAngle = angleEnd - angleStart;


  // SVG calculations
  const size = 280;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = center - strokeWidth - 10;
  const circumference = 2 * Math.PI * radius;
  
  // A 270-degree arc has an arc length of 3/4 circumference
  const arcLength = circumference * 0.75;

  
  // Calculate dash offset for speed fill
  // When speed = 0, strokeDashoffset = arcLength
  // When speed = maxScale, strokeDashoffset = 0
  const speedRatio = Math.min(speed, maxScale) / maxScale;
  const strokeDashoffset = arcLength - speedRatio * arcLength;

  // Generate tick marks (spaced out 270 degrees)
  const ticks = [];
  const tickCount = 11; // 10 intervals
  for (let i = 0; i < tickCount; i++) {
    const ratio = i / (tickCount - 1);
    const angle = angleStart + ratio * totalAngle;
    const angleRad = (angle * Math.PI) / 180;
    
    // Ticks positions
    const x1 = center + (radius - 8) * Math.cos(angleRad);
    const y1 = center + (radius - 8) * Math.sin(angleRad);
    const x2 = center + (radius + 2) * Math.cos(angleRad);
    const y2 = center + (radius + 2) * Math.sin(angleRad);
    
    // Tick value text position
    const textDist = radius - 22;
    const tx = center + textDist * Math.cos(angleRad);
    const ty = center + textDist * Math.sin(angleRad);
    
    const value = Math.round(ratio * maxScale);

    ticks.push({ x1, y1, x2, y2, tx, ty, value, index: i });
  }

  // Get status message
  const getStatusMessage = () => {
    switch (stage) {
      case 'idle':
        return 'Ready to Start';
      case 'ping':
        return 'Analyzing latency...';
      case 'download':
        return 'Testing download speed...';
      case 'upload':
        return 'Testing upload speed...';
      case 'complete':
        return 'Test complete';
      case 'error':
        return 'Test failed';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Speedometer SVG */}
        <svg 
          width={size} 
          height={size} 
          className="transform -rotate-90 select-none overflow-visible"
        >
          {/* Defs for gradients */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EAD5C3" />
              <stop offset="100%" stopColor="#D4A27F" />
            </linearGradient>
            <linearGradient id="activeGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A27F" />
              <stop offset="100%" stopColor="#A87250" />
            </linearGradient>
            {/* Glow Filter */}
            <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%">
              <stop offset="0%" stopColor="#D4A27F" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#D4A27F" stopOpacity="0" />
            </filter>
          </defs>

          {/* Background track circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className="text-border-custom"
            strokeWidth={strokeWidth - 2}
            strokeDasharray={`${arcLength} ${circumference}`}
            style={{
              transform: `rotate(${angleStart}deg)`,
              transformOrigin: '50% 50%',
            }}
          />

          {/* Foreground speed fill circle */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            initial={{ strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset }}
            transition={{ type: 'spring', damping: 25, stiffness: 80 }}
            style={{
              transform: `rotate(${angleStart}deg)`,
              transformOrigin: '50% 50%',
            }}
          />

          {/* Render Tick Marks & Labels */}
          {ticks.map((tick) => (
            <g key={tick.index}>
              {/* Tick Line */}
              <line
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke="currentColor"
                strokeWidth={tick.index % 2 === 0 ? 1.5 : 1}
                className="text-border-custom"
              />
              {/* Tick Label (only for major ticks to prevent clutter) */}
              {tick.index % 2 === 0 && (
                <text
                  x={tick.tx}
                  y={tick.ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-sans text-[10px] font-medium fill-text-secondary select-none"
                  style={{
                    transform: `rotate(90deg) translate(${tick.ty - tick.ty}px, ${tick.tx - tick.tx}px)`,
                    transformOrigin: `${tick.tx}px ${tick.ty}px`,
                  }}
                >
                  {tick.value}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Center Readout (HTML Absolute overlay) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {/* Real-time status / progress bar */}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
            {stage === 'download' ? 'Download' : stage === 'upload' ? 'Upload' : stage === 'ping' ? 'Ping' : 'Speed'}
          </span>
          
          <div className="mt-1 flex items-baseline justify-center">
            {/* Speed Value with Spring Animation */}
            <span className="font-sans text-5xl font-bold tracking-tight text-text-primary">
              {stage === 'ping' ? '—' : speed.toFixed(1)}
            </span>
          </div>

          <span className="text-xs font-medium text-text-secondary mt-0.5">
            {stage === 'ping' ? 'ms' : 'Mbps'}
          </span>

          {/* Mini progress line indicator inside the readout */}
          {stage !== 'idle' && stage !== 'complete' && stage !== 'error' && (
            <div className="mt-4 w-20 h-1 bg-border-custom rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Subtext under the Speedometer */}
      <div className="mt-4 text-center">
        <p className="text-sm font-medium text-text-secondary">
          {getStatusMessage()}
        </p>
      </div>
    </div>
  );
};
