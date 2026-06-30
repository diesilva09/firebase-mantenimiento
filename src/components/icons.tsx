import Image from 'next/image';

export function Logo(props: { width?: number; height?: number; className?: string }) {
  const width = props.width || 200;
  const height = props.height || 200;
  const className = ['object-contain', props.className].filter(Boolean).join(' ');

  return (
    <Image
      src="/logo.png"
      alt="Logo de la empresa"
      width={width}
      height={height}
      className={className}
      data-ai-hint="company logo"
      priority
      quality={100}
    />
  );
}
