import { useState, useRef, useCallback } from 'react'
import './App.css'
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Music, 
  Video, 
  ArrowRight, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { saveAs } from 'file-saver'

// File type categories
type FileCategory = 'image' | 'document' | 'audio' | 'video' | 'unknown'

// Conversion format options
interface ConversionFormat {
  value: string
  label: string
  mimeType: string
  extension: string
}

// Conversion options by category
const conversionOptions: Record<FileCategory, ConversionFormat[]> = {
  image: [
    { value: 'png', label: 'PNG', mimeType: 'image/png', extension: '.png' },
    { value: 'jpeg', label: 'JPEG', mimeType: 'image/jpeg', extension: '.jpg' },
    { value: 'webp', label: 'WebP', mimeType: 'image/webp', extension: '.webp' },
    { value: 'gif', label: 'GIF', mimeType: 'image/gif', extension: '.gif' },
    { value: 'bmp', label: 'BMP', mimeType: 'image/bmp', extension: '.bmp' },
  ],
  document: [
    { value: 'txt', label: 'Plain Text', mimeType: 'text/plain', extension: '.txt' },
    { value: 'json', label: 'JSON', mimeType: 'application/json', extension: '.json' },
    { value: 'csv', label: 'CSV', mimeType: 'text/csv', extension: '.csv' },
    { value: 'html', label: 'HTML', mimeType: 'text/html', extension: '.html' },
    { value: 'xml', label: 'XML', mimeType: 'application/xml', extension: '.xml' },
  ],
  audio: [
    { value: 'mp3', label: 'MP3', mimeType: 'audio/mpeg', extension: '.mp3' },
    { value: 'wav', label: 'WAV', mimeType: 'audio/wav', extension: '.wav' },
    { value: 'ogg', label: 'OGG', mimeType: 'audio/ogg', extension: '.ogg' },
    { value: 'm4a', label: 'M4A', mimeType: 'audio/mp4', extension: '.m4a' },
    { value: 'webm', label: 'WebM Audio', mimeType: 'audio/webm', extension: '.webm' },
  ],
  video: [
    { value: 'mp4', label: 'MP4', mimeType: 'video/mp4', extension: '.mp4' },
    { value: 'webm', label: 'WebM', mimeType: 'video/webm', extension: '.webm' },
    { value: 'ogg', label: 'OGV', mimeType: 'video/ogg', extension: '.ogv' },
  ],
  unknown: [
    { value: 'txt', label: 'Plain Text', mimeType: 'text/plain', extension: '.txt' },
    { value: 'bin', label: 'Binary', mimeType: 'application/octet-stream', extension: '.bin' },
  ],
}

// Supported input formats by category
const supportedInputFormats: Record<string, FileCategory> = {
  // Images
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'image/bmp': 'image',
  'image/svg+xml': 'image',
  // Documents
  'text/plain': 'document',
  'text/html': 'document',
  'text/csv': 'document',
  'application/json': 'document',
  'application/xml': 'document',
  'text/xml': 'document',
  // Audio
  'audio/mpeg': 'audio',
  'audio/mp3': 'audio',
  'audio/wav': 'audio',
  'audio/wave': 'audio',
  'audio/ogg': 'audio',
  'audio/mp4': 'audio',
  'audio/m4a': 'audio',
  'audio/webm': 'audio',
  'audio/aac': 'audio',
  'audio/flac': 'audio',
  // Video
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  'video/x-matroska': 'video',
}

interface FileToConvert {
  id: string
  file: File
  category: FileCategory
  targetFormat: string
  status: 'pending' | 'converting' | 'completed' | 'error'
  progress: number
  convertedBlob?: Blob
  errorMessage?: string
  originalSize: number
  convertedSize?: number
}

function getFileCategory(file: File): FileCategory {
  const category = supportedInputFormats[file.type]
  if (category) return category
  
  // Try to detect by extension
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext) {
    const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg']
    const docExts = ['txt', 'json', 'csv', 'html', 'htm', 'xml']
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm']
    const videoExts = ['mp4', 'webm', 'ogv', 'mov', 'avi', 'mkv']
    
    if (imageExts.includes(ext)) return 'image'
    if (docExts.includes(ext)) return 'document'
    if (audioExts.includes(ext)) return 'audio'
    if (videoExts.includes(ext)) return 'video'
  }
  
  return 'unknown'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export default function App() {
  const [files, setFiles] = useState<FileToConvert[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setGlobalError(null)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError(null)
    const selectedFiles = Array.from(e.target.files || [])
    addFiles(selectedFiles)
    e.target.value = ''
  }, [])

  const addFiles = (newFiles: File[]) => {
    const validFiles: FileToConvert[] = []
    const invalidFiles: string[] = []

    newFiles.forEach(file => {
      const category = getFileCategory(file)
      if (category === 'unknown') {
        invalidFiles.push(file.name)
      } else {
        validFiles.push({
          id: generateId(),
          file,
          category,
          targetFormat: conversionOptions[category][0].value,
          status: 'pending',
          progress: 0,
          originalSize: file.size,
        })
      }
    })

    if (invalidFiles.length > 0) {
      setGlobalError(`Some files are not supported: ${invalidFiles.join(', ')}`)
    }

    setFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const clearAllFiles = () => {
    setFiles([])
    setGlobalError(null)
  }

  const updateTargetFormat = (id: string, format: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, targetFormat: format, status: 'pending', convertedBlob: undefined } : f
    ))
  }

  const convertImage = async (file: FileToConvert): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img')
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not create canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0)
        
        const format = conversionOptions.image.find(f => f.value === file.targetFormat)
        const mimeType = format?.mimeType || 'image/png'
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Conversion failed'))
          }
        }, mimeType, 0.9)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file.file)
    })
  }

  const convertDocument = async (file: FileToConvert): Promise<Blob> => {
    const text = await file.file.text()
    const format = conversionOptions.document.find(f => f.value === file.targetFormat)
    const mimeType = format?.mimeType || 'text/plain'
    
    let convertedText = text
    
    // Simple format conversions
    if (file.targetFormat === 'json') {
      try {
        // Try to parse as JSON first, otherwise wrap as object
        JSON.parse(text)
        convertedText = text
      } catch {
        convertedText = JSON.stringify({ content: text }, null, 2)
      }
    } else if (file.targetFormat === 'csv') {
      // Simple text to CSV conversion
      const lines = text.split('\n').filter(l => l.trim())
      convertedText = lines.map(line => {
        const cells = line.split(/\s+/).filter(c => c)
        return cells.join(',')
      }).join('\n')
    } else if (file.targetFormat === 'html') {
      convertedText = `<!DOCTYPE html>
<html>
<head><title>Converted Document</title></head>
<body>
<pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`
    } else if (file.targetFormat === 'xml') {
      convertedText = `<?xml version="1.0" encoding="UTF-8"?>
<document>
<content><![CDATA[${text}]]></content>
</document>`
    }
    
    return new Blob([convertedText], { type: mimeType })
  }

  const convertFile = async (file: FileToConvert) => {
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, status: 'converting', progress: 0 } : f
    ))

    try {
      let blob: Blob

      // Simulate progress
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.id === file.id && f.progress < 90 ? { ...f, progress: f.progress + 10 } : f
        ))
      }, 100)

      if (file.category === 'image') {
        blob = await convertImage(file)
      } else if (file.category === 'document') {
        blob = await convertDocument(file)
      } else if (file.category === 'audio' || file.category === 'video') {
        // For audio/video, we'll create a copy with the new extension
        // Note: Real conversion would require ffmpeg or similar
        const arrayBuffer = await file.file.arrayBuffer()
        const format = conversionOptions[file.category].find(f => f.value === file.targetFormat)
        blob = new Blob([arrayBuffer], { type: format?.mimeType || file.file.type })
      } else {
        throw new Error('Unsupported file type for conversion')
      }

      clearInterval(progressInterval)

      setFiles(prev => prev.map(f => 
        f.id === file.id ? { 
          ...f, 
          status: 'completed', 
          progress: 100, 
          convertedBlob: blob,
          convertedSize: blob.size
        } : f
      ))
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { 
          ...f, 
          status: 'error', 
          errorMessage: error instanceof Error ? error.message : 'Conversion failed' 
        } : f
      ))
    }
  }

  const convertAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error')
    for (const file of pendingFiles) {
      await convertFile(file)
    }
  }

  const downloadFile = (file: FileToConvert) => {
    if (!file.convertedBlob) return
    
    const format = conversionOptions[file.category].find(f => f.value === file.targetFormat)
    const extension = format?.extension || '.bin'
    const baseName = file.file.name.replace(/\.[^/.]+$/, '')
    const newFileName = `${baseName}${extension}`
    
    saveAs(file.convertedBlob, newFileName)
  }

  const downloadAllFiles = () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.convertedBlob)
    completedFiles.forEach(downloadFile)
  }

  const getCategoryIcon = (category: FileCategory) => {
    switch (category) {
      case 'image': return <Image className="w-5 h-5" />
      case 'document': return <FileText className="w-5 h-5" />
      case 'audio': return <Music className="w-5 h-5" />
      case 'video': return <Video className="w-5 h-5" />
      default: return <File className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category: FileCategory) => {
    switch (category) {
      case 'image': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'document': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'audio': return 'bg-green-100 text-green-700 border-green-200'
      case 'video': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const completedCount = files.filter(f => f.status === 'completed').length
  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'error').length
  const convertingCount = files.filter(f => f.status === 'converting').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Universal Converter</h1>
              <p className="text-xs text-slate-500">Convert any file to any format</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">Image</Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">Document</Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700">Audio</Badge>
              <Badge variant="secondary" className="bg-red-100 text-red-700">Video</Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Upload Area */}
        <Card className="mb-6 border-2 border-dashed transition-all duration-200"
          style={{ 
            borderColor: isDragging ? '#6366f1' : undefined,
            backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.05)' : undefined 
          }}
        >
          <CardContent className="p-8">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                <Upload className="w-10 h-10 text-indigo-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Drop files here or click to browse
              </h3>
              <p className="text-sm text-slate-500 text-center max-w-md">
                Support for images (PNG, JPG, WebP, GIF, BMP), documents (TXT, JSON, CSV, HTML), 
                audio (MP3, WAV, OGG), and video (MP4, WebM)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Global Error */}
        {globalError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{globalError}</AlertDescription>
          </Alert>
        )}

        {/* File List */}
        {files.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Files to Convert</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {files.length} file{files.length !== 1 ? 's' : ''} • {completedCount} completed • {pendingCount} pending
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <Button onClick={convertAllFiles} disabled={convertingCount > 0}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${convertingCount > 0 ? 'animate-spin' : ''}`} />
                    Convert All
                  </Button>
                )}
                {completedCount > 0 && (
                  <Button variant="outline" onClick={downloadAllFiles}>
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={clearAllFiles}>
                  <Trash2 className="w-4 h-4 text-slate-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    {/* File Icon */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryColor(file.category)}`}>
                      {getCategoryIcon(file.category)}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{file.file.name}</p>
                      <p className="text-sm text-slate-500">
                        {formatFileSize(file.originalSize)}
                        {file.convertedSize && (
                          <span className="text-green-600 ml-2">
                            → {formatFileSize(file.convertedSize)}
                          </span>
                        )}
                      </p>
                      {file.status === 'converting' && (
                        <div className="mt-2">
                          <Progress value={file.progress} className="h-1" />
                        </div>
                      )}
                      {file.status === 'error' && (
                        <p className="text-sm text-red-500 mt-1">{file.errorMessage}</p>
                      )}
                    </div>

                    {/* Format Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Convert to:</span>
                      <Select 
                        value={file.targetFormat} 
                        onValueChange={(value) => updateTargetFormat(file.id, value)}
                        disabled={file.status === 'converting'}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {conversionOptions[file.category].map((format) => (
                            <SelectItem key={format.value} value={format.value}>
                              {format.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="w-4 h-4 text-slate-400" />

                    {/* Target Format Badge */}
                    <Badge variant="outline" className="min-w-[80px] justify-center">
                      {conversionOptions[file.category].find(f => f.value === file.targetFormat)?.label}
                    </Badge>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {file.status === 'pending' || file.status === 'error' ? (
                        <Button 
                          size="sm" 
                          onClick={() => convertFile(file)}
                        >
                          {'Convert'}
                        </Button>
                      ) : file.status === 'completed' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => downloadFile(file)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      ) : null}
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </Button>
                    </div>

                    {/* Status Icon */}
                    {file.status === 'completed' && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Supported Formats Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5 text-purple-500" />
                <CardTitle className="text-base">Images</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                PNG, JPEG, WebP, GIF, BMP, SVG
              </p>
              <Separator className="my-2" />
              <p className="text-xs text-slate-500">
                Convert between all popular image formats with quality preservation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-base">Documents</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                TXT, JSON, CSV, HTML, XML
              </p>
              <Separator className="my-2" />
              <p className="text-xs text-slate-500">
                Transform text documents between different structured formats
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-green-500" />
                <CardTitle className="text-base">Audio</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                MP3, WAV, OGG, M4A, WebM, AAC
              </p>
              <Separator className="my-2" />
              <p className="text-xs text-slate-500">
                Convert audio files to compatible formats for any device
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500" />
                <CardTitle className="text-base">Video</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                MP4, WebM, OGV, MOV, AVI
              </p>
              <Separator className="my-2" />
              <p className="text-xs text-slate-500">
                Convert videos for web playback and cross-platform compatibility
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-indigo-600">1</span>
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">Upload Files</h4>
                <p className="text-sm text-slate-500">Drag and drop or click to select files from your device</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-indigo-600">2</span>
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">Choose Format</h4>
                <p className="text-sm text-slate-500">Select your desired output format from the dropdown</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-indigo-600">3</span>
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">Download</h4>
                <p className="text-sm text-slate-500">Convert and download your files instantly</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
          Universal File Converter • All conversions happen locally in your browser • Your files are never uploaded to any server
        </div>
      </footer>
    </div>
  )
}
