import Image from 'next/image';

export function Logo(props: { width?: number; height?: number, className?: string }) {
  return (
    <Image 
      src="/logo.jpg"
      alt="Logo de la empresa" 
      width={props.width || 200} 
      height={props.height || 100} 
      className={props.className}
      data-ai-hint="company logo"
      priority
    />
  );
}
