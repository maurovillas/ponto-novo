/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { 
  Clock, 
  Calendar, 
  User, 
  MapPin, 
  ChevronRight, 
  History, 
  Settings,
  Bell,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Navigation,
  Crosshair,
  LogOut,
  Shield,
  Eye,
  Moon,
  HelpCircle,
  FileText,
  Briefcase,
  ChevronLeft,
  ToggleLeft as Toggle,
  Smartphone,
  Camera,
  Image as ImageIcon,
  Crop as CropIcon,
  Check,
  X,
  Plus,
  Minus,
  Trash2,
  Share,
  ArrowRight,
  ArrowLeft,
  Menu as MenuIcon,
  LayoutGrid,
  Wifi,
  Battery,
  ScanText,
  Edit3,
  BarChart3,
  Download,
  MessageSquare,
  Umbrella,
  Palmtree,
  Stethoscope,
  Flag,
  Coffee,
  Sun,
  RotateCcw,
  Edit2,
  Cloud
} from 'lucide-react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform, animate } from 'motion/react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import dynamic from 'next/dynamic';
const LeafletInit = dynamic(() => import('../components/LeafletInit'), { ssr: false });

import Tesseract from 'tesseract.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import { Login } from './components/Login';
import { getSupabase } from './supabase';
const supabase = getSupabase();

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if ((this as any).state.hasError) {
      const errorMessage = (this as any).state.error.message || "Ocorreu um erro inesperado.";

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-slate-950 text-center">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Ops! Algo deu errado</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">{errorMessage}</p>
          <button 
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="px-6 py-2 bg-brand-blue text-white rounded-xl font-bold shadow-lg hover:shadow-brand-blue/20 transition-all"
          >
            Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Helper to update map center
// ChangeView moved to LeafletInit.tsx

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const SwipeableLogCard = ({ 
  log, 
  onDelete, 
  onTriggerUpload, 
  onViewImage,
  onEdit,
  isProcessingOCR,
  activeLogId
}: { 
  log: TimeLog; 
  onDelete: (id: string) => void;
  onTriggerUpload: (id: string, mode: 'camera' | 'gallery') => void;
  onViewImage: (url: string, id: string) => void;
  onEdit: (log: TimeLog) => void;
  isProcessingOCR: boolean;
  activeLogId: string | null;
  key?: React.Key;
}) => {
  const x = useMotionValue(0);
  const deleteX = useTransform(x, [0, 80], [-80, 0]);
  const deleteOpacity = useTransform(x, [0, 40], [0, 1]);
  
  const photoX = useTransform(x, [0, -80], [80, 0]);
  const photoOpacity = useTransform(x, [0, -40], [0, 1]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 40) {
      animate(x, 80, { type: 'spring', stiffness: 400, damping: 40 });
    } else if (info.offset.x < -40) {
      animate(x, -80, { type: 'spring', stiffness: 400, damping: 40 });
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 });
    }
  };

  return (
    <div className="relative mb-1 group overflow-hidden rounded-none h-[64px]">
      {/* Background Delete Button - Swipe Right */}
      <div className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center z-0">
        <motion.button 
          style={{ x: deleteX, opacity: deleteOpacity }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(log.id);
            animate(x, 0);
          }}
          className="w-full h-full bg-rose-500 text-white flex flex-col items-center justify-center gap-1 transition-colors hover:bg-rose-600"
        >
          <Trash2 size={20} />
          <span className="text-[8px] font-bold uppercase">Apagar</span>
        </motion.button>
      </div>

      {/* Background Photo Button - Swipe Left */}
      <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center z-0">
        <motion.button 
          style={{ x: photoX, opacity: photoOpacity }}
          onClick={(e) => {
            e.stopPropagation();
            if (log.ticketImage) {
              onViewImage(log.ticketImage, log.id);
            } else {
              onTriggerUpload(log.id, 'camera');
            }
            animate(x, 0);
          }}
          className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-colors ${
            log.ticketImage ? 'bg-brand-blue hover:bg-brand-navy' : 'bg-brand-blue hover:bg-brand-navy'
          } text-white`}
        >
          {log.ticketImage ? <ImageIcon size={20} /> : <Camera size={20} />}
          <span className="text-[8px] font-bold uppercase">{log.ticketImage ? 'Ver Foto' : 'Foto'}</span>
        </motion.button>
      </div>

      {/* Foreground Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 80 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (Math.abs(x.get()) > 10) {
            animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 });
          }
        }}
        className="bg-transparent h-full px-2 rounded-none flex items-center justify-between gap-4 relative z-10 touch-pan-y transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-brand-blue`}>
              {(log.type === 'in' || log.type === 'break_end') ? (
                <ArrowRight size={20} strokeWidth={4} className="text-brand-lime" />
              ) : (
                <ArrowLeft size={20} strokeWidth={4} className="text-brand-blue" />
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {log.observations || (log.type === 'in' ? 'Entrada' : 
                 log.type === 'out' ? 'Saída' : 
                 log.type === 'break_start' ? 'Início Intervalo' : 'Fim Intervalo')}
              </p>
              <div className="flex items-center gap-2">
                <p 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(log);
                  }}
                  className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tabular-nums cursor-pointer hover:text-brand-blue transition-colors"
                >
                  {log.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {log.nsr && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                    <ScanText size={10} className="text-brand-blue" />
                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 tabular-nums">NSR {log.nsr}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {log.ticketImage && (
          <div className="flex items-center gap-2 pr-2">
            {isProcessingOCR && activeLogId === log.id && (
              <div className="flex items-center gap-1">
                <ScanText size={12} className="text-brand-blue animate-pulse" />
                <span className="text-[8px] font-bold text-slate-400 uppercase animate-pulse">Lendo...</span>
              </div>
            )}
            {!isProcessingOCR && (
              <div className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-pulse" />
            )}
            <ImageIcon size={14} className="text-slate-400" />
          </div>
        )}
      </motion.div>
    </div>
  );
};

const TimelineCard = ({ 
  item, 
  nextItem, 
  isRegistered, 
  timeStr, 
  colors, 
  durationLabel, 
  deleteLog, 
  setViewingImage, 
  triggerFileUpload, 
  setEditingLog 
}: any) => {
  const x = useMotionValue(0);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 32) {
      animate(x, 64, { type: 'spring', stiffness: 400, damping: 40 });
    } else if (info.offset.x < -32) {
      animate(x, -64, { type: 'spring', stiffness: 400, damping: 40 });
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 });
    }
  };

  const handleAction = (action: () => void) => {
    action();
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 });
  };

  return (
    <div className="relative mb-10">
      {/* Vertical Line Segment */}
      {nextItem && (
        <div 
          className={`absolute left-[34px] top-[52px] w-[4px] h-[64px] -z-0 ${
            (!item.isPredicted && !nextItem.isPredicted)
              ? (item.type === 'break_start' ? 'bg-slate-300 dark:bg-slate-700' : 'bg-brand-blue')
              : 'bg-slate-100 dark:bg-slate-800'
          }`}
        />
      )}

      <div className="relative h-[64px] overflow-hidden w-full">
        {/* Foreground Card */}
        <motion.div
          drag={isRegistered ? "x" : false}
          dragConstraints={{ left: -64, right: 64 }}
          dragElastic={0.1}
          style={{ x }}
          onDragEnd={handleDragEnd}
          onClick={() => {
            if (Math.abs(x.get()) > 10) {
              animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 });
            }
          }}
          className="absolute inset-0 bg-transparent flex items-center gap-4 px-4 z-10 rounded-none"
        >
          {/* Background Actions (attached to motion.div) */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleAction(() => item.log && deleteLog(item.log.id));
            }}
            className="absolute right-full top-0 bottom-0 w-16 flex flex-col items-center justify-center bg-rose-500 text-white active:bg-rose-600 transition-colors rounded-none"
          >
            <Trash2 size={20} />
            <span className="text-[8px] font-black uppercase mt-1">Apagar</span>
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleAction(() => {
                if (item.log?.ticketImage) {
                  setViewingImage({ url: item.log.ticketImage, logId: item.log.id });
                } else if (item.log) {
                  triggerFileUpload(item.log.id, 'camera');
                }
              });
            }}
            className="absolute left-full top-0 bottom-0 w-16 flex flex-col items-center justify-center bg-brand-blue text-white active:bg-brand-navy transition-colors rounded-none"
          >
            <div className="flex flex-col items-center gap-1">
              {item.log?.ticketImage ? <Eye size={20} /> : <Camera size={20} />}
              <span className="text-[8px] font-black uppercase">{item.log?.ticketImage ? 'Ver Foto' : 'Foto'}</span>
            </div>
          </button>

          {/* Circle */}
          <div 
            className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] transition-all z-10 bg-white dark:bg-slate-950 shrink-0 ${
              isRegistered 
                ? 'border-brand-blue shadow-lg shadow-brand-blue/10' 
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            {(item.type === 'in' || item.type === 'break_end') ? (
              <ArrowRight size={18} strokeWidth={3} className={isRegistered ? colors.text : 'text-slate-300'} />
            ) : (
              <ArrowLeft size={18} strokeWidth={3} className={isRegistered ? colors.text : 'text-slate-300'} />
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col flex-1">
            <div className="flex items-baseline gap-2">
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  if (isRegistered && item.log) setEditingLog(item.log);
                }}
                className={`text-base font-bold tabular-nums w-fit cursor-pointer ${isRegistered ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-700'}`}
              >
                {timeStr}
              </span>
              {isRegistered && item.log?.observations && (
                <span className="text-[10px] font-black text-brand-blue dark:text-brand-lime uppercase tracking-tight bg-brand-blue/5 dark:bg-brand-lime/5 px-1.5 py-0.5 rounded border border-brand-blue/10 dark:border-brand-lime/10">
                  {item.log.observations}
                </span>
              )}
            </div>
            <span className={`text-xs font-medium ${isRegistered ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-700'}`}>
              {item.label}
            </span>
          </div>
          
          {isRegistered && item.log?.ticketImage && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setViewingImage({ url: item.log.ticketImage, logId: item.log.id });
              }}
              className="w-10 h-10 flex items-center justify-center text-brand-blue bg-transparent active:scale-90 transition-transform"
            >
              <Camera size={18} />
            </button>
          )}
        </motion.div>
      </div>

      {/* Duration Label */}
      {durationLabel && (
        <div className="absolute left-[64px] top-[68px] h-[16px] flex items-center">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-600">
            {durationLabel}
          </span>
        </div>
      )}
    </div>
  );
};

async function getCroppedImg(imageSrc: string, pixelCrop: any, rotation = 0, brightness = 110, contrast = 150): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  const rotRad = (rotation * Math.PI) / 180;
  
  // Calculate bounding box for the rotated image
  const cos = Math.abs(Math.cos(rotRad));
  const sin = Math.abs(Math.sin(rotRad));
  const bBoxWidth = image.width * cos + image.height * sin;
  const bBoxHeight = image.width * sin + image.height * cos;

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) return '';

  // Resize logic to prevent massive base64 strings
  const MAX_WIDTH = 1000;
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;

  if (targetWidth > MAX_WIDTH) {
    const ratio = MAX_WIDTH / targetWidth;
    targetWidth = MAX_WIDTH;
    targetHeight = targetHeight * ratio;
  }

  croppedCanvas.width = targetWidth;
  croppedCanvas.height = targetHeight;

  // Apply Scanner Filter (B&W High Contrast)
  croppedCtx.filter = `grayscale(1) contrast(${contrast}%) brightness(${brightness}%)`;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return croppedCanvas.toDataURL('image/jpeg', 0.6); // Lower quality to reduce size
}

function getRadianChatSize(width: number, height: number, rotation: number) {
  const cos = Math.abs(Math.cos(rotation));
  const sin = Math.abs(Math.sin(rotation));

  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

// Types
interface TimeLog {
  id: string;
  type: 'in' | 'out' | 'break_start' | 'break_end' | 'manual_adjustment';
  timestamp: Date;
  location: string;
  coords?: [number, number];
  ticketImage?: string;
  observations?: string;
  nsr?: string;
  workedMs?: number;
  note?: string;
}

interface ScheduleDay {
  day: string;
  date: string;
  shift: string;
  isOff: boolean;
  isToday?: boolean;
}

const LongPressCard = ({ 
  type, 
  isActive, 
  isDisabled, 
  onLongPress 
}: { 
  type: TimeLog['type']; 
  isActive: boolean; 
  isDisabled: boolean; 
  onLongPress: (type: TimeLog['type']) => void;
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const controls = useAnimation();

  const handleStart = () => {
    if (isDisabled) return;
    setIsPressing(true);
    controls.start({
      scale: 0.95,
      transition: { duration: 1 }
    });
    timerRef.current = setTimeout(() => {
      setIsPressing(false);
      onLongPress(type);
      controls.start({ scale: 1 });
    }, 1000);
  };

  const handleEnd = () => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    controls.start({ scale: 1 });
  };

  const getLabel = () => {
    if (type === 'in') return isActive ? 'Registrar Saída' : 'Registrar Entrada';
    switch (type) {
      case 'break_start': return 'Início Intervalo';
      case 'break_end': return 'Fim Intervalo';
      default: return '';
    }
  };

  const getIcon = () => {
    if (type === 'in') return isActive ? <LogOut size={24} /> : <Fingerprint size={24} />;
    switch (type) {
      case 'break_start': return <Clock size={24} />;
      case 'break_end': return <CheckCircle2 size={24} />;
      default: return null;
    }
  };

  const getColorClass = () => {
    if (isDisabled) return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed';
    if (type === 'in') {
      return isActive 
        ? 'bg-white dark:bg-slate-900 border-rose-500 text-rose-500 shadow-rose-500/10'
        : 'bg-brand-blue border-brand-blue text-white shadow-brand-blue/20';
    }
    if (type === 'break_start') return 'bg-white dark:bg-slate-900 border-brand-lime text-brand-navy shadow-brand-lime/10';
    if (type === 'break_end') return 'bg-white dark:bg-slate-900 border-emerald-500 text-emerald-600 dark:text-emerald-500 shadow-emerald-500/10';
    return 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400';
  };

  return (
    <motion.div
      animate={controls}
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerLeave={handleEnd}
      className={`relative w-full h-[72px] rounded-none flex items-center px-6 shadow-lg transition-all duration-300 border-2 select-none touch-none ${getColorClass()}`}
    >
      {isPressing && (
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1, ease: "linear" }}
          className="absolute bottom-0 left-0 h-1.5 bg-white/30 rounded-full"
        />
      )}
      <div className="mr-4">{getIcon()}</div>
      <div className="flex flex-col items-start">
        <span className="text-[10px] font-black uppercase tracking-widest leading-tight">
          {getLabel()}
        </span>
        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
          Segure para registrar
        </span>
      </div>
      <div className="ml-auto">
        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
          <ChevronRight size={16} className="text-brand-blue dark:text-brand-lime" />
        </div>
      </div>
    </motion.div>
  );
};

const DocumentScanner = ({ onScan, onClose }: { onScan: (imageSrc: string) => void, onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [isSteady, setIsSteady] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        const constraints: MediaStreamConstraints = { 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        };
        
        try {
          currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e) {
          console.warn("Failed with environment facingMode, trying default...", e);
          currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        setStream(currentStream);
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
          
          const track = currentStream.getVideoTracks()[0];
          const caps = track.getCapabilities ? track.getCapabilities() : {};
          setCapabilities(caps);
        }
      } catch (err: any) {
        console.error("Error accessing camera:", err);
        let msg = "Não foi possível acessar a câmera.";
        if (err.name === 'NotAllowedError') {
          msg = "Permissão de câmera negada. Por favor, autorize o acesso nas configurações do seu navegador.";
        } else if (err.name === 'NotFoundError') {
          msg = "Nenhuma câmera encontrada no dispositivo.";
        }
        alert(msg);
        onClose();
      }
    };
    startCamera();

    // Simulate stabilization detection
    const interval = setInterval(() => {
      setIsSteady(Math.random() > 0.3);
    }, 1000);

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      clearInterval(interval);
    };
  }, [onClose]);

  useEffect(() => {
    if (stream && capabilities) {
      const track = stream.getVideoTracks()[0];
      const constraints: any = { advanced: [] };
      
      if (capabilities.zoom) {
        constraints.advanced.push({ zoom: zoom });
      }
      if (capabilities.torch) {
        constraints.advanced.push({ torch: isFlashOn });
      }

      if (constraints.advanced.length > 0) {
        track.applyConstraints(constraints).catch(e => console.error("Error applying constraints", e));
      }
    }
  }, [zoom, isFlashOn, stream, capabilities]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Apply scanner-like filters (grayscale, high contrast, slight brightness)
        ctx.filter = 'grayscale(100%) contrast(150%) brightness(110%)';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.6);
        onScan(imageDataUrl);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="p-4 flex justify-between items-center bg-black/50 absolute top-0 left-0 right-0 z-20 backdrop-blur-md">
        <button onClick={onClose} className="text-white p-2 active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-white font-bold text-sm">Escanear Documento</span>
          <div className="flex items-center gap-1 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isSteady ? 'bg-brand-lime animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[8px] text-white/70 uppercase tracking-widest font-bold">
              {isSteady ? 'Estável' : 'Mova devagar'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => capabilities?.torch && setIsFlashOn(!isFlashOn)}
          className={`p-2 rounded-full transition-colors ${isFlashOn ? 'bg-brand-lime text-black' : 'text-white bg-white/10'}`}
          disabled={!capabilities?.torch}
        >
          <Sun size={20} className={isFlashOn ? 'fill-current' : ''} />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        
        {/* Scanner overlay guides */}
        <div className="absolute inset-8 border-2 border-white/20 rounded-xl pointer-events-none">
          <div className={`absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-xl transition-colors duration-500 ${isSteady ? 'border-brand-lime' : 'border-white/40'}`} />
          <div className={`absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-xl transition-colors duration-500 ${isSteady ? 'border-brand-lime' : 'border-white/40'}`} />
          <div className={`absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-xl transition-colors duration-500 ${isSteady ? 'border-brand-lime' : 'border-white/40'}`} />
          <div className={`absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-xl transition-colors duration-500 ${isSteady ? 'border-brand-lime' : 'border-white/40'}`} />
          
          {/* Center Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-30">
            <div className="w-full h-0.5 bg-white" />
            <div className="h-full w-0.5 bg-white absolute" />
          </div>
        </div>

        {/* Zoom Slider */}
        {capabilities?.zoom && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10">
            <button onClick={() => setZoom(prev => Math.min(capabilities.zoom.max, prev + 0.5))} className="text-white p-1 active:scale-90">
              <Plus size={18} />
            </button>
            <div className="h-32 w-1 bg-white/20 rounded-full relative">
              <div 
                className="absolute bottom-0 left-0 w-full bg-brand-lime rounded-full transition-all"
                style={{ height: `${((zoom - capabilities.zoom.min) / (capabilities.zoom.max - capabilities.zoom.min)) * 100}%` }}
              />
            </div>
            <button onClick={() => setZoom(prev => Math.max(capabilities.zoom.min, prev - 0.5))} className="text-white p-1 active:scale-90">
              <Minus size={18} />
            </button>
            <span className="text-[10px] font-bold text-white">{zoom.toFixed(1)}x</span>
          </div>
        )}
      </div>

      <div className="p-8 pb-12 bg-black flex flex-col items-center gap-6">
        <div className="flex items-center gap-8">
          <div className="w-12 h-12" /> {/* Spacer */}
          <button 
            onClick={handleCapture}
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${isSteady ? 'border-brand-lime scale-110' : 'border-white'}`}
          >
            <div className={`w-16 h-16 rounded-full transition-all ${isSteady ? 'bg-brand-lime' : 'bg-white'} active:scale-90`} />
          </button>
          <div className="w-12 h-12 flex items-center justify-center text-white/40">
            <ScanText size={24} />
          </div>
        </div>
        <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold">Posicione o documento no quadro</p>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isIframe, setIsIframe] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "Usuário Chronos",
    role: "Colaborador",
    email: "",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
    company: "Chronos Tech",
    department: "Desenvolvimento",
    registrationNumber: "",
    cpf: "",
    matricula: ""
  });
  const [customShifts, setCustomShifts] = useState<Record<string, any>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          supabaseId: u.id,
          email: u.email,
          displayName: u.user_metadata.full_name || u.email,
          photoURL: u.user_metadata.avatar_url || '',
          user_metadata: u.user_metadata
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          supabaseId: u.id,
          email: u.email,
          displayName: u.user_metadata.full_name || u.email,
          photoURL: u.user_metadata.avatar_url || '',
          user_metadata: u.user_metadata
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }
  }, []);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<'ponto' | 'historico' | 'escala' | 'menu' | 'extra_menu' | 'settings'>('ponto');
  useEffect(() => {
    const saved = localStorage.getItem('chronos_tab');
    if (saved) setCurrentTab(saved as any);
  }, []);
  const [escalaView, setEscalaView] = useState<'semanal' | 'mensal'>('semanal');
  useEffect(() => {
    const saved = localStorage.getItem('chronos_escala_view');
    if (saved) setEscalaView(saved as any);
  }, []);
  const [historyDate, setHistoryDate] = useState(new Date());
  const [historicoView, setHistoricoView] = useState<'mensal' | 'semanal'>('mensal');
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [lastNotifiedTime, setLastNotifiedTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const parseTimeToMs = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return ((hours || 0) * 3600000) + ((minutes || 0) * 60000);
  };

  const parseTimeToDate = (timeStr: string, baseDate: Date) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const d = new Date(baseDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [menuView, setMenuView] = useState<'main' | 'settings' | 'profile' | 'docs' | 'reports' | 'requests' | 'support'>('main');
  const [docsTab, setDocsTab] = useState<'comprovantes' | 'atestados'>('comprovantes');
  const [showAtestadoForm, setShowAtestadoForm] = useState(false);

  const [atestadoForm, setAtestadoForm] = useState({ date: '', isFullDay: true, startTime: '', endTime: '', scannedImage: null as string | null });
  const [isScanning, setIsScanning] = useState(false);
  const [atestadosList, setAtestadosList] = useState<{id: string, date: string, isFullDay: boolean, startTime: string, endTime: string, image: string}[]>([]);
  const [espelhoFilterType, setEspelhoFilterType] = useState<'month' | 'period'>('month');
  const [espelhoMonth, setEspelhoMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [espelhoStartDate, setEspelhoStartDate] = useState<string>("");
  const [espelhoEndDate, setEspelhoEndDate] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number]>([-23.5505, -46.6333]); // Default to SP
  const [isHighAccuracy, setIsHighAccuracy] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Settings State
  const [settings, setSettings] = useState({
    notifications: true,
    notificationPrefs: { alerts: true, reminders: true, system: true },
    theme: 'system',
    colorPalette: 'default',
    vacationMode: {
      active: false,
      startDate: '',
      endDate: ''
    },
    workload: {
      daily: '08:00',
      weekly: '44:00',
      monthly: '176:00',
      break: '01:00'
    },
    tolerance: 10, // minutes
    nightShift: {
      active: false,
      start: '22:00',
      end: '05:00',
      multiplier: 1.2
    },
    bankOfHours: {
      active: false,
      initialBalance: 0
    },
    totalBalanceView: 'week',
    weekStart: 'sunday' // 'sunday' or 'monday'
  });

  useEffect(() => {
    const saved = localStorage.getItem('chronos_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing settings:", e);
      }
    }
  }, []);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem('chronos_settings', JSON.stringify(settings));
  }, [settings]);

  // Mock data for history
  const [logs, setLogs] = useState<TimeLog[]>([]);
  
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: "", sub: "" });
  const [showDayAlert, setShowDayAlert] = useState(false);
  const [dayAlertMessage, setDayAlertMessage] = useState({ title: "", sub: "", type: 'holiday' as 'holiday' | 'off' });
  const [showDatabaseHelp, setShowDatabaseHelp] = useState(false);
  const [isRLSBlocked, setIsRLSBlocked] = useState(false);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; logId: string } | null>(null);
  const [showManualLogPopup, setShowManualLogPopup] = useState(false);
  const [manualLogForm, setManualLogForm] = useState<{
    date: string;
    time: string;
    type: TimeLog['type'];
    observations: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    type: 'in',
    observations: ''
  });

  // Auth Listener (Supabase Mode)
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const user = session.user;
        setUser({
          id: user.id,
          supabaseId: user.id,
          email: user.email,
          displayName: user.user_metadata.full_name || user.email,
          photoURL: user.user_metadata.avatar_url || '',
          user_metadata: user.user_metadata
        });
      }
      setIsAuthReady(true);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const user = session.user;
        setUser({
          id: user.id,
          supabaseId: user.id,
          email: user.email,
          displayName: user.user_metadata.full_name || user.email,
          photoURL: user.user_metadata.avatar_url || '',
          user_metadata: user.user_metadata
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check for RLS on load
  useEffect(() => {
    const checkRLS = async () => {
      if (user && user.supabaseId) {
        try {
          // Try a dummy update to check RLS
          const { error } = await supabase
            .from('profiles')
            .upsert({ id: user.supabaseId, updated_at: new Date().toISOString() });
          
          if (error && error.message.includes('row-level security policy')) {
            setIsRLSBlocked(true);
          } else {
            setIsRLSBlocked(false);
          }
        } catch (e) {
          console.error("Error checking RLS:", e);
        }
      }
    };
    checkRLS();
  }, [user]);

  const handleLogout = async () => {
    if (typeof window !== 'undefined' && window.confirm("Isso apenas limpará seus dados locais de identificação. Deseja continuar?")) {
      localStorage.removeItem('ponto_anonymous_id');
      localStorage.removeItem('ponto_user_name');
      localStorage.removeItem('ponto_user_avatar');
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };


  // Supabase Sync - Logs
  useEffect(() => {
    if (!user || !user.supabaseId) {
      setLogs([]);
      return;
    }

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('user_id', user.supabaseId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching logs:', error.message);
        return;
      }

      setLogs(data.map(log => ({
        id: log.id,
        type: log.type,
        timestamp: new Date(log.timestamp),
        location: log.location,
        coords: log.coords,
        ticketImage: log.ticket_image,
        observations: log.observations,
        nsr: log.nsr,
        workedMs: log.worked_ms,
        note: log.note
      })) as TimeLog[]);
    };

    fetchLogs();

    // Supabase Sync - Atestados
    const fetchAtestados = async () => {
      const { data, error } = await supabase
        .from('medical_certificates')
        .select('*')
        .eq('user_id', user.supabaseId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching atestados:', error.message);
        return;
      }

      setAtestadosList(data.map(at => ({
        id: at.id,
        date: at.date,
        isFullDay: at.is_full_day,
        startTime: at.start_time || '',
        endTime: at.end_time || '',
        image: at.image
      })));
    };

    fetchAtestados();

    // Real-time subscription - Logs
    // Real-time subscription - Atestados
    
    return () => {
      // Subscriptions removed for compatibility with free tier
    };
  }, [user?.supabaseId]);

  // Supabase Sync - Settings
  useEffect(() => {
    if (!user || !user.supabaseId) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.supabaseId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching settings:', error.message);
        return;
      }

      if (data) {
        setSettings((prev: any) => ({
          ...prev,
          notifications: data.notifications,
          notificationPrefs: data.notification_prefs,
          theme: data.theme,
          colorPalette: data.color_palette,
          vacationMode: data.vacation_mode,
          workload: data.workload,
          tolerance: data.tolerance,
          nightShift: data.night_shift,
          bankOfHours: data.bank_of_hours,
          totalBalanceView: data.total_balance_view
        }));
      } else {
        // Initialize settings if they don't exist
        const initialSettings = {
          user_id: user.supabaseId,
          notifications: true,
          notification_prefs: { alerts: true, reminders: true, system: true },
          theme: 'system',
          color_palette: 'default',
          vacation_mode: { active: false, startDate: '', endDate: '' },
          workload: { daily: '08:00', weekly: '44:00', monthly: '176:00', break: '01:00', shiftStart: '08:00' },
          tolerance: 10,
          night_shift: { active: false, start: '22:00', end: '05:00', multiplier: 1.2 },
          bank_of_hours: { active: false, initialBalance: 0 },
          total_balance_view: 'week'
        };
        await supabase.from('settings').insert(initialSettings);
      }
    };

    fetchSettings();

    // Real-time subscription
    const subscription = supabase
      .channel('settings_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'settings',
        filter: `user_id=eq.${user.supabaseId}`
      }, () => {
        fetchSettings();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.supabaseId]);

  // Supabase Sync - Custom Shifts
  useEffect(() => {
    if (!user || !user.supabaseId) {
      setCustomShifts({});
      return;
    }

    const fetchShifts = async () => {
      const { data, error } = await supabase
        .from('custom_shifts')
        .select('*')
        .eq('user_id', user.supabaseId);

      if (error) {
        console.error('Error fetching custom shifts:', error.message);
        return;
      }

      const shifts: Record<string, any> = {};
      data.forEach(shift => {
        shifts[shift.date_key] = {
          ...shift,
          isOff: shift.is_off,
          isHoliday: shift.is_holiday,
          isVacation: shift.is_vacation,
          isMedical: shift.is_medical,
          isTraining: shift.is_training,
          isAbsence: shift.is_absence,
          isManualAdjustment: shift.is_manual_adjustment,
          isDifferentWorkload: shift.is_different_workload
        };
      });
      setCustomShifts(shifts);
    };

    fetchShifts();

    // Real-time subscription
    const subscription = supabase
      .channel('shifts_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'custom_shifts',
        filter: `user_id=eq.${user.supabaseId}`
      }, () => {
        fetchShifts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.supabaseId]);

  // Supabase Sync - Profile
  useEffect(() => {
    if (!user || !user.supabaseId) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.supabaseId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error.message);
        return;
      }

      if (data) {
        setProfileData({
          name: data.name,
          role: data.role,
          email: data.email,
          avatar: data.avatar,
          company: data.company,
          department: data.department,
          registrationNumber: data.registration_number,
          cpf: data.cpf,
          matricula: data.matricula
        });
      } else {
        const initialProfile = {
          id: user.supabaseId,
          name: user.displayName || "Usuário Chronos",
          role: "Colaborador",
          email: user.email || "",
          avatar: user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
          company: "Chronos Tech",
          department: "Desenvolvimento"
        };
        await supabase.from('profiles').insert(initialProfile);
      }
    };

    fetchProfile();

    // Real-time subscription
    const subscription = supabase
      .channel('profile_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles',
        filter: `id=eq.${user.supabaseId}`
      }, () => {
        fetchProfile();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.supabaseId]);

  // Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    // localStorage.setItem('profileData', JSON.stringify(profileData));
  }, [profileData]);

  // Requests State
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
  const [requestForm, setRequestForm] = useState({ type: 'Ajuste de Ponto', date: '', reason: '' });
  const [requestsList, setRequestsList] = useState([
    { id: 1, type: 'Ajuste de Ponto', status: 'Aprovado', desc: 'Esquecimento de registro em 02/04', color: 'emerald' },
    { id: 2, type: 'Justificativa de Falta', status: 'Pendente', desc: 'Atestado médico anexado', color: 'amber' }
  ]);

  // Special Reg Popup State
  const [showSpecialRegPopup, setShowSpecialRegPopup] = useState(false);
  const [specialRegForm, setSpecialRegForm] = useState({
    type: 'Folga',
    date: new Date(),
    reason: '',
    justification: '',
    time: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  const getDateKey = (date: Date) => {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
  };

  const getDayStatus = (date: Date) => {
    const dateKey = getDateKey(date);
    const dayOfWeek = date.getDay();
    const custom = customShifts[dateKey];
    const isOffDefault = dayOfWeek === 0 || dayOfWeek === 6;
    
    return {
      isOff: custom ? custom.isOff : isOffDefault,
      isHoliday: custom ? !!custom.isHoliday : false,
      isVacation: custom ? !!custom.isVacation : false,
      isMedical: custom ? !!custom.isMedical : false,
      isTraining: custom ? !!custom.isTraining : false,
      isAbsence: custom ? !!custom.isAbsence : false,
      isManualAdjustment: custom ? !!custom.isManualAdjustment : false,
      isDifferentWorkload: custom ? !!custom.isDifferentWorkload : false,
      shift: custom ? custom.shift : (isOffDefault ? 'Folga' : '09:00 - 18:00'),
      reason: custom ? custom.reason : '',
      justification: custom ? custom.justification : ''
    };
  };

  const isVacationActive = () => {
    if (!settings.vacationMode.active) return false;
    
    const now = new Date();
    // YYYY-MM-DD in local time
    const todayStr = now.getFullYear() + '-' + 
                    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(now.getDate()).padStart(2, '0');
    
    const startDate = settings.vacationMode.startDate;
    const endDate = settings.vacationMode.endDate;
    
    if (startDate && todayStr < startDate) return false;
    if (endDate && todayStr > endDate) return false;
    
    return true;
  };

  // Cropping State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(3 / 4);
  const [isCropping, setIsCropping] = useState(false);
  const [brightness, setBrightness] = useState(110);
  const [contrast, setContrast] = useState(150);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editHoursInput, setEditHoursInput] = useState("");
  const [editMinutesInput, setEditMinutesInput] = useState("");

  useEffect(() => {
    if (editingLog) {
      const time = new Date(editingLog.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setEditTime(time);
    }
  }, [editingLog]);

  useEffect(() => {
    if (editTime) {
      const [h, m] = editTime.split(':');
      setEditHoursInput(h || "");
      setEditMinutesInput(m || "");
    }
  }, [editTime]);

  // New Registration Flow States
  const [showRegPopup, setShowRegPopup] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingLogType, setPendingLogType] = useState<TimeLog['type'] | null>(null);
  const [shouldCapturePhoto, setShouldCapturePhoto] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [isCameraFlashOn, setIsCameraFlashOn] = useState(false);
  const [cameraCapabilities, setCameraCapabilities] = useState<any>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [regTime, setRegTime] = useState<Date>(new Date());
  const [hoursInput, setHoursInput] = useState(regTime.getHours().toString().padStart(2, '0'));
  const [minutesInput, setMinutesInput] = useState(regTime.getMinutes().toString().padStart(2, '0'));

  useEffect(() => {
    setHoursInput(regTime.getHours().toString().padStart(2, '0'));
    setMinutesInput(regTime.getMinutes().toString().padStart(2, '0'));
  }, [regTime]);
  const [regObservations, setRegObservations] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dayStatusOptions = [
    { id: 'Folga', label: 'Folga', icon: Coffee, color: 'text-brand-blue' },
    { id: 'Férias', label: 'Férias', icon: Umbrella, color: 'text-emerald-500' },
    { id: 'Atestado Médico', label: 'Atestado Médico', icon: Stethoscope, color: 'text-rose-500' },
    { id: 'Feriado', label: 'Feriado', icon: Flag, color: 'text-amber-500' },
    { id: 'Falta', label: 'Falta', icon: AlertCircle, color: 'text-rose-500' },
    { id: 'Ajuste Manual', label: 'Ajuste Manual', icon: Edit3, color: 'text-indigo-500' },
    { id: 'Carga Horária Diferente', label: 'Carga Horária', icon: Clock, color: 'text-purple-500' },
  ];

  const renderDayStatusTypeSelect = (value: string, onChange: (val: string) => void) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-10 text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-brand-blue appearance-none transition-colors"
      >
        {dayStatusOptions.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {(() => {
          const opt = dayStatusOptions.find(o => o.id === value);
          if (opt) {
            const Icon = opt.icon;
            return <Icon size={18} className={opt.color} />;
          }
          return <HelpCircle size={18} className="text-slate-400" />;
        })()}
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ChevronRight size={16} className="rotate-90" />
      </div>
    </div>
  );

  // Day Status Popup State
  const [showDayStatusPopup, setShowDayStatusPopup] = useState(false);
  const [dayStatusForm, setDayStatusForm] = useState({ type: 'Folga', reason: '' });

  if (!user) {
    return <Login />;
  }

  return (
    <ErrorBoundary>
      <LeafletInit />
      <div className="min-h-screen bg-slate-50 font-sans pb-20">
        {/* Header */}
        <div className="bg-blue-500 text-white p-4 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div className="w-8"></div>
            <h1 className="text-xl font-bold">
              {currentTab === 'ponto' ? 'Dia' : currentTab === 'menu' ? 'Menu' : 'Configurações'}
            </h1>
            <div className="flex gap-2">
              <button className="text-white"><Download size={20} /></button>
              <button className="text-white"><Plus size={20} /></button>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex justify-between items-center mb-4 bg-transparent rounded-lg p-2">
            <button className="text-white"><ChevronLeft size={20} /></button>
            <button className="text-sm font-medium">seg., 30 mar. 2026</button>
            <button className="text-white"><ChevronRight size={20} /></button>
          </div>

          {/* Work Stats */}
          <div className="grid grid-cols-3 gap-2 text-center pb-2">
            <div>
              <div className="text-xs opacity-80">Trab. no dia</div>
              <div className="text-sm font-bold">03h 39m</div>
            </div>
            <div>
              <div className="text-xs opacity-80">Saldo do dia</div>
              <div className="text-sm font-bold text-red-200">- 02h 21m</div>
            </div>
            <div>
              <div className="text-xs opacity-80">Saldo total</div>
              <div className="text-sm font-bold text-green-200">+ 176h 50m</div>
            </div>
          </div>
        </div>

        <div className="p-4">
          {currentTab === 'ponto' && (
            <div className="w-full max-w-md mx-auto space-y-6">
              {/* Timeline */}
              <div className="bg-transparent p-6 rounded-2xl shadow-none">
                {logs.length > 0 ? (
                  <div className="relative border-l-2 border-white/20 ml-4 space-y-8">
                    {logs.map((log, index) => {
                      const isInterval = log.type.includes('intervalo');
                      const isExit = log.type.includes('saída');
                      return (
                        <div key={log.id} className="relative pl-6">
                          <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${isInterval ? 'border-slate-400 bg-slate-400' : 'border-blue-500 bg-blue-500'} flex items-center justify-center`}>
                            {isExit ? <ArrowLeft size={10} className="text-white" /> : <ArrowRight size={10} className="text-white" />}
                          </div>
                          <div className="text-sm font-bold text-white">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          <div className="text-xs text-white/70">{log.type}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/80 py-10 space-y-4">
                    <Clock size={48} className="opacity-50" />
                    <p className="text-center font-medium">Ainda não foi feito registro hoje.</p>
                    <p className="text-center text-sm opacity-70">Registre seu ponto.</p>
                  </div>
                )}
              </div>
              
              {/* Digital Clock */}
              <div className="text-center text-3xl font-mono font-bold py-4 text-slate-900">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
          {currentTab !== 'ponto' && (
            <div className="flex items-center justify-center h-64 text-white/80">
              Tela {currentTab} em construção.
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 flex justify-between items-center border-t border-blue-400 px-8">
          <button onClick={() => setCurrentTab('menu')} className="flex flex-col items-center w-16">
            <MenuIcon size={24} />
            <span className="text-xs">Menu</span>
          </button>
          <button onClick={() => setCurrentTab('ponto')} className="flex flex-col items-center w-16">
            <Calendar size={24} />
            <span className="text-xs">Dia</span>
          </button>
          <button onClick={() => setCurrentTab('menu')} className="flex flex-col items-center w-16">
            <Settings size={24} />
            <span className="text-xs">Configurações</span>
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
};
