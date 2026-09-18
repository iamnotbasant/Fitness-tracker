import React from "react"

interface EvilIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
  size?: number | string
}

export function EvilTrophy({ className = "w-5 h-5", size, ...props }: EvilIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M28.6 29.4c3-2.3 7.4-5.7 7.4-18.4v-1H14v1c0 12.7 4.5 16.1 7.4 18.4 1.7 1.3 2.6 2 2.6 3.6v3c-1.6.2-3.2.8-3.8 2H18c-1.1 0-2 .9-2 2h18c0-1.1-.9-2-2-2h-2.2c-.6-1.2-2.1-1.8-3.8-2v-3c0-1.6.8-2.3 2.6-3.6zm-3.6.5c-.6-.8-1.5-1.5-2.3-2.1-2.7-2.1-6.4-4.9-6.6-15.8h18c-.2 10.8-3.9 13.7-6.6 15.8-1 .7-1.9 1.3-2.5 2.1z" />
      <path d="M18.8 27C18.7 27 8 24.7 8 13v-1h7v2h-5c.6 9.2 9.1 11 9.2 11l-.4 2z" />
      <path d="M31.2 27l-.4-2c.4-.1 8.6-1.9 9.2-11h-5v-2h7v1c0 11.7-10.7 14-10.8 14z" />
    </svg>
  )
}

export function EvilStar({ className = "w-5 h-5", size, ...props }: EvilIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M15.2 40.6c-.2 0-.4-.1-.6-.2-.4-.3-.5-.7-.4-1.1l3.9-12-10.2-7.5c-.4-.3-.5-.7-.4-1.1s.5-.7 1-.7h12.7L25 5.9c.1-.4.5-.7 1-.7s.8.3 1 .7L30.9 18h12.7c.4 0 .8.2 1 .6s0 .9-.4 1.1L34 27.1l3.9 12c.1.4 0 .9-.4 1.1s-.8.3-1.2 0L26 33l-10.2 7.4c-.2.1-.4.2-.6.2zM26 30.7c.2 0 .4.1.6.2l8.3 6.1-3.2-9.8c-.1-.4 0-.9.4-1.1l8.3-6.1H30.1c-.4 0-.8-.3-1-.7L26 9.5l-3.2 9.8c-.1.4-.5.7-1 .7H11.5l8.3 6.1c.4.3.5.7.4 1.1L17.1 37l8.3-6.1c.2-.1.4-.2.6-.2z" />
    </svg>
  )
}

export function EvilChart({ className = "w-5 h-5", size, ...props }: EvilIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M18 36h-2V26h-4v10h-2V24h8z" />
      <path d="M28 36h-2V20h-4v16h-2V18h8z" />
      <path d="M38 36h-2V14h-4v22h-2V12h8z" />
      <path d="M8 36h32v2H8z" />
    </svg>
  )
}

export function EvilCheck({ className = "w-5 h-5", size, ...props }: EvilIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M25 42c-9.4 0-17-7.6-17-17S15.6 8 25 8s17 7.6 17 17-7.6 17-17 17zm0-32c-8.3 0-15 6.7-15 15s6.7 15 15 15 15-6.7 15-15-6.7-15-15-15z" />
      <path d="M23 32.4l-8.7-8.7 1.4-1.4 7.3 7.3 11.3-11.3 1.4 1.4z" />
    </svg>
  )
}

export function EvilCalendar({ className = "w-5 h-5", size, ...props }: EvilIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M37 38H13c-1.7 0-3-1.3-3-3V13c0-1.7 1.1-3 2.5-3H14v2h-1.5c-.2 0-.5.4-.5 1v22c0 .6.4 1 1 1h24c.6 0 1-.4 1-1V13c0-.6-.3-1-.5-1H36v-2h1.5c1.4 0 2.5 1.3 2.5 3v22c0 1.7-1.3 3-3 3z" />
      <path d="M17 14c-.6 0-1-.4-1-1V9c0-.6.4-1 1-1s1 .4 1 1v4c0 .6-.4 1-1 1z" />
      <path d="M33 14c-.6 0-1-.4-1-1V9c0-.6.4-1 1-1s1 .4 1 1v4c0 .6-.4 1-1 1z" />
      <path d="M20 10h10v2H20z" />
      <path d="M12 16h26v2H12z" />
      <path d="M34 20h2v2h-2z" />
      <path d="M30 20h2v2h-2z" />
      <path d="M26 20h2v2h-2z" />
      <path d="M22 20h2v2h-2z" />
      <path d="M18 20h2v2h-2z" />
      <path d="M34 24h2v2h-2z" />
      <path d="M30 24h2v2h-2z" />
      <path d="M26 24h2v2h-2z" />
      <path d="M22 24h2v2h-2z" />
      <path d="M18 24h2v2h-2z" />
      <path d="M14 24h2v2h-2z" />
      <path d="M34 28h2v2h-2z" />
      <path d="M30 28h2v2h-2z" />
      <path d="M26 28h2v2h-2z" />
      <path d="M22 28h2v2h-2z" />
      <path d="M18 28h2v2h-2z" />
      <path d="M14 28h2v2h-2z" />
      <path d="M30 32h2v2h-2z" />
      <path d="M26 32h2v2h-2z" />
      <path d="M22 32h2v2h-2z" />
      <path d="M18 32h2v2h-2z" />
      <path d="M14 32h2v2h-2z" />
    </svg>
  )
}

export function EvilClock({ className = "w-5 h-5", size, ...props }: EvilIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M25 42c-9.4 0-17-7.6-17-17S15.6 8 25 8s17 7.6 17 17-7.6 17-17 17zm0-32c-8.3 0-15 6.7-15 15s6.7 15 15 15 15-6.7 15-15-6.7-15-15-15z" />
      <path d="M30.3 33.7L24 27.4V16h2v10.6l5.7 5.7z" />
    </svg>
  )
}

export function EvilArrowUp({ className = "w-5 h-5", size, ...props }: EvilIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M25 42c-9.4 0-17-7.6-17-17S15.6 8 25 8s17 7.6 17 17-7.6 17-17 17zm0-32c-8.3 0-15 6.7-15 15s6.7 15 15 15 15-6.7 15-15-6.7-15-15-15z" />
      <path d="M33.3 26.7L25 18.4l-8.3 8.3-1.4-1.4 9.7-9.7 9.7 9.7z" />
      <path d="M24 17h2v17h-2z" />
    </svg>
  )
}

export function EvilPlus({ className = "w-5 h-5", size, ...props }: EvilIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M25 42c-9.4 0-17-7.6-17-17S15.6 8 25 8s17 7.6 17 17-7.6 17-17 17zm0-32c-8.3 0-15 6.7-15 15s6.7 15 15 15 15-6.7 15-15-6.7-15-15-15z" />
      <path d="M16 24h18v2H16z" />
      <path d="M24 16h2v18h-2z" />
    </svg>
  )
}

export function EvilTrash({ className = "w-5 h-5", size, ...props }: EvilIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M20 18h2v16h-2z" />
      <path d="M24 18h2v16h-2z" />
      <path d="M28 18h2v16h-2z" />
      <path d="M12 12h26v2H12z" />
      <path d="M30 12h-2v-1c0-.6-.4-1-1-1h-4c-.6 0-1 .4-1 1v1h-2v-1c0-1.7 1.3-3 3-3h4c1.7 0 3 1.3 3 3v1z" />
      <path d="M31 40H19c-1.6 0-3-1.3-3.2-2.9l-1.8-24 2-.2 1.8 24c0 .6.6 1.1 1.2 1.1h12c.6 0 1.1-.5 1.2-1.1l1.8-24 2 .2-1.8 24C34 38.7 32.6 40 31 40z" />
    </svg>
  )
}

export function EvilTag({ className = "w-5 h-5", size, ...props }: EvilIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M22 40.1c-.9 0-1.7-.3-2.3-.9l-8.9-8.9c-1.2-1.2-1.2-3.3 0-4.5l11.9-11.9c1-1 3-1.8 4.5-1.8h7.6c1.8 0 3.2 1.4 3.2 3.2v7.6c0 1.5-.8 3.4-1.8 4.5L24.3 39.2c-.6.6-1.4.9-2.3.9zM27.2 14c-1 0-2.4.6-3 1.3L12.3 27.2c-.5.5-.5 1.2 0 1.7l8.9 8.9c.5.4 1.2.4 1.7 0l11.9-11.9c.7-.7 1.3-2.1 1.3-3v-7.6c0-.7-.5-1.2-1.2-1.2h-7.7z" />
      <path d="M30 24c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  )
}

export function EvilEye({ className = "w-5 h-5", size, ...props }: EvilIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M25 36C13.5 36 8.3 25.9 8.1 25.4c-.1-.3-.1-.6 0-.9C8.3 24.1 13.5 14 25 14s16.7 10.1 16.9 10.6c.1.3.1.6 0 .9-.2.4-5.4 10.5-16.9 10.5zM10.1 25c1.1 1.9 5.9 9 14.9 9s13.7-7.1 14.9-9c-1.1-1.9-5.9-9-14.9-9s-13.7 7.1-14.9 9z" />
      <path d="M25 34c-5 0-9-4-9-9s4-9 9-9 9 4 9 9-4 9-9 9zm0-16c-3.9 0-7 3.1-7 7s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7z" />
      <path d="M25 30c-2.8 0-5-2.2-5-5 0-.6.4-1 1-1s1 .4 1 1c0 1.7 1.3 3 3 3s3-1.3 3-3-1.3-3-3-3c-.6 0-1-.4-1-1s.4-1 1-1c2.8 0 5 2.2 5 5s-2.2 5-5 5z" />
    </svg>
  )
}
