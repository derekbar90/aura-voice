/* c8 ignore file */
import { useState, useRef, useMemo, useEffect } from 'react'
import { VoiceCloneModal } from './components/VoiceCloneModal'
import { OnboardingDownloadOverlay } from './components/OnboardingDownloadOverlay'
import { DownloadStatusLine } from './components/DownloadStatusLine'
import { useAudioVisualizer } from './hooks/useAudioVisualizer'

type VoiceOption = {
  id: string
  label: string
  value: string 
  path?: string
  transcript?: string
}

const PRESET_VOICES: VoiceOption[] = [
  { id: 'default', label: 'Nicole', value: '' },
  { id: 'chelsie', label: 'Chelsie', value: 'Chelsie' },
  { id: 'ethan', label: 'Ethan', value: 'Ethan' },
  { id: 'vivian', label: 'Vivian', value: 'Vivian' },
]

const SPEEDS = [0.8, 0.9, 1.0, 1.1, 1.2, 1.5, 2.0]

function App() {
  const [text, setText] = useState('Hello, this is a test. This application is designed to read content to you in a clear, natural voice. Enjoy the experience.')
  const [voices, setVoices] = useState<VoiceOption[]>(PRESET_VOICES)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('default')
  
  const [speed, setSpeed] = useState(1.0)
  const [textSize, setTextSize] = useState(24) // Base text size in px
  const [audioUrl, setAudioUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [ttsStatus, setTtsStatus] = useState('')
  const [downloadRequested, setDownloadRequested] = useState(false)
  const [modelDownloadState, setModelDownloadState] = useState<{
    status: 'idle' | 'downloading' | 'paused' | 'completed' | 'failed' | 'canceled'
    progressPercent: number
    downloadedBytes: number
    totalBytes: number
    etaSeconds?: number
    currentFile?: string
    error?: string
  } | null>(null)
  const hasRequestedDownload = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showCloneModal, setShowCloneModal] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  
  // Use the new hook for visualization
  const audioData = useAudioVisualizer(audioRef.current)
  
  const readingTime = useMemo(() => {
    const words = text.trim().split(/\s+/).length
    const wpm = 200 * speed
    const minutes = Math.ceil(words / wpm)
    return minutes
  }, [text, speed])

  const selectedVoice = useMemo(() => 
    voices.find(v => v.id === selectedVoiceId) || PRESET_VOICES[0], 
  [voices, selectedVoiceId])

  const bridgeReady = Boolean(window.appBridge?.ready && window.tts?.generate)

  useEffect(() => {
    if (!bridgeReady) return
    if (typeof window.tts?.listVoices !== 'function') return

    window.tts.listVoices().then(customVoices => {
      const formatted = customVoices.map(v => ({
        id: v.id,
        label: v.name,
        value: '',
        path: v.path,
        transcript: v.transcript
      }))
      setVoices([...PRESET_VOICES, ...formatted])
    })
  }, [bridgeReady])

  useEffect(() => {
    if (!bridgeReady) return
    if (typeof window.tts?.onStatus !== 'function') return
    const unsubscribe = window.tts.onStatus((status: string) => {
      setTtsStatus(status)
    })
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [bridgeReady])

  useEffect(() => {
    if (!bridgeReady) return
    if (typeof window.tts?.onModelDownloadStatus !== 'function') return
    const unsubscribe = window.tts.onModelDownloadStatus((state) => {
      setModelDownloadState(state)
    })

    if (!hasRequestedDownload.current && typeof window.tts?.startModelDownload === 'function') {
      hasRequestedDownload.current = true
      setDownloadRequested(true)
      Promise.resolve(window.tts.startModelDownload()).catch((err) =>
        console.error('Model download failed', err)
      )
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [bridgeReady])

  // Auto-play when audioUrl changes
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      // Reset state for new track
      setIsPlaying(true)
      audioRef.current.play().catch(e => {
        console.warn('Auto-play failed:', e)
        setIsPlaying(false)
      })
    }
  }, [audioUrl])

  const handleGenerate = async () => {
    if (!bridgeReady) return
    setIsGenerating(true)
    setTtsStatus('Starting...')
    try {
      const result = await window.tts.generate({
        text,
        voice: selectedVoice.value || undefined,
        refAudioPath: selectedVoice.path,
        refText: selectedVoice.transcript,
        speed,
        pitch: 1.0, 
      })
      
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      
      const binary = Uint8Array.from(atob(result.audioData), c => c.charCodeAt(0))
      const blob = new Blob([binary], { type: result.mimeType })
      const newUrl = URL.createObjectURL(blob)
      setAudioUrl(newUrl)
    } catch (err) {
      console.error(err)
    } finally {
      setIsGenerating(false)
      setTimeout(() => setTtsStatus(''), 1500)
    }
  }

  const handleSaveVoice = async (name: string, buffer: ArrayBuffer, transcript: string) => {
    if (typeof window.tts?.saveRecording !== 'function') {
      alert('Please restart the application to enable voice saving.')
      return
    }

    const saved = await window.tts.saveRecording(name, buffer, transcript)
    
    const newOption: VoiceOption = {
      id: saved.id,
      label: saved.name,
      value: '',
      path: saved.path,
      transcript: saved.transcript
    }
    setVoices(prev => [...prev, newOption])
    setSelectedVoiceId(saved.id)
  }
  
  const deleteCustomVoice = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Delete this voice?')) {
      await window.tts.deleteVoice(id)
      setVoices(prev => prev.filter(v => v.id !== id))
      if (selectedVoiceId === id) setSelectedVoiceId('default')
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const skipTime = (seconds: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), duration)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60)
    const s = Math.floor(time % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handlePauseDownload = () => {
    if (!window.tts) return
    if (modelDownloadState?.status === 'paused') {
      window.tts.resumeModelDownload?.()
      return
    }
    window.tts.pauseModelDownload?.()
  }

  const handleCancelDownload = () => {
    if (!window.tts) return
    window.tts.cancelModelDownload?.()
  }

  const handleRetryDownload = () => {
    if (!window.tts) return
    window.tts.retryModelDownload?.()
  }

  const resolvedDownloadState = modelDownloadState ?? {
    status: downloadRequested ? 'downloading' : 'idle',
    progressPercent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    currentFile: undefined,
  }

  const showDownloadOverlay = downloadRequested && resolvedDownloadState.status !== 'completed'

  /* c8 ignore start */
  return (
    <div className="flex flex-col h-screen w-full bg-[#1C1C1E] text-white font-sans overflow-hidden select-none relative">
      
      {/* Draggable Handle */}
      <div className="absolute top-0 left-0 right-0 h-8 z-50 draggable pointer-events-none" />

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col items-center justify-start overflow-hidden">
        {showDownloadOverlay && (
          <OnboardingDownloadOverlay
            status={resolvedDownloadState.status}
            progressPercent={resolvedDownloadState.progressPercent}
            downloadedBytes={resolvedDownloadState.downloadedBytes}
            totalBytes={resolvedDownloadState.totalBytes}
            etaSeconds={resolvedDownloadState.etaSeconds}
            currentFile={resolvedDownloadState.currentFile}
            onPause={handlePauseDownload}
            onCancel={handleCancelDownload}
            onRetry={handleRetryDownload}
            errorMessage={resolvedDownloadState.error}
          />
        )}
        
        {/* Floating Toolbar */}
        <div className="absolute top-8 z-40 bg-[#2C2C2E]/80 backdrop-blur-md border border-white/10 rounded-full px-2 py-1.5 flex items-center gap-1 shadow-2xl animate-fade-in-down whitespace-nowrap max-w-[95%] pointer-events-auto">
          
          {/* Voice Selector */}
          <div className="relative group shrink-0">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors text-xs font-medium text-gray-200">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              <span className="opacity-60 text-[10px] uppercase tracking-wider">Voice</span>
              <span>({selectedVoice.label})</span>
            </button>
            <div className="absolute top-full left-0 pt-3 w-40 hidden group-hover:block z-50">
              <div className="bg-[#2C2C2E] border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                <div className="p-1">
                   <div className="text-[10px] text-gray-500 font-bold px-3 py-1 uppercase tracking-wider">Presets</div>
                   {voices.filter(v => !v.path).map(v => (
                     <button 
                       key={v.id} 
                       className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-white/10 truncate ${selectedVoiceId === v.id ? 'bg-white/5 text-white' : 'text-gray-400'}`}
                       onClick={() => setSelectedVoiceId(v.id)}
                     >
                       {v.label}
                     </button>
                   ))}

                   <div className="text-[10px] text-gray-500 font-bold px-3 py-1 mt-1 uppercase tracking-wider flex justify-between items-center">
                     <span>Custom</span>
                   </div>
                   {voices.filter(v => v.path).map(v => (
                     <div key={v.id} className="flex items-center gap-1 group/item relative">
                       <button 
                         className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-white/10 truncate pr-8 ${selectedVoiceId === v.id ? 'bg-white/5 text-white' : 'text-gray-400'}`}
                         onClick={() => setSelectedVoiceId(v.id)}
                       >
                         {v.label}
                         {v.transcript && <span className="ml-2 text-[8px] text-green-500 opacity-60">✓ Verified</span>}
                       </button>
                       <button 
                          className="absolute right-1 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                          onClick={(e) => deleteCustomVoice(e, v.id)}
                       >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                     </div>
                   ))}

                   <div className="border-t border-white/10 mt-1 pt-1">
                     <button 
                       className="w-full text-left px-3 py-2 text-xs text-[#0e639c] hover:text-[#3794ff] hover:bg-white/5 rounded flex items-center gap-2"
                       onClick={() => setShowCloneModal(true)}
                     >
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                       Clone Voice
                     </button>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-px h-4 bg-white/10 shrink-0"></div>

          {/* Speed Selector */}
          <div className="relative group shrink-0">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors text-xs font-medium text-gray-200">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span className="opacity-60 text-[10px] uppercase tracking-wider">Speed</span>
              <span>({speed}x)</span>
            </button>
            <div className="absolute top-full left-0 pt-3 w-24 hidden group-hover:block z-50">
              <div className="bg-[#2C2C2E] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                {SPEEDS.map(s => (
                  <button 
                    key={s} 
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-white/10 ${speed === s ? 'bg-white/5 text-white' : 'text-gray-400'}`}
                    onClick={() => setSpeed(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-px h-4 bg-white/10 shrink-0"></div>

          {/* Text Size */}
          <div className="relative group shrink-0">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
              <span className="text-[10px] font-serif">A</span>
              <span className="text-[14px] font-serif">A</span>
              <div className="flex flex-col ml-2 leading-none">
                <span className="text-[9px] text-gray-400 uppercase">Text</span>
                <span className="text-[9px] text-gray-400 uppercase">Size</span>
              </div>
            </div>
            
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 hidden group-hover:block z-50">
               <div className="bg-[#2C2C2E] border border-white/10 rounded-lg shadow-xl overflow-hidden p-1 flex items-center gap-1">
                  <button 
                    className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                    onClick={() => setTextSize(s => Math.max(12, s - 2))}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                  </button>
                  <span className="text-xs font-mono w-6 text-center text-gray-300">{textSize}</span>
                  <button 
                    className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
                    onClick={() => setTextSize(s => Math.min(64, s + 2))}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  </button>
               </div>
            </div>
          </div>

          <div className="w-px h-4 bg-white/10 shrink-0"></div>

          {/* Reading Time */}
          <div className="px-4 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-widest shrink-0">
            {readingTime} min left
          </div>

        </div>

        {/* Text Area */}
        <div className="w-full h-full max-w-4xl mx-auto pt-28 pb-32 px-12 overflow-y-auto custom-scrollbar">
          <textarea
            className="w-full h-full bg-transparent resize-none focus:outline-none placeholder-white/20 text-gray-200"
            style={{ 
              fontSize: `${textSize}px`,
              fontFamily: '"Merriweather", serif',
              lineHeight: '1.6'
            }}
            placeholder="Type or paste your content here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
        </div>

      </main>

      {/* Footer Player */}
      <footer className="h-[88px] flex-none bg-[#2C2C2E]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-6 z-20 relative">
        
        {/* Hidden Audio Element */}
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          onTimeUpdate={handleTimeUpdate} 
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          crossOrigin="anonymous"
        />

        {/* Playback Controls */}
        <div className="flex items-center gap-4 shrink-0">
            
            {/* Play/Pause Button */}
            <button 
                onClick={audioUrl ? togglePlay : handleGenerate}
                disabled={isGenerating || (!audioUrl && !text)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isGenerating ? 'bg-gray-600 cursor-wait' : 'bg-[#4c4c4e] hover:bg-[#5c5c5e] text-white shadow-lg active:scale-95'
                }`}
            >
                {isGenerating ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : isPlaying ? (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                ) : (
                    <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
            </button>

            {/* Skip Buttons */}
            <div className="flex items-center gap-3 text-gray-400">
                <button onClick={() => skipTime(-15)} className="hover:text-white transition-colors group flex flex-col items-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"></path></svg>
                    <span className="text-[9px] font-medium -mt-1 group-hover:text-white">15s</span>
                </button>
                <button onClick={() => skipTime(30)} className="hover:text-white transition-colors group flex flex-col items-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"></path></svg>
                    <span className="text-[9px] font-medium -mt-1 group-hover:text-white">30s</span>
                </button>
            </div>
        </div>

        {/* Waveform Visualization */}
        <div className="flex-1 mx-4 sm:mx-8 h-8 flex items-center justify-center gap-[2px] opacity-60">
            <div className="flex items-center gap-[3px] h-full w-full justify-center">
               {Array.from(audioData).map((val, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-gray-500 rounded-full transition-all duration-75"
                    style={{ 
                      height: `${Math.max(15, (val / 255) * 100)}%`,
                      opacity: isPlaying ? 0.8 : 0.3
                    }} 
                  />
               ))}
            </div>
        </div>
        
        {/* Progress & Action */}
        <div className="flex items-center gap-4 shrink-0 justify-end min-w-0">
            {modelDownloadState && modelDownloadState.status !== 'idle' && (
              <div className="hidden sm:block text-[10px] text-gray-400 font-mono truncate max-w-[260px]" title="Model download status">
                <DownloadStatusLine state={modelDownloadState} />
              </div>
            )}
            {isGenerating && ttsStatus && (
              <div className="hidden sm:block text-[10px] text-gray-400 font-mono truncate max-w-[220px]" title={ttsStatus}>
                {ttsStatus}
              </div>
            )}
            <div className="hidden sm:block text-xs text-gray-400 font-mono tabular-nums whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            
            <button 
                onClick={handleGenerate}
                disabled={isGenerating || !bridgeReady}
                className="bg-[#4c4c4e] hover:bg-[#5c5c5e] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-2 rounded-full shadow-sm transition-all active:scale-95 border border-white/5 whitespace-nowrap"
            >
                Speak Selection
            </button>
        </div>

      </footer>
      
      <VoiceCloneModal 
        isOpen={showCloneModal}
        onClose={() => setShowCloneModal(false)}
        onSave={handleSaveVoice}
      />
      
    </div>
  )
  /* c8 ignore stop */
}

export default App
