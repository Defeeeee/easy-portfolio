'use client';

import { useEffect, useState } from 'react';

interface Props {
  words: string[];
  className?: string;
  style?: React.CSSProperties;
  speed?: number;
  pauseDuration?: number;
  renderText?: (text: string) => React.ReactNode;
}

export function Typewriter({
  words,
  className,
  style,
  speed = 80,
  pauseDuration = 2000,
  renderText,
}: Props) {
  const [displayed, setDisplayed] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  // Reset when words change
  const wordsKey = JSON.stringify(words);
  useEffect(() => {
    setDisplayed('');
    setWordIndex(0);
    setCharIndex(0);
    setDeleting(false);
  }, [wordsKey]);

  useEffect(() => {
    const current = words[wordIndex];
    if (!current) return;

    if (!deleting && charIndex === current.length) {
      if (words.length > 1) {
        const pause = setTimeout(() => setDeleting(true), pauseDuration);
        return () => clearTimeout(pause);
      }
      return; // Stop if there's only 1 word
    }

    if (deleting && charIndex === 0) {
      setDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(
      () => {
        setCharIndex((prev) => prev + (deleting ? -1 : 1));
        setDisplayed(current.slice(0, charIndex + (deleting ? -1 : 1)));
      },
      deleting ? speed / 2 : speed
    );

    return () => clearTimeout(timeout);
  }, [charIndex, deleting, wordIndex, words, speed, pauseDuration]);

  return (
    <span className={className} style={style}>
      {renderText ? renderText(displayed) : displayed}
    </span>
  );
}
