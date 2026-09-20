type IconProps = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function GlobeIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.8 2.5 4.2 5.6 4.2 9s-1.4 6.5-4.2 9c-2.8-2.5-4.2-5.6-4.2-9s1.4-6.5 4.2-9Z" />
    </svg>
  );
}

export function DropIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3c3.6 4.2 6.5 8 6.5 11.2A6.5 6.5 0 0 1 5.5 14.2C5.5 11 8.4 7.2 12 3Z" />
    </svg>
  );
}

export function CloudRainIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7 15.5a4.5 4.5 0 0 1 .5-8.97A6 6 0 0 1 19 9.5a4 4 0 0 1-1 7.9H7Z" />
      <path d="M8 19.5 7 21.5M12.5 19.5l-1 2M17 19.5l-1 2" />
    </svg>
  );
}

export function TrashIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function WavesIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2 8c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
      <path d="M2 14c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
      <path d="M2 20c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
    </svg>
  );
}

export function CompassIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-2 5-3 1.5 2-5 3-1.5Z" />
    </svg>
  );
}

export function WarningIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3.5 21 19H3L12 3.5Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.1" />
    </svg>
  );
}

export function MapPinIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export function FoldedMapIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

export function ChartIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 19V9M11 19V4M18 19v-7" />
      <path d="M3 19h18" />
    </svg>
  );
}

export function SettingsIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

export function HomeIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function ShieldIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3.5 19 6.5v5c0 5-3 8-7 9-4-1-7-4-7-9v-5L12 3.5Z" />
      <path d="m9.5 12 1.8 1.8L14.5 10" />
    </svg>
  );
}

export function SparkleIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="currentColor" stroke="none">
      <path d="M12 2.5c.5 3.2 1 5 2.2 6.3S17.3 10.5 20.5 11c-3.2.5-5 1-6.3 2.2S12.5 16.3 12 19.5c-.5-3.2-1-5-2.2-6.3S6.7 11.5 3.5 11c3.2-.5 5-1 6.3-2.2S11.5 5.7 12 2.5Z" />
      <path d="M19 3.2c.2 1 .4 1.6.9 2.1s1.1.7 2.1.9c-1 .2-1.6.4-2.1.9s-.7 1.1-.9 2.1c-.2-1-.4-1.6-.9-2.1s-1.1-.7-2.1-.9c1-.2 1.6-.4 2.1-.9s.7-1.1.9-2.1Z" />
    </svg>
  );
}

export function ElevationIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 19 9 8l4 6.5L15.5 11 21 19H3Z" />
    </svg>
  );
}

export function CameraOffIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 3l18 18" />
      <path d="M9 5h3l1.5 2H19a2 2 0 0 1 2 2v9.5" />
      <path d="M5 7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}
