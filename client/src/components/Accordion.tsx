import { useState, useRef, useEffect } from 'react';

interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function Accordion({ title, defaultOpen = false, children }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);

  useEffect(() => {
    if (isOpen) {
      const contentEl = contentRef.current;
      if (contentEl) {
        setHeight(contentEl.scrollHeight);
        const timer = setTimeout(() => setHeight(undefined), 300);
        return () => clearTimeout(timer);
      }
    } else {
      const contentEl = contentRef.current;
      if (contentEl) {
        setHeight(contentEl.scrollHeight);
        void contentEl.offsetHeight;
        setHeight(0);
      }
    }
  }, [isOpen]);

  return (
    <div className="group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pt-8 pb-4 flex justify-between items-center cursor-pointer transition-colors focus:outline-none"
      >
        <h3 className="font-[family-name:var(--font-display)] text-2xl text-charcoal">
          {title}
        </h3>
        <span className="text-bronze text-2xl font-light leading-none">
          {isOpen ? '×' : '+'}
        </span>
      </button>
      <div
        style={{ height }}
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
      >
        <div ref={contentRef} className="pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
