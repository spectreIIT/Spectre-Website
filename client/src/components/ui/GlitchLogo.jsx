import React, { useState, useEffect, useRef } from 'react';
import './GlitchLogo.css';

const GlitchLogo = ({ src, alt, className = '', containerStyle = {} }) => {
  const [isGlitching, setIsGlitching] = useState(false);
  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isAudioDriven = useRef(false);

  const startAudioSync = async () => {
    if (isAudioDriven.current) return;
    isAudioDriven.current = true;
    
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        isAudioDriven.current = false;
        return;
      }
      
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
        if (ctx.state === 'suspended') {
            console.warn("AudioContext suspended. Waiting for valid user click gesture.");
            isAudioDriven.current = false;
            return;
        }
      }
      
      const response = await fetch('/Sounds/soundreality-glitch-effect-3-530928_0tbSEAdt.mp3');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error("Received HTML instead of audio file. Path might be incorrect.");
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      
      if (!isMounted.current) return; // Prevent ghost audio if user clicked a link to navigate away
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = false; // Only play once as requested
      source.playbackRate.value = 1.5; // Play at 1.5x speed as requested
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      audioRef.current = source;
      
      source.onended = () => {
        isAudioDriven.current = false;
        setIsGlitching(false);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      source.start(0);
      console.log("Audio Buffer playing successfully!");
      
      analyzeAudio();
    } catch (e) {
      if (isMounted.current) {
        isAudioDriven.current = false;
      }
      console.error("Audio init error", e);
    }
  };

  const lastGlitchTime = useRef(0);
  const smoothedVol = useRef(0);

  const analyzeAudio = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    let sum = 0;
    let maxVol = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
      if (dataArrayRef.current[i] > maxVol) {
        maxVol = dataArrayRef.current[i];
      }
    }
    const avgVol = sum / dataArrayRef.current.length;
    
    smoothedVol.current = smoothedVol.current * 0.92 + avgVol * 0.08;
    
    const now = performance.now();
    
    if (maxVol > 40 && maxVol > smoothedVol.current * 1.6 && (now - lastGlitchTime.current > 350)) { 
      setIsGlitching(true);
      lastGlitchTime.current = now;
      
      setTimeout(() => {
        setIsGlitching(false);
      }, 250);
    }
    
    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  };

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let isActive = true;

    const handleInteraction = () => {
      startAudioSync();
    };
    window.addEventListener('click', handleInteraction);

    return () => {
      isActive = false;
      isMounted.current = false;
      window.removeEventListener('click', handleInteraction);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioRef.current) {
        try {
          audioRef.current.stop();
          audioRef.current.disconnect();
        } catch(e) {}
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (!isAudioDriven.current) {
      setIsGlitching(true);
      setTimeout(() => {
        if (!isAudioDriven.current) setIsGlitching(false);
      }, 250);
    }
  };

  return (
    <div 
      className={`glitch-logo-container ${isGlitching ? 'is-glitching' : ''} ${className}`}
      style={containerStyle}
      onMouseEnter={handleMouseEnter}
    >
      <img src={src} alt={alt} className="glitch-layer base" />
      <img src={src} alt={alt} className="glitch-layer cyan" />
      <img src={src} alt={alt} className="glitch-layer red" />
      <div 
        className="glitch-noise" 
        style={{ 
          WebkitMaskImage: `url(${src})`, 
          maskImage: `url(${src})`, 
          WebkitMaskSize: 'contain', 
          maskSize: 'contain', 
          WebkitMaskRepeat: 'no-repeat', 
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center'
        }}
      ></div>
      <div 
        className="glitch-scanlines" 
        style={{ 
          WebkitMaskImage: `url(${src})`, 
          maskImage: `url(${src})`, 
          WebkitMaskSize: 'contain', 
          maskSize: 'contain', 
          WebkitMaskRepeat: 'no-repeat', 
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center'
        }}
      ></div>
    </div>
  );
};

export default GlitchLogo;
