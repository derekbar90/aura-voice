import { useEffect, useRef, useState } from 'react'

export function useAudioVisualizer(audioElement: HTMLAudioElement | null) {
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(40).fill(0))
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    if (!audioElement) return

    // Initialize Audio Context (must happen after user interaction usually, but here we trigger on generate)
    const initAudio = () => {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        audioContextRef.current = new AudioContextClass()
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume()
      }

      if (!sourceRef.current) {
        try {
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement)
          analyserRef.current = audioContextRef.current.createAnalyser()
          analyserRef.current.fftSize = 256
          sourceRef.current.connect(analyserRef.current)
          analyserRef.current.connect(audioContextRef.current.destination)
        } catch (e) {
          // Already connected or invalid state
          console.warn('Audio visualization connection error:', e)
        }
      }
    }

    const updateWaveform = () => {
      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteFrequencyData(dataArray)
        
        // Downsample to 40 bars
        const step = Math.floor(bufferLength / 40)
        const simplifiedData = new Uint8Array(40)
        for (let i = 0; i < 40; i++) {
           simplifiedData[i] = dataArray[i * step]
        }
        setAudioData(simplifiedData)
      }
      animationFrameRef.current = requestAnimationFrame(updateWaveform)
    }

    const handlePlay = () => {
      initAudio()
      updateWaveform()
    }

    const handlePause = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    audioElement.addEventListener('play', handlePlay)
    audioElement.addEventListener('pause', handlePause)
    audioElement.addEventListener('ended', handlePause)

    return () => {
      audioElement.removeEventListener('play', handlePlay)
      audioElement.removeEventListener('pause', handlePause)
      audioElement.removeEventListener('ended', handlePause)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [audioElement])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [])

  return audioData
}
