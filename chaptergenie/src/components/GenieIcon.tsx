import { SVGProps } from 'react';

export function GenieIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
      {...props}
    >
      <path
        d="M12 6c0-1.1.9-2 2-2h3a2 2 0 012 2v2a2 2 0 01-2 2h-3a2 2 0 01-2-2V6z"
        fill="currentColor"
      />
      <path
        d="M7 14c0-2.21 1.79-4 4-4h2c2.21 0 4 1.79 4 4v4c0 2.21-1.79 4-4 4h-2c-2.21 0-4-1.79-4-4v-4z"
        fill="currentColor"
      />
      <path
        d="M14 4c0-1.1-.9-2-2-2s-2 .9-2 2M7 14h10M7 18h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
} 