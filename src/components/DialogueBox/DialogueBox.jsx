// src/components/DialogueBox/DialogueBox.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useAudioVolume } from '../../audio/useAudioVolume.js';
import './DialogueBox.css';

export default function DialogueBox({ lines, onLineChange, onComplete, typingSpeed = 25, soundSrc }) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const sfxVolume = useAudioVolume('sfx');

  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      if (onComplete) onComplete();
      return;
    }

    if (onLineChange) onLineChange(currentLineIndex);

    const line = lines[currentLineIndex] || ""; 
    let charIdx = 0;
    setIsTyping(true);
    setDisplayedText('');

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (charIdx < line.length) {
        const nextChar = line[charIdx];
        if (nextChar !== undefined) {
          setDisplayedText((prev) => prev + nextChar);
        }
        charIdx++;
        
        if (audioRef.current && soundSrc) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      } else {
        clearInterval(timerRef.current);
        setIsTyping(false);
      }
    }, typingSpeed);

    return () => clearInterval(timerRef.current);
  }, [currentLineIndex, lines, onLineChange, onComplete, typingSpeed, soundSrc]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = sfxVolume;
  }, [sfxVolume]);

  const handleNext = () => {
    if (isTyping) {
      clearInterval(timerRef.current);
      setDisplayedText(lines[currentLineIndex]);
      setIsTyping(false);
    } else {
      setCurrentLineIndex((prev) => prev + 1);
    }
  };

  useEffect(() => {
    const onKey = (e) => { 
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault(); 
        handleNext(); 
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isTyping, currentLineIndex]);

  return (
    <div className="dialogue-overlay" onClick={handleNext}>
      {soundSrc && <audio ref={audioRef} src={soundSrc} preload="auto" />}
      <div className="dialogue-box">
        <p className="dialogue-text">
          {displayedText}
          <span className={`cursor ${isTyping ? 'typing' : 'blink'}`}>_</span>
        </p>
        {!isTyping && <div className="next-indicator">Next ▼</div>}
      </div>
    </div>
  );
}
