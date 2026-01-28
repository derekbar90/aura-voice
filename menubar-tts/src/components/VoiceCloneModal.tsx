import { useState, useRef, useEffect } from 'react'
import { convertBlobToWav } from '../utils/audio'

type VoiceCloneModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, buffer: ArrayBuffer, transcript: string) => Promise<void>
}

const SCRIPTS = [
  "The quick brown fox jumps over the lazy dog.",
  "To be, or not to be, that is the question.",
  "I enjoy reading about the history of space exploration.",
  "Artificial intelligence is transforming the way we interact with technology.",
  "The rain in Spain stays mainly in the plain.",
]

export function VoiceCloneModal({ isOpen, onClose, onSave }: VoiceCloneModalProps) {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'review' | 'saving'>('idle')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [newVoiceName, setNewVoiceName] = useState('')
  const [activeScript, setActiveScript] = useState(SCRIPTS[0])
  const [volume, setVolume] = useState(0)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number>()
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()

  // Fetch devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission first to get labels
        await navigator.mediaDevices.getUserMedia({ audio: true })
        const allDevices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = allDevices.filter(d => d.kind === 'audioinput')
        setDevices(audioInputs)
        if (audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId)
        }
      } catch (err) {
        console.error("Error enumerating devices:", err)
      }
    }
    if (isOpen) getDevices()
  }, [isOpen])

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setRecordingState('idle')
      setRecordedBlob(null)
      setRecordingTime(0)
      setNewVoiceName('')
      setVolume(0)
      setActiveScript(SCRIPTS[Math.floor(Math.random() * SCRIPTS.length)])
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [isOpen])

  const startRecording = async () => {
    try {
      recordingChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true 
      })
      
      // Setup Audio Context for volume meter
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      const updateVolume = () => {
        if (!analyserRef.current) return
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        
        setVolume(average)
        animationFrameRef.current = requestAnimationFrame(updateVolume)
      }
      updateVolume()

      mediaRecorderRef.current = new MediaRecorder(stream)
      recordingChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob)
        setRecordingState('review')
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setRecordingState('recording')
      
      const startTime = Date.now()
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((Date.now() - startTime) / 1000)
      }, 100)

    } catch (err: any) {
      console.error("Error accessing microphone:", err)
      alert(`Could not access microphone: ${err.name} - ${err.message}. Please ensure permissions are granted in System Settings.`)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop()
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      setVolume(0)
    }
  }

  const playRecording = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob)
      const audio = new Audio(url)
      audio.play()
    }
  }

  const handleSave = async () => {
    if (!recordedBlob || !newVoiceName.trim()) return
    setRecordingState('saving')
    
    try {
      const wavBuffer = await convertBlobToWav(recordedBlob)
      await onSave(newVoiceName, wavBuffer, activeScript)
      onClose()
    } catch (e) {
      console.error('Failed to save voice', e)
      alert('Failed to save voice. Check console for details.')
      setRecordingState('review')
    }
  }

  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
       <div className="bg-[#2C2C2E] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-down flex flex-col gap-4">
          
          <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-white">Clone Your Voice</h3>
                <p className="text-xs text-gray-400 mt-1">Read the text below clearly to create a voice clone.</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
          </div>

          {/* Script Card */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
             <p className="text-lg font-serif text-center leading-relaxed text-gray-200">
               "{activeScript}"
             </p>
             <div className="mt-2 flex justify-center">
                <button 
                  onClick={() => setActiveScript(SCRIPTS[Math.floor(Math.random() * SCRIPTS.length)])}
                  className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 uppercase tracking-wide"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Shuffle Text
                </button>
             </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-4 py-2">
             {recordingState === 'idle' && (
                <div className="flex flex-col items-center gap-4 w-full">
                   <div className="w-full space-y-1 px-4">
                      <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Input Device</label>
                      <select 
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0e639c]"
                      >
                        {devices.map(device => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                   </div>
                   <button 
                     onClick={startRecording}
                     className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-glow flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                   >
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                   </button>
                </div>
             )}

             {recordingState === 'recording' && (
                <div className="flex flex-col items-center gap-2 w-full px-8">
                   <div className="text-2xl font-mono text-red-400 tabular-nums">
                      {recordingTime.toFixed(1)}s
                   </div>
                   
                   {/* Volume Meter */}
                   <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-2">
                      <div 
                        className="h-full bg-red-500 transition-all duration-75" 
                        style={{ width: `${Math.min(100, (volume / 128) * 100)}%` }}
                      />
                   </div>

                   <div className="flex items-center gap-2 mt-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs text-red-400 uppercase tracking-widest">Recording</span>
                   </div>
                   <button 
                     onClick={stopRecording}
                     className="mt-4 w-16 h-16 rounded-full bg-gray-700 hover:bg-gray-600 border-2 border-white/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                   >
                      <div className="w-5 h-5 bg-white rounded-sm" />
                   </button>
                </div>
             )}

                              {recordingState === 'review' && (
                                 <div className="flex flex-col items-center gap-4 w-full">
                                    <div className="flex gap-4">
                                       <button onClick={playRecording} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-medium flex items-center gap-2 transition-colors">
                                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Play Review
                                       </button>
                                       <button onClick={() => setRecordingState('idle')} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-medium text-red-400 hover:text-red-300 transition-colors">
                                          Discard & Retry
                                       </button>
                                    </div>
                                    
                                    <div className="w-full h-px bg-white/10 my-2" />
             
                                    <div className="w-full flex flex-col gap-3">
                                       <div className="space-y-1">
                                         <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Voice Name</label>
                                         <input 
                                            type="text"
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0e639c]"
                                            placeholder="e.g. My Narrator"
                                            value={newVoiceName}
                                            onChange={e => setNewVoiceName(e.target.value)}
                                         />
                                       </div>
             
                                       <div className="space-y-1">
                                         <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Transcript (matches recording)</label>
                                         <textarea 
                                            className="w-full h-20 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0e639c] resize-none"
                                            value={activeScript}
                                            onChange={e => setActiveScript(e.target.value)}
                                         />
                                       </div>
             
                                       <button 
                                          onClick={handleSave}
                                          disabled={!newVoiceName.trim() || !activeScript.trim()}
                                          className="w-full py-2.5 bg-[#0e639c] hover:bg-[#1177bb] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-lg mt-2"
                                       >
                                          Save Voice
                                       </button>
                                    </div>
                                 </div>
                              )}             
             {recordingState === 'saving' && (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                   <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   <span className="text-xs">Saving voice...</span>
                </div>
             )}

          </div>
       </div>
    </div>
  )
}
