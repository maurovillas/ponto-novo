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
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Tesseract from 'tesseract.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Fix for Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

import { supabase } from './supabase';

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
            onClick={() => window.location.reload()}
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
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center);
  return null;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

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
  const [isIframe, setIsIframe] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

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

  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<'ponto' | 'historico' | 'escala' | 'menu' | 'extra_menu'>(() => {
    const saved = localStorage.getItem('chronos_tab');
    return (saved as any) || 'ponto';
  });
  const [escalaView, setEscalaView] = useState<'semanal' | 'mensal'>(() => {
    const saved = localStorage.getItem('chronos_escala_view');
    return (saved as any) || 'semanal';
  });
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
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('chronos_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing settings:", e);
      }
    }
    return {
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
    };
  });

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
    const getAnonymousUser = () => {
      let localId = localStorage.getItem('ponto_anonymous_id');
      
      if (!localId) {
        localId = crypto.randomUUID();
        localStorage.setItem('ponto_anonymous_id', localId);
      }

      // Create a virtual user object
      const virtualUser: any = {
        id: localId,
        supabaseId: localId,
        email: 'usuario@local.app',
        displayName: localStorage.getItem('ponto_user_name') || 'Usuário Local',
        photoURL: localStorage.getItem('ponto_user_avatar') || '',
        user_metadata: {
          full_name: localStorage.getItem('ponto_user_name') || 'Usuário Local',
          avatar_url: localStorage.getItem('ponto_user_avatar') || ''
        }
      };

      setUser(virtualUser);
      setIsAuthReady(true);
    };

    getAnonymousUser();
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
    if (window.confirm("Isso apenas limpará seus dados locais de identificação. Deseja continuar?")) {
      localStorage.removeItem('ponto_anonymous_id');
      localStorage.removeItem('ponto_user_name');
      localStorage.removeItem('ponto_user_avatar');
      window.location.reload();
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
    const subscription = supabase
      .channel('logs_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'logs',
        filter: `user_id=eq.${user.supabaseId}`
      }, () => {
        fetchLogs();
      })
      .subscribe();

    // Real-time subscription - Atestados
    const atestadosSubscription = supabase
      .channel('atestados_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'medical_certificates',
        filter: `user_id=eq.${user.supabaseId}`
      }, () => {
        fetchAtestados();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      atestadosSubscription.unsubscribe();
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
        setSettings(prev => ({
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
  const [profileData, setProfileData] = useState({
    name: "Usuário Chronos",
    role: "Colaborador",
    email: "",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
    company: "Chronos Tech",
    department: "Desenvolvimento"
  });

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

  const triggerFileUpload = (logId: string, mode: 'camera' | 'gallery' = 'camera') => {
    setActiveLogId(logId);
    if (mode === 'camera') {
      setCapturedImage(null);
      setIsCameraOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setBrightness(100);
        setContrast(100);
        setIsCropping(true);
        if (isCameraOpen) {
          setIsCameraOpen(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (_: any, pixelCrop: PixelCrop) => {
    setCompletedCrop(pixelCrop);
  };

  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  const extractNSR = async (imageUrl: string, logId: string) => {
    setIsProcessingOCR(true);
    try {
      const { data: { text } } = await Tesseract.recognize(imageUrl, 'por+eng');
      
      // Regex to find NSR: looks for "NSR" followed by numbers, or just a sequence that looks like NSR
      // NSR is usually a 9-digit or 10-digit number
      const nsrMatch = text.match(/(?:NSR|N\.S\.R\.|N\.S\.R|NSR:)\s*(\d{5,12})/i) || 
                       text.match(/(\d{9,10})/);
      
      if (nsrMatch) {
        const nsrCode = nsrMatch[1] || nsrMatch[0];
        if (user && user.supabaseId) {
          const { error } = await supabase
            .from('logs')
            .update({ nsr: nsrCode })
            .eq('id', logId)
            .eq('user_id', user.supabaseId);
          
          if (error) console.error('Error updating NSR:', error.message);
        }
        
        if (editingLog && editingLog.id === logId) {
          setEditingLog(prev => prev ? { ...prev, nsr: nsrCode } : null);
        }
      }
    } catch (error) {
      console.error("OCR Error:", error);
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  const uploadImage = async (base64: string, bucket: string, folder: string) => {
    try {
      if (!base64 || !base64.startsWith('data:image')) return base64;
      
      console.log(`Uploading image to bucket "${bucket}", folder "${folder}"...`);
      
      const base64Data = base64.split(',')[1];
      const binaryData = atob(base64Data);
      const array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        array[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([array], { type: 'image/jpeg' });
      
      const fileName = `${user?.supabaseId || 'anonymous'}/${folder}/${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log("Upload successful. Public URL:", publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image to storage:', error);
      // If storage fails, we fallback to base64 but warn the user
      console.warn("Falling back to Base64 storage due to upload error.");
      return base64;
    }
  };

  const saveCroppedImage = async () => {
    if (imageToCrop && completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
      try {
        setIsSavingPhoto(true);
        console.log("Starting saveCroppedImage...");
        // Get the image element to calculate scaling
        const img = document.querySelector('.ReactCrop img') as HTMLImageElement;
        if (!img) {
          console.error("Crop image element not found");
          setIsSavingPhoto(false);
          return;
        }

        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;

        const scaledCrop = {
          x: completedCrop.x * scaleX,
          y: completedCrop.y * scaleY,
          width: completedCrop.width * scaleX,
          height: completedCrop.height * scaleY
        };

        console.log("Generating cropped image...");
        const croppedImage = await getCroppedImg(imageToCrop, scaledCrop, rotation, brightness, contrast);
        console.log("Cropped image generated. Size:", Math.round(croppedImage.length / 1024), "KB");
        
        // Upload to Supabase Storage first
        const imageUrl = await uploadImage(croppedImage, 'tickets', 'logs');
        
        if (activeLogId && user && user.supabaseId) {
          console.log("Updating existing log:", activeLogId);
          const { error } = await supabase
            .from('logs')
            .update({ ticket_image: imageUrl })
            .eq('id', activeLogId)
            .eq('user_id', user.supabaseId);
          
          if (error) {
            console.error('Error updating ticket image:', error);
            alert('Erro ao salvar foto: ' + error.message);
          } else {
            console.log("Log updated successfully in Supabase");
          }
          
          if (editingLog && editingLog.id === activeLogId) {
            setEditingLog(prev => prev ? { ...prev, ticketImage: imageUrl } : null);
          }
          
          // Start OCR extraction
          extractNSR(croppedImage, activeLogId);
          
          setActiveLogId(null);
        } else {
          console.log("Creating new registration with photo");
          // It's a new registration
          await completeRegistration(imageUrl);
        }

        setIsCropping(false);
        setImageToCrop(null);
        setRotation(0);
        setZoom(1);
        setAspect(3 / 4);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (e) {
        console.error("Error in saveCroppedImage:", e);
        alert("Erro ao processar imagem: " + (e instanceof Error ? e.message : String(e)));
      } finally {
        setIsSavingPhoto(false);
      }
    }
  };

  const [escalaDate, setEscalaDate] = useState(new Date());
  const [editingSchedule, setEditingSchedule] = useState<{ date: string; shift: string; isOff: boolean; isHoliday: boolean; day: string } | null>(null);
  const [customShifts, setCustomShifts] = useState<Record<string, { 
    shift: string; 
    isOff: boolean; 
    isHoliday?: boolean;
    isVacation?: boolean;
    isMedical?: boolean;
    isTraining?: boolean;
    isAbsence?: boolean;
    isManualAdjustment?: boolean;
    isDifferentWorkload?: boolean;
    reason?: string;
    justification?: string;
  }>>({});

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const generateMonthlySchedule = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysCount = getDaysInMonth(year, month);
    
    return Array.from({ length: daysCount }, (_, i) => {
      const dayNum = i + 1;
      const date = new Date(year, month, dayNum);
      const dayOfWeek = date.getDay();
      const dateKey = getDateKey(date);
      const custom = customShifts[dateKey];
      
      const isOffDefault = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = date.toDateString() === new Date().toDateString();
      
      return {
        day: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayOfWeek],
        date: `${dayNum.toString().padStart(2, '0')} ${months[month].substring(0, 3)}`,
        fullDate: dateKey,
        shift: custom ? custom.shift : (isOffDefault ? 'Folga' : '09:00 - 18:00'),
        isOff: custom ? custom.isOff : isOffDefault,
        isHoliday: custom ? !!custom.isHoliday : false,
        isToday,
        isCustom: !!custom
      };
    });
  };

  const monthlySchedule = generateMonthlySchedule(escalaDate);

  const getWeeklySchedule = (baseDate: Date) => {
    const startOfWeek = new Date(baseDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    startOfWeek.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayOfWeek = date.getDay();
      const dateKey = getDateKey(date);
      const custom = customShifts[dateKey];
      
      const isOffDefault = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = date.toDateString() === new Date().toDateString();
      
      return {
        day: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayOfWeek],
        date: `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()].substring(0, 3)}`,
        fullDate: dateKey,
        shift: custom ? custom.shift : (isOffDefault ? 'Folga' : '09:00 - 18:00'),
        isOff: custom ? custom.isOff : isOffDefault,
        isHoliday: custom ? !!custom.isHoliday : false,
        isVacation: custom ? !!custom.isVacation : false,
        isMedical: custom ? !!custom.isMedical : false,
        isAbsence: custom ? !!custom.isAbsence : false,
        isManualAdjustment: custom ? !!custom.isManualAdjustment : false,
        isDifferentWorkload: custom ? !!custom.isDifferentWorkload : false,
        isToday,
        isCustom: !!custom
      };
    });
  };

  const cleanObject = (obj: any) => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => {
      if (newObj[key] === undefined) {
        delete newObj[key];
      }
    });
    return newObj;
  };

  const saveProfile = async (newProfile: any) => {
    if (!user || !user.supabaseId) return;
    
    const dbProfile = {
      id: user.supabaseId,
      name: newProfile.name,
      role: newProfile.role,
      email: newProfile.email,
      avatar: newProfile.avatar,
      company: newProfile.company,
      department: newProfile.department,
      registration_number: newProfile.registrationNumber,
      cpf: newProfile.cpf,
      matricula: newProfile.matricula,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(cleanObject(dbProfile));
    
    if (error) {
      console.error('Error saving profile:', error.message);
      if (error.message.includes('row-level security policy')) {
        alert('Erro de Permissão (RLS): Você precisa desativar o RLS no Supabase. Veja o arquivo "supabase_setup.sql".');
      }
    } else {
      // Update local storage and virtual user state
      localStorage.setItem('ponto_user_name', newProfile.name);
      localStorage.setItem('ponto_user_avatar', newProfile.avatar || '');
      setUser(prev => prev ? { ...prev, displayName: newProfile.name, photoURL: newProfile.avatar } : null);
    }
  };

  const saveSettings = async (newSettings: any) => {
    if (!user || !user.supabaseId) return;

    const dbSettings = {
      user_id: user.supabaseId,
      notifications: newSettings.notifications,
      notification_prefs: newSettings.notificationPrefs,
      theme: newSettings.theme,
      color_palette: newSettings.colorPalette,
      vacation_mode: newSettings.vacationMode,
      workload: newSettings.workload,
      tolerance: newSettings.tolerance,
      night_shift: newSettings.nightShift,
      bank_of_hours: newSettings.bankOfHours,
      total_balance_view: newSettings.totalBalanceView,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('settings')
      .upsert(cleanObject(dbSettings));

    if (error) {
      console.error('Error saving settings:', error.message);
      if (error.message.includes('row-level security policy')) {
        alert('Erro de Permissão (RLS): Você precisa desativar o RLS no Supabase. Veja o arquivo "supabase_setup.sql".');
      }
    }
  };

  const schedule = getWeeklySchedule(escalaDate);

  const saveCustomShift = async (dateKey: string, shift: string, isOff: boolean, isHoliday: boolean) => {
    if (!user || !user.supabaseId) return;
    const date = new Date(dateKey + 'T12:00:00');
    const dayOfWeek = date.getDay();
    const isOffDefault = dayOfWeek === 0 || dayOfWeek === 6;
    const defaultShift = isOffDefault ? 'Folga' : '09:00 - 18:00';

    // Se o novo valor for igual ao padrão, removemos a customização
    if (isOff === isOffDefault && (isOff || shift === defaultShift) && !isHoliday) {
      const { error } = await supabase
        .from('custom_shifts')
        .delete()
        .eq('user_id', user.supabaseId)
        .eq('date_key', dateKey);
      
      if (error) console.error('Error deleting custom shift:', error.message);
    } else {
      // Hierarchy: Special registrations override normal logs
      const dateStr = date.toDateString();
      const logsToDelete = logs.filter(l => l.timestamp.toDateString() === dateStr);
      
      if (logsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('logs')
          .delete()
          .in('id', logsToDelete.map(l => l.id));
        
        if (deleteError) console.error('Error deleting logs for custom shift:', deleteError.message);
      }
      
      const { error } = await supabase
        .from('custom_shifts')
        .upsert({ 
          user_id: user.supabaseId, 
          date_key: dateKey, 
          shift, 
          is_off: isOff, 
          is_holiday: isHoliday 
        });

      if (error) {
        console.error('Error saving custom shift:', error.message);
        if (error.message.includes('row-level security policy')) {
          alert('Erro de Permissão (RLS): Você precisa desativar o RLS no Supabase. Veja o arquivo "supabase_setup.sql".');
        }
      }
    }

    setEditingSchedule(null);
    setSuccessMessage({ 
      title: "Escala Atualizada!", 
      sub: "As alterações foram salvas com sucesso." 
    });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  // Update clock every second and check for notifications
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!settings.notificationPrefs?.reminders) return;

    const now = new Date();
    const timeKey = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    if (lastNotifiedTime === timeKey) return;

    // Calculate expected times for today
    const today = new Date();
    const dateStr = today.toDateString();
    const dayLogs = logs.filter(l => l.timestamp.toDateString() === dateStr)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const workloadMs = parseTimeToMs(settings.workload.daily);
    const breakMs = parseTimeToMs(settings.workload.break);
    const shiftStart = settings.workload.shiftStart || '08:00';

    const realIn = dayLogs.find(l => l.type === 'in');
    const realBreakStart = dayLogs.find(l => l.type === 'break_start');
    const realBreakEnd = dayLogs.find(l => l.type === 'break_end');
    const realOut = dayLogs.find(l => l.type === 'out');

    let nextExpectedTime: Date | null = null;
    let nextLabel = "";

    if (!realIn) {
      nextExpectedTime = parseTimeToDate(shiftStart, today);
      nextLabel = "Entrada";
    } else if (!realBreakStart) {
      nextExpectedTime = new Date(realIn.timestamp.getTime() + workloadMs / 2);
      nextLabel = "Saída Intervalo";
    } else if (!realBreakEnd) {
      nextExpectedTime = new Date(realBreakStart.timestamp.getTime() + breakMs);
      nextLabel = "Retorno Intervalo";
    } else if (!realOut) {
      const workedFirstTurnMs = realBreakStart.timestamp.getTime() - realIn.timestamp.getTime();
      const remainingWorkloadMs = Math.max(0, workloadMs - workedFirstTurnMs);
      nextExpectedTime = new Date(realBreakEnd.timestamp.getTime() + remainingWorkloadMs);
      nextLabel = "Saída";
    }

    if (nextExpectedTime) {
      const expTimeKey = `${nextExpectedTime.getHours().toString().padStart(2, '0')}:${nextExpectedTime.getMinutes().toString().padStart(2, '0')}`;
      
      if (timeKey === expTimeKey) {
        // PLAY SOUND
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Audio play failed", e));

        // SHOW NOTIFICATION
        setSuccessMessage({ 
          title: "Lembrete de Ponto", 
          sub: `Está na hora de registrar sua ${nextLabel}!` 
        });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
        
        setLastNotifiedTime(timeKey);
      }
    }
  }, [currentTime, logs, settings, lastNotifiedTime]);

  useEffect(() => {
    localStorage.setItem('chronos_tab', currentTab);
    if (currentTab !== 'menu') {
      setMenuView('main');
    }
  }, [currentTab]);

  useEffect(() => {
    localStorage.setItem('chronos_escala_view', escalaView);
  }, [escalaView]);

  // Click outside month picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    };

    if (isMonthPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMonthPickerOpen]);

  // Theme Effect
  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    applyTheme(settings.theme || 'system');

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  // Color Palette Effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.colorPalette && settings.colorPalette !== 'default') {
      root.setAttribute('data-theme', settings.colorPalette);
    } else {
      root.removeAttribute('data-theme');
    }
  }, [settings.colorPalette]);

  // Geolocation logic
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocalização não suportada pelo navegador.");
      return;
    }

    const options = {
      enableHighAccuracy: isHighAccuracy,
      timeout: 5000,
      maximumAge: 0
    };

    const success = (pos: GeolocationPosition) => {
      setUserCoords([pos.coords.latitude, pos.coords.longitude]);
      setLocationError(null);
    };

    const error = (err: GeolocationPositionError) => {
      setLocationError(`Erro ao obter localização: ${err.message}`);
    };

    const watchId = navigator.geolocation.watchPosition(success, error, options);
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isHighAccuracy]);

  useEffect(() => {
    if (!settings.notifications || !settings.notificationPrefs?.alerts) return;
    
    const status = getDayStatus(new Date());
    if (status.isHoliday || status.isOff) {
      setDayAlertMessage({
        title: status.isHoliday ? 'Hoje é Feriado' : 'Hoje é sua Folga',
        sub: status.isHoliday ? 'Aproveite o feriado ou registre seu ponto se houver expediente.' : 'Dia de descanso programado na sua escala.',
        type: status.isHoliday ? 'holiday' : 'off'
      });
      setShowDayAlert(true);
      const timer = setTimeout(() => setShowDayAlert(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [settings.notifications, settings.notificationPrefs?.alerts]);

  useEffect(() => {
    if (isCameraOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      if (isCameraOpen) stopCamera();
    };
  }, [isCameraOpen, capturedImage]);

  useEffect(() => {
    if (cameraStream && cameraCapabilities) {
      const track = cameraStream.getVideoTracks()[0];
      const constraints: any = { advanced: [] };
      
      if (cameraCapabilities.zoom) {
        constraints.advanced.push({ zoom: cameraZoom });
      }
      if (cameraCapabilities.torch) {
        constraints.advanced.push({ torch: isCameraFlashOn });
      }

      if (constraints.advanced.length > 0) {
        track.applyConstraints(constraints).catch(e => console.error("Error applying constraints", e));
      }
    }
  }, [cameraZoom, isCameraFlashOn, cameraStream, cameraCapabilities]);

  // Auth Logic - MOVED BELOW HOOKS TO COMPLY WITH RULES OF HOOKS
  if (!isAuthReady) {
    return (
      <div className="h-screen h-[100dvh] min-h-[-webkit-fill-available] bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const calculateDayStats = (dayLogs: TimeLog[], date: Date, isToday: boolean) => {
    let workedMs = 0;
    let breakMs = 0;
    let lastIn: number | null = null;
    let lastBreakStart: number | null = null;
    
    let hasFeriadoObs = false;
    let hasFolgaFeriadoObs = false;

    dayLogs.forEach(log => {
      const time = log.timestamp.getTime();
      if (log.type === 'in') {
        lastIn = time;
      } else if (log.type === 'break_start') {
        if (lastIn) {
          workedMs += time - lastIn;
          lastIn = null;
        }
        lastBreakStart = time;
      } else if (log.type === 'break_end') {
        if (lastBreakStart) {
          breakMs += time - lastBreakStart;
          lastBreakStart = null;
        }
        lastIn = time;
      } else if (log.type === 'out') {
        if (lastIn) {
          workedMs += time - lastIn;
          lastIn = null;
        }
        if (lastBreakStart) {
          breakMs += time - lastBreakStart;
          lastBreakStart = null;
        }
      } else if (log.type === 'manual_adjustment') {
        workedMs += log.workedMs || 0;
      }
      
      const obs = log.observations?.toLowerCase() || '';
      if (obs.includes('folga do feriado')) {
        hasFolgaFeriadoObs = true;
      } else if (obs.includes('feriado')) {
        hasFeriadoObs = true;
      }
    });

    if (isToday) {
      const now = currentTime.getTime();
      if (lastIn) {
        workedMs += now - lastIn;
      }
      if (lastBreakStart) {
        breakMs += now - lastBreakStart;
      }
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const isFuture = date > today;

    if (isFuture) {
      return { workedMs: 0, breakMs: 0, expectedMs: 0 };
    }

    const status = getDayStatus(date);
    const workloadMs = parseTimeToMs(settings.workload.daily || '06:00');
    let expectedMs = 0;
    
    // If it's a regular workday OR an absence, we expect the workload
    const isRegularWorkDay = !status.isOff && !status.isHoliday && !status.isVacation && !status.isMedical;
    
    if (isRegularWorkDay || status.isAbsence) {
      expectedMs = workloadMs;
    }

    // Apply Tolerance
    const toleranceMs = (settings.tolerance || 0) * 60000;
    let balanceMs = workedMs - expectedMs;
    
    let finalWorkedMs = workedMs;
    if (Math.abs(balanceMs) <= toleranceMs) {
      finalWorkedMs = expectedMs;
      balanceMs = 0;
    }

    // Custom Bank of Hours Logic
    const isWeekday = date.getDay() > 0 && date.getDay() < 6;
    
    if (status.isHoliday && workedMs > 0) {
      // Worked on Holiday -> +12h balance
      expectedMs = finalWorkedMs - (12 * 3600000);
    } else if (status.isOff && !status.isHoliday && workedMs > 0) {
      // Worked on Normal Day Off -> +6h balance
      expectedMs = finalWorkedMs - (6 * 3600000);
    } else if (isWeekday && workedMs === 0 && (hasFolgaFeriadoObs || hasFeriadoObs)) {
      // Day Off not according to schedule (weekday) with observation "folga do feriado" or "feriado" -> -6h balance
      expectedMs = 6 * 3600000;
    }

    return { workedMs: finalWorkedMs, breakMs, expectedMs };
  };

  const getTodayStats = (date: Date = selectedDate) => {
    const dateStr = date.toDateString();
    const isToday = dateStr === new Date().toDateString();
    const todayLogs = logs.filter(l => l.timestamp.toDateString() === dateStr)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const { workedMs, breakMs, expectedMs } = calculateDayStats(todayLogs, date, isToday);

    const formatDuration = (ms: number) => {
      const hours = Math.floor(Math.abs(ms) / 3600000);
      const minutes = Math.floor((Math.abs(ms) % 3600000) / 60000);
      return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
    };

    const balanceMs = workedMs - expectedMs;
    const balanceSign = balanceMs >= 0 ? '+' : '-';
    
    return {
      worked: formatDuration(workedMs),
      break: formatDuration(breakMs),
      balance: `${balanceSign}${formatDuration(Math.abs(balanceMs))}`,
      expected: formatDuration(expectedMs)
    };
  };

  const getMonthlyStats = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    
    const lastDay = isCurrentMonth ? now.getDate() : new Date(year, month + 1, 0).getDate();
    
    // Find the first log date to start calculations from there
    const firstLog = logs.length > 0 ? logs.reduce((prev, curr) => prev.timestamp < curr.timestamp ? prev : curr) : null;
    const firstLogDate = firstLog ? new Date(firstLog.timestamp) : null;
    if (firstLogDate) firstLogDate.setHours(0, 0, 0, 0);

    // Group logs by day for the selected month
    const monthLogs = logs.filter(l => 
      l.timestamp.getMonth() === month && 
      l.timestamp.getFullYear() === year
    );
    const logsByDay: { [key: string]: TimeLog[] } = {};
    monthLogs.forEach(log => {
      const key = log.timestamp.toDateString();
      if (!logsByDay[key]) logsByDay[key] = [];
      logsByDay[key].push(log);
    });

    let totalWorkedMs = 0;
    let totalExpectedMs = 0;
    let totalBalanceMs = 0;
    let extraHoursMs = 0;
    let missingHoursMs = 0;

    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      
      // Only start counting from the first log date
      if (firstLogDate && date < firstLogDate) continue;

      const dateKey = date.toDateString();
      const dayLogs = (logsByDay[dateKey] || []).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const isToday = isCurrentMonth && d === now.getDate();
      const { workedMs, expectedMs } = calculateDayStats(dayLogs, date, isToday);
      
      totalWorkedMs += workedMs;
      totalExpectedMs += expectedMs;
      const dayBalance = workedMs - expectedMs;
      totalBalanceMs += dayBalance;
      
      if (dayBalance > 0) {
        extraHoursMs += dayBalance;
      } else if (dayBalance < 0) {
        missingHoursMs += Math.abs(dayBalance);
      }
    }

    const formatDuration = (ms: number) => {
      const absMs = Math.abs(ms);
      const hours = Math.floor(absMs / 3600000);
      const minutes = Math.floor((absMs % 3600000) / 60000);
      return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
    };

    return {
      worked: formatDuration(totalWorkedMs),
      expected: formatDuration(totalExpectedMs),
      balance: (totalBalanceMs >= 0 ? '+' : '-') + formatDuration(Math.abs(totalBalanceMs)),
      extra: formatDuration(extraHoursMs),
      missing: formatDuration(missingHoursMs)
    };
  };

  const getBankOfHoursBalance = () => {
    if (!settings.bankOfHours?.active) return null;
    
    const firstLog = logs.length > 0 ? logs.reduce((prev, curr) => prev.timestamp < curr.timestamp ? prev : curr) : null;
    let totalBalanceMs = settings.bankOfHours.initialBalance || 0;
    
    if (!firstLog) {
      const absMs = Math.abs(totalBalanceMs);
      const hours = Math.floor(absMs / 3600000);
      const minutes = Math.floor((absMs % 3600000) / 60000);
      const sign = totalBalanceMs >= 0 ? '+' : '-';
      return `${sign}${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
    }
    
    const firstLogDate = new Date(firstLog.timestamp);
    firstLogDate.setHours(0, 0, 0, 0);
    
    const now = new Date();
    const logsByDay: { [key: string]: TimeLog[] } = {};
    logs.forEach(log => {
      const key = log.timestamp.toDateString();
      if (!logsByDay[key]) logsByDay[key] = [];
      logsByDay[key].push(log);
    });
    
    const currentDay = new Date(firstLogDate);
    while (currentDay <= now) {
      const dateKey = currentDay.toDateString();
      const dayLogs = (logsByDay[dateKey] || []).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const isToday = currentDay.toDateString() === now.toDateString();
      const { workedMs, expectedMs } = calculateDayStats(dayLogs, currentDay, isToday);
      totalBalanceMs += (workedMs - expectedMs);
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    const absMs = Math.abs(totalBalanceMs);
    const hours = Math.floor(absMs / 3600000);
    const minutes = Math.floor((absMs % 3600000) / 60000);
    const sign = totalBalanceMs >= 0 ? '+' : '-';
    return `${sign}${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const handleImportPontoFacil = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const newLogs: any[] = [];
      
      for (const line of lines) {
        // Look for a date like DD/MM/YYYY or YYYY-MM-DD
        const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})/) || line.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!dateMatch) continue;
        
        let year, month, day;
        if (dateMatch[0].includes('/')) {
          day = parseInt(dateMatch[1]);
          month = parseInt(dateMatch[2]) - 1;
          year = parseInt(dateMatch[3]);
        } else {
          year = parseInt(dateMatch[1]);
          month = parseInt(dateMatch[2]) - 1;
          day = parseInt(dateMatch[3]);
        }
        
        // Find all times in the line (HH:MM)
        const timeMatches = line.match(/\b([0-1][0-9]|2[0-3]):([0-5][0-9])\b/g);
        if (!timeMatches) continue;
        
        // Sort times chronologically
        timeMatches.sort();
        
        const types: TimeLog['type'][] = ['in', 'break_start', 'break_end', 'out'];
        
        timeMatches.forEach((timeStr, index) => {
          if (index >= 4) return; // Only support up to 4 punches per day
          
          const [hours, minutes] = timeStr.split(':').map(Number);
          const logDate = new Date(year, month, day, hours, minutes, 0);
          
          const logId = `imported_${logDate.getTime()}_${index}`;
          
          // Check if log already exists at this exact minute to avoid duplicates
          const exists = logs.some(l => 
            l.timestamp.getFullYear() === year &&
            l.timestamp.getMonth() === month &&
            l.timestamp.getDate() === day &&
            l.timestamp.getHours() === hours &&
            l.timestamp.getMinutes() === minutes
          );

          if (!exists) {
            newLogs.push({
              id: logId,
              type: types[index],
              timestamp: logDate.toISOString(),
              location: 'Importado do Ponto Fácil',
              user_id: user.supabaseId,
              observations: 'Importado do Ponto Fácil'
            });
          }
        });
      }
      
      if (newLogs.length > 0) {
        if (window.confirm(`Encontramos ${newLogs.length} novas marcações no arquivo. Deseja importar para o seu ponto?`)) {
          try {
            const logsToInsert = newLogs.map(log => ({
              user_id: user.supabaseId,
              type: log.type,
              timestamp: log.timestamp,
              location: log.location,
              observations: log.observations
            }));

            const { error } = await supabase
              .from('logs')
              .insert(logsToInsert);

            if (error) {
              if (error.message.includes('row-level security policy')) {
                alert('Erro de Permissão (RLS): Você precisa desativar o RLS no Supabase. Veja o arquivo "supabase_setup.sql".');
              } else {
                throw error;
              }
              return;
            }
            
            alert('Importação concluída com sucesso!');
          } catch (error: any) {
            console.error("Erro ao importar:", error.message);
            alert('Ocorreu um erro ao importar as marcações.');
          }
        }
      } else {
        alert('Não foi possível encontrar novas marcações válidas no arquivo. Talvez elas já tenham sido importadas ou o formato não é suportado.');
      }
      
      // Reset input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const exportToCSV = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthName = months[month];
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data,Entrada,Saida Intervalo,Retorno Intervalo,Saida,Trabalhado,Esperado,Saldo\n";
    
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toLocaleDateString('pt-BR');
      const dayLogs = logs.filter(l => l.timestamp.toDateString() === date.toDateString())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const { workedMs, expectedMs } = calculateDayStats(dayLogs, date, false);
      const balanceMs = workedMs - expectedMs;
      
      const formatTime = (type: string) => {
        const log = dayLogs.find(l => l.type === type);
        return log ? log.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "";
      };
      
      const formatDurationCSV = (ms: number) => {
        const absMs = Math.abs(ms);
        const hours = Math.floor(absMs / 3600000);
        const minutes = Math.floor((absMs % 3600000) / 60000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      };
      
      const row = [
        dateStr,
        formatTime('in'),
        formatTime('break_start'),
        formatTime('break_end'),
        formatTime('out'),
        formatDurationCSV(workedMs),
        formatDurationCSV(expectedMs),
        (balanceMs >= 0 ? "" : "-") + formatDurationCSV(balanceMs)
      ].join(",");
      
      csvContent += row + "\n";
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Espelho_Ponto_${monthName}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getWeeklyStats = (baseDate: Date) => {
    const now = new Date();
    // Start of week based on settings
    const startOfWeek = new Date(baseDate);
    const dayOfWeek = baseDate.getDay();
    const offset = settings.weekStart === 'monday' ? (dayOfWeek === 0 ? 6 : dayOfWeek - 1) : dayOfWeek;
    startOfWeek.setDate(baseDate.getDate() - offset);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const logsInWeek = logs.filter(l => 
      l.timestamp >= startOfWeek && 
      l.timestamp <= endOfWeek
    );

    const logsByDay: { [key: string]: TimeLog[] } = {};
    logsInWeek.forEach(log => {
      const key = log.timestamp.toDateString();
      if (!logsByDay[key]) logsByDay[key] = [];
      logsByDay[key].push(log);
    });

    let totalWorkedMs = 0;
    let totalExpectedMs = 0;
    let totalBalanceMs = 0;
    let extraHoursMs = 0;
    let missingHoursMs = 0;

    for (let d = 0; d < 7; d++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + d);
      
      const dateKey = date.toDateString();
      const dayLogs = (logsByDay[dateKey] || []).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const isToday = date.toDateString() === now.toDateString();
      const { workedMs, expectedMs } = calculateDayStats(dayLogs, date, isToday);
      
      totalWorkedMs += workedMs;
      totalExpectedMs += expectedMs;
      const dayBalance = workedMs - expectedMs;
      totalBalanceMs += dayBalance;
      
      if (dayBalance > 0) {
        extraHoursMs += dayBalance;
      } else if (dayBalance < 0) {
        missingHoursMs += Math.abs(dayBalance);
      }
    }

    const formatDuration = (ms: number) => {
      const absMs = Math.abs(ms);
      const hours = Math.floor(absMs / 3600000);
      const minutes = Math.floor((absMs % 3600000) / 60000);
      return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
    };

    return {
      worked: formatDuration(totalWorkedMs),
      expected: formatDuration(totalExpectedMs),
      balance: (totalBalanceMs >= 0 ? '+' : '-') + formatDuration(Math.abs(totalBalanceMs)),
      extra: formatDuration(extraHoursMs),
      missing: formatDuration(missingHoursMs)
    };
  };

  const handleShare = async () => {
    const stats = getTodayStats();
    const dateStr = formatDate(new Date());
    const shareText = `Resumo do Ponto - ${dateStr}\n\n` +
      `Trabalhado: ${stats.worked}\n` +
      `Intervalo: ${stats.break}\n` +
      `Saldo: ${stats.balance}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meu Ponto Chronos',
          text: shareText,
        });
      } catch (err: any) {
        const errorStr = String(err);
        if (err?.name !== 'AbortError' && !errorStr.includes('Share canceled') && !errorStr.includes('cancel') && !(err?.message && err.message.includes('Share canceled'))) {
          console.error('Erro ao compartilhar:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setSuccessMessage({ 
          title: "Copiado!", 
          sub: "Resumo copiado para a área de transferência." 
        });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } catch (err) {
        console.error('Erro ao copiar:', err);
      }
    }
  };

  const resetBalance = async (period: 'week' | 'month') => {
    if (!user || !user.supabaseId) return;
    
    // Calculate current balance
    const stats = period === 'week' ? getWeeklyStats(new Date()) : getMonthlyStats(new Date());
    
    // Parse balance string (e.g., "+01h 30m" or "-01h 30m")
    const balanceSign = stats.balance.startsWith('+') ? 1 : -1;
    const match = stats.balance.slice(1).match(/(\d+)h\s*(\d+)m/);
    if (!match) return;
    
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const balanceMs = balanceSign * (hours * 3600000 + minutes * 60000);
    
    if (balanceMs === 0) return;

    // Add a log entry to adjust the balance
    const adjustmentLog = {
      user_id: user.supabaseId,
      timestamp: new Date().toISOString(),
      type: 'manual_adjustment' as const,
      observations: `Ajuste de saldo ${period === 'week' ? 'Semanal' : 'Mensal'}`,
      location: 'Ajuste Manual'
    };
    
    const { error } = await supabase
      .from('logs')
      .insert(adjustmentLog);

    if (error) {
      console.error('Error resetting balance:', error.message);
      if (error.message.includes('row-level security policy')) {
        alert('Erro de Permissão (RLS): Você precisa desativar o RLS no Supabase. Veja o arquivo "supabase_setup.sql".');
      }
      return;
    }

    setSuccessMessage({ title: "Saldo Zerado", sub: `O saldo ${period === 'week' ? 'semanal' : 'mensal'} foi resetado com sucesso.` });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const stats = getTodayStats();

  const getTotalBalance = () => {
    const now = new Date();
    const isWeek = settings.totalBalanceView === 'week';
    
    let startDate: Date;
    if (isWeek) {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
    }

    // Find the first log date to start calculations from there
    const firstLog = logs.length > 0 ? logs.reduce((prev, curr) => prev.timestamp < curr.timestamp ? prev : curr) : null;
    const firstLogDate = firstLog ? new Date(firstLog.timestamp) : null;
    if (firstLogDate) firstLogDate.setHours(0, 0, 0, 0);

    // Group logs by day for the selected period
    const periodLogs = logs.filter(l => l.timestamp >= startDate);
    const logsByDay: { [key: string]: TimeLog[] } = {};
    periodLogs.forEach(log => {
      const key = log.timestamp.toDateString();
      if (!logsByDay[key]) logsByDay[key] = [];
      logsByDay[key].push(log);
    });

    let totalBalanceMs = 0;
    const currentDay = new Date(startDate);

    while (currentDay <= now) {
      // Only start counting from the first log date
      if (firstLogDate && currentDay < firstLogDate) {
        currentDay.setDate(currentDay.getDate() + 1);
        continue;
      }

      const dateKey = currentDay.toDateString();
      const dayLogs = (logsByDay[dateKey] || []).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const isToday = dateKey === now.toDateString();
      const { workedMs, expectedMs } = calculateDayStats(dayLogs, currentDay, isToday);
      totalBalanceMs += (workedMs - expectedMs);
      
      currentDay.setDate(currentDay.getDate() + 1);
    }

    const formatDuration = (ms: number) => {
      const absMs = Math.abs(ms);
      const hours = Math.floor(absMs / 3600000);
      const minutes = Math.floor((absMs % 3600000) / 60000);
      return `${ms >= 0 ? '+' : '-'}${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
    };

    return formatDuration(totalBalanceMs);
  };

  const totalBalance = getTotalBalance();

  const generateAndSharePDF = async (targetDate?: Date) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Title
      doc.setFontSize(18);
      doc.text("Espelho de Ponto", 14, 22);
      
      // Subtitle
      doc.setFontSize(11);
      doc.setTextColor(100);
      
      let periodText = "";
      let start = new Date();
      let end = new Date();
      
      if (targetDate) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
        periodText = `Mês: ${months[month]}/${year}`;
      } else if (espelhoFilterType === 'month' && espelhoMonth) {
        const [year, month] = espelhoMonth.split('-');
        start = new Date(parseInt(year), parseInt(month) - 1, 1);
        end = new Date(parseInt(year), parseInt(month), 0);
        periodText = `Mês: ${month}/${year}`;
      } else if (espelhoFilterType === 'period' && espelhoStartDate && espelhoEndDate) {
        start = new Date(espelhoStartDate + 'T00:00:00');
        end = new Date(espelhoEndDate + 'T23:59:59');
        periodText = `Período: ${new Date(espelhoStartDate).toLocaleDateString()} a ${new Date(espelhoEndDate).toLocaleDateString()}`;
      }
      
      doc.text(`Funcionário: ${profileData.name}`, 14, 30);
      doc.text(`Matrícula: ${profileData.matricula}`, 14, 36);
      doc.text(periodText, 14, 42);
      
      // Filter logs
      const filteredLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Group by day
      const logsByDay: Record<string, typeof logs> = {};
      filteredLogs.forEach(log => {
        const dateStr = new Date(log.timestamp).toLocaleDateString();
        if (!logsByDay[dateStr]) logsByDay[dateStr] = [];
        logsByDay[dateStr].push(log);
      });
      
      // Table data
      const tableData = [];
      
      // Iterate through all days in the period
      let currentDay = new Date(start);
      const weekdays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
      
      while (currentDay <= end) {
        const dateStr = currentDay.toLocaleDateString();
        const dayOfWeek = weekdays[currentDay.getDay()];
        const day = String(currentDay.getDate()).padStart(2, '0');
        const month = String(currentDay.getMonth() + 1).padStart(2, '0');
        const displayDate = `${dayOfWeek}\n${day}/${month}`;

        const dayLogs = logsByDay[dateStr] || [];
        const status = getDayStatus(currentDay);
        
        let typeStr = "Normal";
        if (status.isHoliday) typeStr = "Feriado";
        else if (status.isOff) typeStr = "Folga";
        else if (status.isVacation) typeStr = "Férias";
        else if (status.isMedical) typeStr = "Atestado";
        else if (status.isAbsence) typeStr = "Falta";
        
        const in1 = dayLogs.find(l => l.type === 'in')?.timestamp;
        const out1 = dayLogs.find(l => l.type === 'break_start')?.timestamp;
        const in2 = dayLogs.find(l => l.type === 'break_end')?.timestamp;
        const out2 = dayLogs.find(l => l.type === 'out')?.timestamp;
        
        const typeLabels: Record<string, string> = {
          'in': 'Entrada',
          'break_start': 'Saída Intervalo',
          'break_end': 'Retorno Intervalo',
          'out': 'Saída',
          'manual_adjustment': 'Ajuste Manual'
        };

        const obsList = dayLogs.map(l => {
          const label = typeLabels[l.type] || l.type;
          return l.observations ? `${label}: ${l.observations}` : label;
        });
        const obsStr = obsList.length > 0 ? obsList.join(' | ') : '-';
        
        const formatTime = (d?: Date) => d ? new Date(d).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
        
        tableData.push([
          displayDate,
          typeStr,
          formatTime(in1),
          formatTime(out1),
          formatTime(in2),
          formatTime(out2),
          obsStr
        ]);
        
        currentDay.setDate(currentDay.getDate() + 1);
      }
      
      autoTable(doc, {
        startY: 50,
        head: [['Data', 'Tipo', 'Entrada', 'Saída Pausa', 'Retorno Pausa', 'Saída', 'Observações']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          6: { cellWidth: 60 } // Adjust width for Observações
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });
      
      // Generate Blob
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `espelho_ponto_${profileData.name.replace(/\\s+/g, '_')}.pdf`, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Espelho de Ponto',
          text: 'Segue o espelho de ponto gerado pelo aplicativo.',
          files: [file]
        });
      } else {
        // Fallback to download
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setSuccessMessage({ title: "Espelho Gerado", sub: "O espelho de ponto foi salvo no seu dispositivo." });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error: any) {
      const errorStr = String(error);
      if (error?.name === 'AbortError' || errorStr.includes('Share canceled') || errorStr.includes('cancel') || (error?.message && error.message.includes('Share canceled'))) {
        return; // User cancelled the share dialog
      }
      console.error("Erro ao gerar/compartilhar PDF:", error);
      setDayAlertMessage({
        title: "Erro",
        sub: "Não foi possível gerar ou compartilhar o PDF.",
        type: 'holiday'
      });
      setShowDayAlert(true);
      setTimeout(() => setShowDayAlert(false), 2000);
    }
  };

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const generateComprovantesPDF = async () => {
    try {
      const doc = new jsPDF('landscape');
      
      // Title
      doc.setFontSize(18);
      doc.text("Comprovantes de Ponto", 14, 22);
      
      // Group by month
      const logsByMonth: Record<string, typeof logs> = {};
      logs.forEach(log => {
        const date = new Date(log.timestamp);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        if (!logsByMonth[monthYear]) logsByMonth[monthYear] = [];
        logsByMonth[monthYear].push(log);
      });

      let y = 30;
      for (const monthYear in logsByMonth) {
        doc.setFontSize(14);
        doc.text(`Mês: ${monthYear}`, 14, y);
        y += 10;
        
        // Group by week
        const logsByWeek: Record<string, typeof logs> = {};
        logsByMonth[monthYear].forEach(log => {
          const date = new Date(log.timestamp);
          const week = getWeekNumber(date);
          const weekKey = `${week}/${date.getFullYear()}`;
          if (!logsByWeek[weekKey]) logsByWeek[weekKey] = [];
          logsByWeek[weekKey].push(log);
        });
        
        for (const weekKey in logsByWeek) {
          doc.setFontSize(12);
          doc.text(`Semana: ${weekKey}`, 14, y);
          y += 5;
          
          const tableData = logsByWeek[weekKey].map(log => [
            new Date(log.timestamp).toLocaleDateString(),
            log.type === 'in' ? 'Entrada' : log.type === 'out' ? 'Saída' : log.type === 'break_start' ? 'Início Intervalo' : 'Fim Intervalo',
            log.location,
            log.observations || '-'
          ]);
          
          autoTable(doc, {
            startY: y,
            head: [['Data', 'Tipo', 'Local', 'Observações']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            styles: { fontSize: 8, cellPadding: 2 },
          });
          
          y = (doc as any).lastAutoTable.finalY + 10;
        }
      }
      
      // Generate Blob
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `comprovantes_ponto_${profileData.name.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Comprovantes de Ponto',
          text: 'Segue os comprovantes de ponto gerados pelo aplicativo.',
          files: [file]
        });
      } else {
        // Fallback to download
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setSuccessMessage({ title: "Comprovantes Gerados", sub: "Os comprovantes foram salvos no seu dispositivo." });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error: any) {
      console.error(error);
      setSuccessMessage({ title: "Erro", sub: "Não foi possível gerar os comprovantes." });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const generateComprovantesZIP = async () => {
    try {
      const zip = new JSZip();
      const logsWithImages = logs.filter(l => l.ticketImage);
      
      if (logsWithImages.length === 0) {
        setSuccessMessage({ title: "Sem Comprovantes", sub: "Não há imagens de comprovantes para exportar." });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        return;
      }

      for (const log of logsWithImages) {
        if (!log.ticketImage) continue;
        
        const date = new Date(log.timestamp);
        const fileName = `comprovante_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${log.type}.png`;
        
        // Extract base64 data
        const base64Data = log.ticketImage.split(',')[1];
        zip.file(fileName, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "comprovantes_ponto.zip");
      
      setSuccessMessage({ title: "ZIP Gerado", sub: "O download do arquivo ZIP foi iniciado." });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao gerar ZIP:", err);
      setSuccessMessage({ title: "Erro", sub: "Não foi possível gerar o arquivo ZIP." });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleClockAction = (type?: TimeLog['type'] | null) => {
    let actionToSet = type;
    if (!actionToSet) {
      const dateStr = selectedDate.toDateString();
      const dayLogs = logs.filter(l => l.timestamp.toDateString() === dateStr)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const lastLog = dayLogs[dayLogs.length - 1];
      
      actionToSet = 'in';
      if (lastLog) {
        if (lastLog.type === 'in') actionToSet = 'break_start';
        else if (lastLog.type === 'break_start') actionToSet = 'break_end';
        else if (lastLog.type === 'break_end') actionToSet = 'out';
        else if (lastLog.type === 'out') actionToSet = 'in';
      }
    }
    
    setPendingLogType(actionToSet);
    
    // Se estivermos visualizando hoje, usamos a hora atual. 
    // Se for outro dia, usamos a data selecionada com a hora atual.
    const now = new Date();
    const logTime = new Date(selectedDate);
    logTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    
    setRegTime(logTime);
    setShowDuplicateWarning(false);
    setShowRegPopup(true);
  };

  const confirmRegistration = async () => {
    if (!pendingLogType) return;
    
    const dateStr = selectedDate.toDateString();
    const dayLogs = logs.filter(l => l.timestamp.toDateString() === dateStr)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const lastLog = dayLogs[dayLogs.length - 1];

    if (lastLog && lastLog.type === pendingLogType && !showDuplicateWarning) {
      setShowDuplicateWarning(true);
      return;
    }
    
    if (shouldCapturePhoto) {
      setIsCameraOpen(true);
      setShowRegPopup(false);
      return;
    }

    completeRegistration(null);
  };

  const completeRegistration = async (photoUrl: string | null) => {
    if (!user || !user.supabaseId) {
      console.error("User not authenticated for registration");
      return;
    }
    
    console.log("Completing registration. Photo present:", !!photoUrl);
    
    const logData: any = {
      user_id: user.supabaseId,
      type: pendingLogType!,
      timestamp: regTime.toISOString(),
      location: 'Localização Atual'
    };
    
    if (userCoords) logData.coords = userCoords;
    if (photoUrl) {
      logData.ticket_image = photoUrl;
      console.log("Photo size:", Math.round(photoUrl.length / 1024), "KB");
    }
    if (regObservations) logData.observations = regObservations;
    
    console.log("Inserting log data into Supabase:", JSON.stringify({
      ...logData,
      ticket_image: logData.ticket_image ? `[Base64 Image, size: ${Math.round(logData.ticket_image.length / 1024)} KB]` : null
    }, null, 2));
    
    const { data, error } = await supabase
      .from('logs')
      .insert(logData)
      .select()
      .single();

    if (error) {
      console.error('Error saving log:', error.message);
      if (error.message.includes('row-level security policy')) {
        alert('Erro de Permissão (RLS): Você precisa desativar o RLS ou configurar as políticas no Supabase. Veja o arquivo "supabase_setup.sql" na raiz do projeto.');
      } else {
        alert('Erro ao salvar registro: ' + error.message);
      }
      return;
    }
    
    console.log("Log saved successfully. ID:", data?.id);
    
    if (photoUrl && data) {
      console.log("Starting OCR extraction for log:", data.id);
      extractNSR(photoUrl, data.id);
    }
    
    setShowRegPopup(false);
    setPendingLogType(null);
    setShouldCapturePhoto(false);
    setRegObservations("");
  };

  const startCamera = async () => {
    try {
      const constraints: MediaStreamConstraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        } 
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn("Failed with environment facingMode, trying default...", e);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        setCameraCapabilities(caps);
      }
    } catch (err: any) {
      console.error("Erro ao acessar câmera:", err);
      let errorTitle = "Erro na Câmera";
      let errorSub = "Não foi possível acessar a câmera. Verifique as permissões.";
      
      if (err.name === 'NotAllowedError') {
        errorSub = "Permissão negada. Por favor, autorize o acesso à câmera nas configurações do navegador.";
      } else if (err.name === 'NotFoundError') {
        errorSub = "Nenhuma câmera detectada neste dispositivo.";
      }

      setDayAlertMessage({
        title: errorTitle,
        sub: errorSub,
        type: 'holiday'
      });
      setShowDayAlert(true);
      setTimeout(() => setShowDayAlert(false), 5000);
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    setCameraCapabilities(null);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const usePhoto = () => {
    if (capturedImage) {
      setImageToCrop(capturedImage);
      setBrightness(110);
      setContrast(150);
      setIsCameraOpen(false);
      setIsCropping(true);
    }
  };

  const deleteLog = async (id: string) => {
    if (!user || !user.supabaseId) return;
    const { error } = await supabase
      .from('logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.supabaseId);
    
    if (error) {
      console.error('Error deleting log:', error.message);
      if (error.message.includes('row-level security policy')) {
        alert('Erro de Permissão (RLS): Você precisa desativar o RLS no Supabase. Veja o arquivo "supabase_setup.sql".');
      }
    }
    if (viewingImage?.logId === id) setViewingImage(null);
  };

  const updateLogTime = async () => {
    if (!editingLog || !editTime || !user || !user.supabaseId) return;
    
    const [hours, minutes] = editTime.split(':').map(Number);
    const newTimestamp = new Date(editingLog.timestamp);
    newTimestamp.setHours(hours, minutes, 0, 0);
    
    const updateData: any = { 
      timestamp: newTimestamp.toISOString(),
      observations: editingLog.observations || "",
      type: editingLog.type,
      nsr: editingLog.nsr || ""
    };

    // Only update ticket_image if it's not empty, to avoid overwriting with ""
    if (editingLog.ticketImage) {
      // If it's a new base64 image (from a recent crop), upload it
      if (editingLog.ticketImage.startsWith('data:image')) {
        const imageUrl = await uploadImage(editingLog.ticketImage, 'tickets', 'logs');
        updateData.ticket_image = imageUrl;
      } else {
        updateData.ticket_image = editingLog.ticketImage;
      }
    }

    console.log("Updating log in Supabase:", JSON.stringify({
      ...updateData,
      ticket_image: updateData.ticket_image ? `[Base64 Image, size: ${Math.round(updateData.ticket_image.length / 1024)} KB]` : null
    }, null, 2));

    const { error } = await supabase
      .from('logs')
      .update(updateData)
      .eq('id', editingLog.id)
      .eq('user_id', user.supabaseId);

    if (error) {
      console.error('Error updating log time:', error.message);
      if (error.message.includes('row-level security policy')) {
        alert('Erro de Permissão (RLS): Você precisa desativar o RLS no Supabase. Veja o arquivo "supabase_setup.sql".');
      } else {
        alert('Erro ao atualizar registro: ' + error.message);
      }
    }

    setEditingLog(null);
    setEditTime("");
    
    // Show success feedback
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleManualLogSave = async () => {
    if (!user || !user.supabaseId) return;
    
    const [hours, minutes] = manualLogForm.time.split(':').map(Number);
    const timestamp = new Date(manualLogForm.date + 'T12:00:00');
    timestamp.setHours(hours, minutes, 0, 0);
    
    const logData = {
      user_id: user.supabaseId,
      type: manualLogForm.type,
      timestamp: timestamp.toISOString(),
      location: 'Registro Manual',
      observations: manualLogForm.observations
    };
    
    const { error } = await supabase
      .from('logs')
      .insert(logData);
      
    if (error) {
      console.error('Error saving manual log:', error.message);
      if (error.message.includes('row-level security policy')) {
        alert('Erro de Permissão: Você precisa configurar as políticas de RLS no Supabase. Veja o arquivo "supabase_setup.sql" na raiz do projeto para as instruções.');
      } else {
        alert('Erro ao salvar registro: ' + error.message);
      }
      return;
    }
    
    setShowManualLogPopup(false);
    setSuccessMessage({ title: "Registro Adicionado", sub: "O ponto foi registrado manualmente com sucesso." });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    let formatted = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return formatted.replace('-feira', '');
  };

  const sortLogs = (logsToSort: TimeLog[]) => {
    return [...logsToSort].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  // Group logs by date for History View
  const filteredLogs = logs.filter(log => {
    if (historicoView === 'mensal') {
      return log.timestamp.getMonth() === historyDate.getMonth() && 
             log.timestamp.getFullYear() === historyDate.getFullYear();
    } else {
      const startOfWeek = new Date(historyDate);
      startOfWeek.setDate(historyDate.getDate() - historyDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return log.timestamp >= startOfWeek && log.timestamp <= endOfWeek;
    }
  });

  const groupedLogs = filteredLogs.reduce((groups: { [key: string]: TimeLog[] }, log) => {
    const date = log.timestamp.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {});

  const renderPontoView = () => {
    const dateStr = selectedDate.toDateString();
    const isToday = dateStr === new Date().toDateString();
    const dayLogs = logs.filter(l => l.timestamp.toDateString() === dateStr)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const stats = getTodayStats(selectedDate);
    const totalBalance = getTotalBalance();

    const formatDuration = (ms: number) => {
      const absMs = Math.abs(ms);
      const hours = Math.floor(absMs / 3600000);
      const minutes = Math.floor((absMs % 3600000) / 60000);
      return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
    };

    // Timeline Logic
    const workloadMs = parseTimeToMs(settings.workload.daily);
    const breakMs = parseTimeToMs(settings.workload.break);
    
    // Predicted Punches
    const timelineItems: { 
      type: TimeLog['type'], 
      time: Date, 
      isPredicted: boolean, 
      label: string,
      log?: TimeLog
    }[] = [];

    const realIn = dayLogs.find(l => l.type === 'in');
    const realBreakStart = dayLogs.find(l => l.type === 'break_start');
    const realBreakEnd = dayLogs.find(l => l.type === 'break_end');
    const realOut = dayLogs.find(l => l.type === 'out');

    // Only show predictions if there is at least one real log for the day
    const hasAnyLog = dayLogs.length > 0;

    // 1. Entrada
    const inTime = realIn ? realIn.timestamp : parseTimeToDate(settings.workload.shiftStart || '08:00', selectedDate);
    if (realIn || hasAnyLog) {
      timelineItems.push({ 
        type: 'in', 
        time: inTime, 
        isPredicted: !realIn, 
        label: realIn ? 'Entrada' : 'Previsão de entrada',
        log: realIn
      });
    }

    // 2. Saída Intervalo
    // Split workload in half for break prediction
    const firstTurnMs = workloadMs / 2;
    const breakStartTime = realBreakStart ? realBreakStart.timestamp : new Date(inTime.getTime() + firstTurnMs);
    if (realBreakStart || hasAnyLog) {
      timelineItems.push({ 
        type: 'break_start', 
        time: breakStartTime, 
        isPredicted: !realBreakStart, 
        label: realBreakStart ? 'Saída Intervalo' : 'Previsão de saída para o intervalo',
        log: realBreakStart
      });
    }

    // 3. Retorno Intervalo
    const breakEndTime = realBreakEnd ? realBreakEnd.timestamp : new Date(breakStartTime.getTime() + breakMs);
    if (realBreakEnd || hasAnyLog) {
      timelineItems.push({ 
        type: 'break_end', 
        time: breakEndTime, 
        isPredicted: !realBreakEnd, 
        label: realBreakEnd ? 'Retorno Intervalo' : 'Previsão de retorno do intervalo',
        log: realBreakEnd
      });
    }

    // 4. Saída
    const workedFirstTurnMs = (realBreakStart && realIn) 
      ? (realBreakStart.timestamp.getTime() - realIn.timestamp.getTime()) 
      : (workloadMs / 2);
    
    const remainingWorkloadMs = Math.max(0, workloadMs - workedFirstTurnMs);
    const predictedOutTime = new Date(breakEndTime.getTime() + remainingWorkloadMs);
    
    if (realOut || hasAnyLog) {
      timelineItems.push({ 
        type: 'out', 
        time: realOut ? realOut.timestamp : predictedOutTime, 
        isPredicted: !realOut, 
        label: realOut ? 'Saída' : 'Previsão de saída',
        log: realOut
      });
    }

    const status = getDayStatus(selectedDate);

    return (
      <motion.div 
        key="ponto"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex flex-col relative"
      >
        {/* Timeline */}
        <div className="px-0 relative">
          <div className="space-y-0">
            {timelineItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                  <Fingerprint size={40} className="text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Nenhum ponto registrado</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px]">
                  Você ainda não registrou nenhum ponto hoje. Marque agora seu ponto no botão abaixo.
                </p>
              </div>
            )}
            {timelineItems.map((item, index) => {
              const nextItem = timelineItems[index + 1];
              const isRegistered = !item.isPredicted;
              const timeStr = item.time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              
              const typeColors = {
                in: { text: 'text-emerald-500' },
                break_start: { text: 'text-amber-500' },
                break_end: { text: 'text-sky-500' },
                out: { text: 'text-rose-500' },
              };
              
              const colors = typeColors[item.type as keyof typeof typeColors] || typeColors.in;
              
              let durationLabel = null;
              if (nextItem) {
                const diff = nextItem.time.getTime() - item.time.getTime();
                const duration = formatDuration(diff);
                if (item.type === 'in' || item.type === 'break_end') {
                  durationLabel = `Turno de ${duration}`;
                } else if (item.type === 'break_start') {
                  durationLabel = `Intervalo de ${duration}`;
                }
              }

              return (
                <TimelineCard 
                  key={index}
                  item={item}
                  nextItem={nextItem}
                  isRegistered={isRegistered}
                  timeStr={timeStr}
                  colors={colors}
                  durationLabel={durationLabel}
                  deleteLog={deleteLog}
                  setViewingImage={setViewingImage}
                  triggerFileUpload={triggerFileUpload}
                  setEditingLog={setEditingLog}
                />
              );
            })}
          </div>
        </div>

        {/* Empty State / Status Messages */}
        {dayLogs.length === 0 && (
          <div className="mt-12 flex flex-col items-center justify-center text-center px-8">
            {status.isVacation ? (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 shadow-inner">
                  <Umbrella size={40} />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">Férias</h3>
                <p className="text-[10px] text-slate-400 font-medium">Você está em período de férias.</p>
              </div>
            ) : status.isHoliday ? (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
                  <Flag size={40} />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">Feriado</h3>
                <p className="text-[10px] text-slate-400 font-medium">{status.shift}</p>
              </div>
            ) : status.isOff ? (
              <div className="flex flex-col items-center cursor-pointer" onClick={() => {
                setSpecialRegForm({ ...specialRegForm, type: 'Folga', date: selectedDate, reason: status.reason || '', justification: status.justification || '' });
                setShowSpecialRegPopup(true);
              }}>
                <div className="w-20 h-20 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue mb-4 shadow-inner">
                  <Coffee size={40} />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">Folga</h3>
                <p className="text-[10px] text-slate-400 font-medium">Dia de descanso remunerado.</p>
              </div>
            ) : null}
          </div>
        )}
      </motion.div>
    );
  };

  const renderHistoricoView = () => {
    const stats = historicoView === 'mensal' ? getMonthlyStats(historyDate) : getWeeklyStats(historyDate);
    
    return (
      <motion.div 
        key="historico"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex flex-col"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setHistoricoView('mensal')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${historicoView === 'mensal' ? 'bg-white dark:bg-slate-900 text-brand-blue shadow-sm' : 'text-slate-400'}`}
            >
              Mensal
            </button>
            <button 
              onClick={() => setHistoricoView('semanal')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${historicoView === 'semanal' ? 'bg-white dark:bg-slate-900 text-brand-blue shadow-sm' : 'text-slate-400'}`}
            >
              Semanal
            </button>
          </div>
          <div className="flex gap-2 relative" ref={monthPickerRef}>
            <button 
              onClick={() => {
                setHistoryDate(new Date());
                setIsMonthPickerOpen(false);
              }}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm transition-all ${
                historyDate.getMonth() === new Date().getMonth() && historyDate.getFullYear() === new Date().getFullYear()
                  ? 'bg-brand-blue text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Este Mês
            </button>
            <button 
              onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              className={`p-1.5 rounded-full shadow-sm transition-all ${
                isMonthPickerOpen ? 'bg-brand-blue text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Calendar size={16} />
            </button>

            {/* Month Picker Dropdown */}
            <AnimatePresence>
              {isMonthPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-2 z-30"
                >
                  <div className="grid grid-cols-1 gap-1">
                    {months.map((month, idx) => (
                      <button
                        key={month}
                        onClick={() => {
                          const newDate = new Date(historyDate);
                          newDate.setMonth(idx);
                          setHistoryDate(newDate);
                          setIsMonthPickerOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                          historyDate.getMonth() === idx 
                            ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Período Selecionado</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">
              {months[historyDate.getMonth()]} {historyDate.getFullYear()}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowManualLogPopup(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-lime text-brand-navy rounded-xl text-[10px] font-bold active:scale-95 transition-transform"
            >
              <Plus size={14} />
              Novo Registro
            </button>
            <button 
              onClick={() => generateAndSharePDF(historyDate)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-blue text-white rounded-xl text-[10px] font-bold active:scale-95 transition-transform"
            >
              <Download size={14} />
              Exportar PDF
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className={`grid ${settings.bankOfHours?.active ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mb-3`}>
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Horas Extras</p>
            <p className="text-base font-bold text-brand-blue dark:text-brand-blue">
              {stats.extra}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Faltas/Atrasos</p>
            <p className="text-base font-bold text-rose-500">
              {stats.missing}
            </p>
          </div>
          {settings.bankOfHours?.active && (
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">Banco Total</p>
              <p className={`text-base font-bold ${getBankOfHoursBalance()?.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                {getBankOfHoursBalance()}
              </p>
            </div>
          )}
        </div>

        {/* Grouped Logs */}
        <div className="space-y-4">
        {Object.keys(groupedLogs).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-600">
            <History size={40} className="mb-3 opacity-20" />
            <p className="text-xs font-medium">Nenhum registro encontrado</p>
          </div>
        ) : (
          (Object.entries(groupedLogs) as [string, TimeLog[]][]).map(([date, dayLogs]) => (
            <div key={date} className="mb-6 last:mb-0">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-brand-blue" />
                {date}
                {(() => {
                  const status = getDayStatus(dayLogs[0].timestamp);
                  const { workedMs, expectedMs } = calculateDayStats(dayLogs, dayLogs[0].timestamp, false);
                  const balanceMs = workedMs - expectedMs;
                  const formatDurationShort = (ms: number) => {
                    const absMs = Math.abs(ms);
                    const hours = Math.floor(absMs / 3600000);
                    const minutes = Math.floor((absMs % 3600000) / 60000);
                    return `${hours}h ${minutes}m`;
                  };
                  return (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className={`text-[9px] font-bold ${balanceMs >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {balanceMs >= 0 ? '+' : '-'}{formatDurationShort(balanceMs)}
                      </span>
                      {status.isHoliday && (
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase border border-amber-200 dark:border-amber-800">Feriado</span>
                      )}
                      {status.isOff && !status.isHoliday && (
                        <span className="bg-brand-lime/20 dark:bg-brand-lime/10 text-brand-navy dark:text-brand-lime px-1.5 py-0.5 rounded text-[8px] font-black uppercase border border-brand-lime/30 dark:border-brand-lime/20">Folga</span>
                      )}
                    </div>
                  );
                })()}
              </h4>
              <div className="space-y-0">
                {sortLogs(dayLogs).map((log) => (
                  <SwipeableLogCard 
                    key={log.id} 
                    log={log} 
                    onDelete={deleteLog}
                    onTriggerUpload={triggerFileUpload}
                    onViewImage={(url, id) => setViewingImage({ url, logId: id })}
                    onEdit={(log) => {
                      setEditingLog(log);
                      setEditTime(log.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                    }}
                    isProcessingOCR={isProcessingOCR}
                    activeLogId={activeLogId}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
    );
  };

  const renderEscalaView = () => (
    <motion.div 
      key="escala"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex flex-col"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <button 
            onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
            className="text-[10px] font-bold text-brand-blue dark:text-brand-blue uppercase tracking-widest flex items-center gap-1 mt-1"
          >
            {months[escalaDate.getMonth()]} {escalaDate.getFullYear()}
            <ChevronRight size={10} className={isMonthPickerOpen ? 'rotate-90' : ''} />
          </button>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          <button 
            onClick={() => {
              const newDate = new Date(escalaDate);
              newDate.setDate(newDate.getDate() - (escalaView === 'semanal' ? 7 : 30));
              setEscalaDate(newDate);
            }}
            className="p-1.5 text-slate-400 hover:text-brand-blue transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => setEscalaView('semanal')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              escalaView === 'semanal' ? 'bg-white dark:bg-slate-900 text-brand-blue dark:text-brand-blue shadow-sm' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            Semanal
          </button>
          <button 
            onClick={() => setEscalaView('mensal')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              escalaView === 'mensal' ? 'bg-white dark:bg-slate-900 text-brand-blue dark:text-brand-blue shadow-sm' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            Mensal
          </button>
          <button 
            onClick={() => {
              const newDate = new Date(escalaDate);
              newDate.setDate(newDate.getDate() + (escalaView === 'semanal' ? 7 : 30));
              setEscalaDate(newDate);
            }}
            className="p-1.5 text-slate-400 hover:text-brand-blue transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Current Period Info */}
      <div className="bg-brand-blue/10 dark:bg-brand-blue/20 p-6 rounded-3xl border border-brand-blue/20 dark:border-brand-blue/30 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center text-white">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-brand-blue/60 dark:text-brand-blue/80 uppercase tracking-wider">
              {escalaView === 'semanal' ? 'Semana Selecionada' : `Mês de ${months[escalaDate.getMonth()]}`}
            </p>
            <p className="text-sm font-bold text-brand-blue dark:text-brand-blue/90">
              {escalaView === 'semanal' 
                ? `${schedule[0].date} - ${schedule[6].date}` 
                : `01 ${months[escalaDate.getMonth()].substring(0, 3)} - ${getDaysInMonth(escalaDate.getFullYear(), escalaDate.getMonth())} ${months[escalaDate.getMonth()].substring(0, 3)}`
              }
            </p>
          </div>
        </div>
        <div className="flex justify-between items-end">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <div>
              <p className="text-[10px] font-bold text-brand-blue/60 dark:text-brand-blue/80 uppercase mb-1">Carga Horária</p>
              <p className="text-sm font-bold text-brand-blue dark:text-brand-blue/90">
                {escalaView === 'semanal' ? `${settings.workload.weekly} Semanais` : `${settings.workload.monthly} Mensais`}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-blue/60 dark:text-brand-blue/80 uppercase mb-1">Jornada Diária</p>
              <p className="text-sm font-bold text-brand-blue dark:text-brand-blue/90">{settings.workload.daily}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-blue/60 dark:text-brand-blue/80 uppercase mb-1">Intervalo</p>
              <p className="text-sm font-bold text-brand-blue dark:text-brand-blue/90">{settings.workload.break}</p>
            </div>
            <div className="text-right flex flex-col justify-end">
              <p className="text-[10px] font-bold text-brand-blue/60 dark:text-brand-blue/80 uppercase mb-1">Status</p>
              <span className="px-3 py-1 bg-brand-blue text-white text-[10px] font-bold rounded-full uppercase inline-block w-fit ml-auto">Em Dia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule List */}
      <div className="flex-1 overflow-y-auto pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={escalaView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={escalaView === 'semanal' ? "space-y-4" : "flex flex-col gap-2"}
          >
            {escalaView === 'semanal' ? (
              schedule.map((item, index) => (
                <div
                  key={index}
                  onClick={() => setEditingSchedule({ 
                    date: (item as any).fullDate, 
                    shift: item.shift, 
                    isOff: item.isOff,
                    isHoliday: (item as any).isHoliday || false,
                    day: item.day
                  })}
                  className={`p-4 rounded-2xl flex items-center justify-between border transition-all cursor-pointer active:scale-[0.98] ${
                    item.isToday 
                      ? 'bg-brand-blue border-brand-blue text-white shadow-lg scale-[1.02]' 
                      : (item as any).isVacation
                      ? 'bg-sky-100 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-400 shadow-sm'
                      : (item as any).isMedical
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-400 shadow-sm'
                      : (item as any).isAbsence
                      ? 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-400 shadow-sm'
                      : (item as any).isManualAdjustment || (item as any).isDifferentWorkload
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-400 shadow-sm'
                      : item.isOff
                      ? 'bg-brand-lime border-brand-lime text-brand-navy shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl font-bold ${
                      item.isToday ? 'bg-white/20 text-white' : (item as any).isVacation ? 'bg-sky-500/10 text-sky-600' : (item as any).isMedical ? 'bg-emerald-500/10 text-emerald-600' : (item as any).isAbsence ? 'bg-rose-500/10 text-rose-600' : (item as any).isManualAdjustment || (item as any).isDifferentWorkload ? 'bg-indigo-500/10 text-indigo-600' : item.isOff ? 'bg-brand-navy/10 text-brand-navy' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    }`}>
                      <span className="text-[10px] uppercase">{item.day}</span>
                      <span className="text-sm">{item.date.split(' ')[0]}</span>
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${item.isToday ? 'text-white' : (item as any).isHoliday ? 'text-slate-900 dark:text-white' : (item as any).isVacation ? 'text-sky-700 dark:text-sky-400' : (item as any).isMedical ? 'text-emerald-700 dark:text-emerald-400' : (item as any).isAbsence ? 'text-rose-700 dark:text-rose-400' : (item as any).isManualAdjustment || (item as any).isDifferentWorkload ? 'text-indigo-700 dark:text-indigo-400' : item.isOff ? 'text-brand-navy' : 'text-slate-900 dark:text-white'}`}>
                        {(item as any).isHoliday ? item.shift : (item as any).isVacation ? 'Férias' : (item as any).isMedical ? 'Atestado Médico' : (item as any).isAbsence ? 'Falta' : (item as any).isManualAdjustment ? 'Ajuste Manual' : (item as any).isDifferentWorkload ? 'Carga Horária' : item.isOff ? 'Folga Semanal' : 'Turno Regular'}
                      </p>
                      <p className={`text-[10px] flex items-center gap-1 ${item.isToday ? 'text-brand-lime' : (item as any).isHoliday ? 'text-slate-400 dark:text-slate-500' : (item as any).isVacation ? 'text-sky-600/60' : (item as any).isMedical ? 'text-emerald-600/60' : (item as any).isAbsence ? 'text-rose-600/60' : (item as any).isManualAdjustment || (item as any).isDifferentWorkload ? 'text-indigo-600/60' : item.isOff ? 'text-brand-navy/60' : 'text-slate-400 dark:text-slate-500'}`}>
                        <Clock size={10} /> {item.shift}
                      </p>
                    </div>
                  </div>
                  {item.isToday ? (
                    <div className="bg-brand-lime text-brand-blue px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">
                      Hoje
                    </div>
                  ) : (item as any).isHoliday ? (
                    <div className="bg-amber-500 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                      Feriado
                    </div>
                  ) : (item as any).isVacation ? (
                    <div className="bg-sky-500 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                      Férias
                    </div>
                  ) : (item as any).isMedical ? (
                    <div className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                      Atestado
                    </div>
                  ) : (item as any).isAbsence ? (
                    <div className="bg-rose-500 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                      Falta
                    </div>
                  ) : (item as any).isCustom && (
                    <div className={`${item.isOff ? 'bg-brand-navy/10 text-brand-navy' : 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue'} px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1`}>
                      <Edit3 size={8} /> Alterado
                    </div>
                  )}
                </div>
              ))
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: new Date(escalaDate.getFullYear(), escalaDate.getMonth(), 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square rounded-xl border border-transparent" />
                  ))}
                  {monthlySchedule.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => setEditingSchedule({ 
                        date: (item as any).fullDate, 
                        shift: item.shift, 
                        isOff: item.isOff,
                        isHoliday: (item as any).isHoliday || false,
                        day: item.day
                      })}
                      className={`aspect-square flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer active:scale-90 relative ${
                        item.isToday 
                          ? 'bg-brand-blue border-brand-blue text-white shadow-md z-10' 
                          : (item as any).isVacation
                          ? 'bg-sky-100 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-400 shadow-sm'
                          : (item as any).isMedical
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-400 shadow-sm'
                          : (item as any).isAbsence
                          ? 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-400 shadow-sm'
                          : (item as any).isManualAdjustment || (item as any).isDifferentWorkload
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-400 shadow-sm'
                          : item.isOff
                          ? 'bg-brand-lime border-brand-lime text-brand-navy shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white'
                      }`}
                    >
                      <span className={`text-[8px] font-bold uppercase ${item.isOff || item.isToday || (item as any).isHoliday || (item as any).isVacation || (item as any).isMedical || (item as any).isAbsence || (item as any).isManualAdjustment || (item as any).isDifferentWorkload ? 'opacity-80' : 'opacity-60'}`}>{item.day}</span>
                      <span className="text-xs font-black">{item.date.split(' ')[0]}</span>
                      {(item as any).isCustom && (
                        <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${(item as any).isHoliday ? 'bg-amber-500' : (item as any).isVacation ? 'bg-sky-500' : (item as any).isMedical ? 'bg-emerald-500' : (item as any).isAbsence ? 'bg-rose-500' : (item as any).isManualAdjustment || (item as any).isDifferentWorkload ? 'bg-indigo-500' : 'bg-brand-blue'}`} />
                      )}
                      {!item.isOff && !item.isToday && !(item as any).isHoliday && !(item as any).isVacation && !(item as any).isMedical && !(item as any).isAbsence && (
                        <div className="w-1 h-1 rounded-full mt-1 bg-brand-blue" />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

    </motion.div>
  );

  const renderEspelhoView = () => {
    const year = historyDate.getFullYear();
    const month = historyDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      const dayLogs = logs.filter(l => l.timestamp.toDateString() === date.toDateString())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      days.push({ date, dayLogs });
    }

    const formatDurationTable = (ms: number) => {
      const absMs = Math.abs(ms);
      const hours = Math.floor(absMs / 3600000);
      const minutes = Math.floor((absMs % 3600000) / 60000);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col pb-20"
      >
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMenuView('main')}
              className="p-2 -ml-2 text-slate-400 active:scale-90 transition-transform"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Espelho de Ponto</h2>
          </div>
          <button 
            onClick={() => generateAndSharePDF(historyDate)}
            className="p-2 bg-brand-blue text-white rounded-xl shadow-lg active:scale-90 transition-transform"
          >
            <Download size={20} />
          </button>
        </header>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Data</th>
                  <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Ent.</th>
                  <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Saí.</th>
                  <th className="p-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {days.map(({ date, dayLogs }) => {
                  const { workedMs, expectedMs } = calculateDayStats(dayLogs, date, false);
                  const balanceMs = workedMs - expectedMs;
                  const inLog = dayLogs.find(l => l.type === 'in');
                  const outLog = dayLogs.find(l => l.type === 'out');
                  
                  return (
                    <tr key={date.toDateString()} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{date.getDate().toString().padStart(2, '0')}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                          {inLog ? inLog.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                          {outLog ? outLog.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-black tabular-nums ${balanceMs >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {balanceMs === 0 ? '00:00' : (balanceMs > 0 ? '+' : '-') + formatDurationTable(balanceMs)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSettingsView = () => (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex flex-col pb-20"
    >
      <header className="mb-6 flex items-center gap-2">
        <button 
          onClick={() => setMenuView('main')}
          className="p-2 -ml-2 text-slate-400 active:scale-90 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Ajustes</h2>
      </header>

      <main className="space-y-8">
        {/* App Preferences */}
        <section className="mb-8">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">Ajustes do App</h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div 
              onClick={() => setShowNotificationPrefs(true)}
              className="p-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Notificações</span>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </div>
            <div className="p-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Eye size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Privacidade (GPS)</span>
              </div>
              <span className="text-[10px] font-bold text-brand-blue bg-brand-blue/10 dark:text-brand-lime dark:bg-brand-lime/10 px-2 py-1 rounded-lg uppercase">Ativo</span>
            </div>
            <div className="p-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Início da Semana</span>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => saveSettings({ ...settings, weekStart: 'sunday' })}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    settings.weekStart === 'sunday'
                      ? 'bg-white dark:bg-slate-700 text-brand-blue dark:text-brand-lime shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Dom
                </button>
                <button
                  onClick={() => saveSettings({ ...settings, weekStart: 'monday' })}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    settings.weekStart === 'monday'
                      ? 'bg-white dark:bg-slate-700 text-brand-blue dark:text-brand-lime shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Seg
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <BarChart3 size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Mostrar Saldo</span>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => saveSettings({ ...settings, totalBalanceView: 'week' })}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    settings.totalBalanceView === 'week'
                      ? 'bg-white dark:bg-slate-700 text-brand-blue dark:text-brand-lime shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Semanal
                </button>
                <button
                  onClick={() => saveSettings({ ...settings, totalBalanceView: 'month' })}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    settings.totalBalanceView === 'month'
                      ? 'bg-white dark:bg-slate-700 text-brand-blue dark:text-brand-lime shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Mensal
                </button>
              </div>
            </div>
            <div className="p-4 border-b border-slate-50 dark:border-slate-800">
              <button
                onClick={() => resetBalance(settings.totalBalanceView)}
                className="w-full py-3 bg-rose-500 text-white rounded-xl font-bold text-sm"
              >
                Zerar Saldo {settings.totalBalanceView === 'week' ? 'Semanal' : 'Mensal'}
              </button>
            </div>
            <div className="p-4 border-b border-slate-50 dark:border-slate-800">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 mb-2">
                  <RotateCcw size={18} className="text-amber-500" />
                  <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Manutenção</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2">
                  Limpar dados locais (cache)
                </p>
                <button
                  onClick={() => {
                    localStorage.removeItem('chronos_settings');
                    window.location.reload();
                  }}
                  className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <RotateCcw size={18} />
                  Resetar Cache do App
                </button>
              </div>
            </div>
            <div className="p-4 border-b border-slate-50 dark:border-slate-800">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Moon size={18} className="text-slate-400 dark:text-slate-500" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Aparência</span>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => saveSettings({ ...settings, theme: t })}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        settings.theme === t
                          ? 'bg-white dark:bg-slate-700 text-brand-blue dark:text-brand-lime shadow-sm'
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                    >
                      {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Sistema'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-b border-slate-50 dark:border-slate-800">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-brand-blue to-brand-lime" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Paleta de Cores</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {[
                    { id: 'default', name: 'Padrão' },
                    { id: 'ocean', name: 'Oceano' },
                    { id: 'sunset', name: 'Pôr do Sol' },
                    { id: 'forest', name: 'Floresta' },
                    { id: 'monochrome', name: 'Monocromático' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => saveSettings({ ...settings, colorPalette: p.id })}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        (settings.colorPalette || 'default') === p.id
                          ? 'bg-white dark:bg-slate-700 text-brand-blue dark:text-brand-lime shadow-sm'
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Punch Rules */}
        <section className="mb-8">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">Regras de Ponto</h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Tolerância (min)</span>
              </div>
              <select 
                value={settings.tolerance}
                onChange={(e) => saveSettings({ ...settings, tolerance: Number(e.target.value) })}
                className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-xl outline-none"
              >
                <option value={0}>0 min</option>
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
              </select>
            </div>
            <div className="p-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Moon size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Adicional Noturno</span>
              </div>
              <button
                onClick={() => saveSettings({ ...settings, nightShift: { ...settings.nightShift, active: !settings.nightShift?.active } })}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings.nightShift?.active ? 'bg-brand-blue' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.nightShift?.active ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Banco de Horas</span>
              </div>
              <button
                onClick={() => saveSettings({ ...settings, bankOfHours: { ...settings.bankOfHours, active: !settings.bankOfHours?.active } })}
                className={`w-10 h-5 rounded-full relative transition-colors ${settings.bankOfHours?.active ? 'bg-brand-blue' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${settings.bankOfHours?.active ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Vacation Mode */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">Período de Ausência</h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Smartphone size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Modo Férias</span>
              </div>
              <button 
                onClick={() => saveSettings({...settings, vacationMode: {...settings.vacationMode, active: !settings.vacationMode.active}})}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.vacationMode.active ? 'bg-brand-blue' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <motion.div 
                  animate={{ x: settings.vacationMode.active ? 24 : 2 }}
                  className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
            {settings.vacationMode.active && (
              <div className="p-4 bg-brand-blue/5 dark:bg-brand-lime/5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-brand-blue dark:text-brand-lime uppercase mb-1">Data Início</p>
                    <input 
                      type="date" 
                      value={settings.vacationMode.startDate}
                      onChange={(e) => saveSettings({...settings, vacationMode: {...settings.vacationMode, startDate: e.target.value}})}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-brand-blue dark:text-brand-lime outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-blue dark:text-brand-lime uppercase mb-1">Data Fim</p>
                    <input 
                      type="date" 
                      value={settings.vacationMode.endDate}
                      onChange={(e) => saveSettings({...settings, vacationMode: {...settings.vacationMode, endDate: e.target.value}})}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-brand-blue dark:text-brand-lime outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Support Info */}
        <section className="mt-8">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">Suporte</h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle size={32} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Ajuda & FAQ</span>
              </div>
              <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
            </button>
            <button className="w-full p-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Termos de Uso</span>
              </div>
              <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
            </button>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone size={18} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Versão do App</span>
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">v2.4.1</span>
            </div>
          </div>
        </section>
      </main>
    </motion.div>
  );

  const renderExtraMenuView = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center px-8"
      >
        <div className="w-24 h-24 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue mb-6">
          <LayoutGrid size={48} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Menu Principal</h2>
        <p className="text-sm text-slate-400 font-medium leading-relaxed">
          Este menu será atualizado em breve com novos conteúdos e funcionalidades.
        </p>
      </motion.div>
    );
  };

  const renderMenuView = () => {
    const menuItems = [
      { id: 'profile', label: 'Meus Dados', icon: User, color: 'bg-brand-blue' },
      { id: 'historico', label: 'Histórico', icon: History, color: 'bg-indigo-500' },
      { id: 'escala', label: 'Escala', icon: Calendar, color: 'bg-brand-lime' },
      { id: 'docs', label: 'Comprovantes', icon: FileText, color: 'bg-amber-500' },
      { id: 'reports', label: 'Espelho', icon: BarChart3, color: 'bg-emerald-500' },
      { id: 'settings', label: 'Ajustes', icon: Settings, color: 'bg-brand-blue' },
      { id: 'support', label: 'Ajuda e Suporte', icon: HelpCircle, color: 'bg-rose-500' },
    ];

    const formatCPF = (value: string) => {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
      if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
    };

    if (menuView === 'historico') {
      return renderHistoricoView();
    }

    if (menuView === 'escala') {
      return renderEscalaView();
    }

    if (menuView === 'settings') {
      return renderSettingsView();
    }

    if (menuView === 'reports') {
      return renderEspelhoView();
    }

    if (menuView === 'profile') {
      return (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col pb-10"
        >
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => {
                if (isEditingProfile) {
                  saveProfile(profileData);
                  saveSettings(settings);
                }
                setMenuView('main');
                setIsEditingProfile(false);
              }}
              className="flex items-center gap-2 text-slate-400 active:scale-95 transition-transform"
            >
              <ChevronLeft size={20} />
              <span className="text-sm font-bold">Voltar ao Menu</span>
            </button>
            <button 
              onClick={() => {
                if (isEditingProfile) {
                  // Explicitly save both profile and settings (workload)
                  saveProfile(profileData);
                  saveSettings(settings);
                  setSuccessMessage({ title: "Dados Atualizados", sub: "Suas informações foram salvas com sucesso." });
                  setShowSuccess(true);
                  setTimeout(() => setShowSuccess(false), 3000);
                }
                setIsEditingProfile(!isEditingProfile);
              }}
              className={`text-sm font-bold ${isEditingProfile ? 'text-emerald-500' : 'text-brand-blue dark:text-brand-lime'}`}
            >
              {isEditingProfile ? 'Salvar' : 'Editar'}
            </button>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Meus Dados</h2>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 mb-8">
            <div className="flex flex-col items-center mb-4">
              <div className="w-20 h-20 rounded-full bg-brand-blue/10 flex items-center justify-center mb-3 border-2 border-brand-blue/20 relative">
                <User size={40} className="text-brand-blue" />
                {isEditingProfile && (
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-brand-blue rounded-full flex items-center justify-center text-white border-2 border-white dark:border-slate-900">
                    <Plus size={14} />
                  </div>
                )}
              </div>
              {isEditingProfile ? (
                <input 
                  type="text" 
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="font-black text-lg text-center text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1 mb-1 outline-none border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <p className="font-black text-lg text-slate-900 dark:text-white">{profileData.name}</p>
              )}
              {isEditingProfile ? (
                <input 
                  type="text" 
                  value={profileData.role}
                  onChange={(e) => setProfileData({...profileData, role: e.target.value})}
                  className="text-xs text-center text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1 outline-none border border-slate-200 dark:border-slate-700 uppercase font-bold tracking-widest"
                />
              ) : (
                <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">{profileData.role}</p>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">E-mail</span>
                {isEditingProfile ? (
                  <input 
                    type="email" 
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 outline-none border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{profileData.email}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CPF</span>
                {isEditingProfile ? (
                  <input 
                    type="text" 
                    value={profileData.cpf === '***.***.***-**' ? '' : profileData.cpf}
                    placeholder="000.000.000-00"
                    onChange={(e) => setProfileData({...profileData, cpf: formatCPF(e.target.value)})}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 outline-none border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{profileData.cpf || '***.***.***-**'}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Matrícula</span>
                {isEditingProfile ? (
                  <input 
                    type="text" 
                    value={profileData.matricula}
                    onChange={(e) => setProfileData({...profileData, matricula: e.target.value})}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 outline-none border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{profileData.matricula}</span>
                )}
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Carga Horária</h2>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 mb-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Diária</span>
                {isEditingProfile ? (
                  <input 
                    type="text" 
                    value={settings.workload.daily}
                    onChange={(e) => setSettings({...settings, workload: {...settings.workload, daily: e.target.value}})}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 outline-none border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{settings.workload.daily}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Semanal</span>
                {isEditingProfile ? (
                  <input 
                    type="text" 
                    value={settings.workload.weekly}
                    onChange={(e) => setSettings({...settings, workload: {...settings.workload, weekly: e.target.value}})}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 outline-none border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{settings.workload.weekly}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mensal</span>
                {isEditingProfile ? (
                  <input 
                    type="text" 
                    value={settings.workload.monthly}
                    onChange={(e) => setSettings({...settings, workload: {...settings.workload, monthly: e.target.value}})}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 outline-none border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{settings.workload.monthly}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Intervalo</span>
                {isEditingProfile ? (
                  <input 
                    type="text" 
                    value={settings.workload.break}
                    onChange={(e) => setSettings({...settings, workload: {...settings.workload, break: e.target.value}})}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 outline-none border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{settings.workload.break}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Início Turno</span>
                {isEditingProfile ? (
                  <input 
                    type="time" 
                    value={settings.workload.shiftStart || '08:00'}
                    onChange={(e) => setSettings({...settings, workload: {...settings.workload, shiftStart: e.target.value}})}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 outline-none border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{settings.workload.shiftStart || '08:00'}</span>
                )}
              </div>
            </div>
          </div>

          {isEditingProfile && (
            <button 
              onClick={() => {
                saveProfile(profileData);
                saveSettings(settings);
                setIsEditingProfile(false);
                setSuccessMessage({ title: "Dados Atualizados", sub: "Suas informações foram salvas com sucesso." });
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
              }}
              className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold text-sm shadow-lg shadow-brand-blue/20 active:scale-95 transition-all mb-10"
            >
              Salvar Alterações
            </button>
          )}
        </motion.div>
      );
    }

    if (menuView === 'docs') {
      const docs = logs.filter(log => log.ticketImage);
      
      // Group by Month -> Week -> Date
      const groupedDocs: Record<string, Record<string, Record<string, typeof logs>>> = {};
      
      docs.forEach(log => {
        const date = new Date(log.timestamp);
        const monthYear = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const capitalizedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
        
        // Calculate week of month
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstDayOfWeek = firstDayOfMonth.getDay();
        const offsetDate = date.getDate() + firstDayOfWeek - 1;
        const weekOfMonth = Math.floor(offsetDate / 7) + 1;
        const weekLabel = `Semana ${weekOfMonth}`;
        
        const dateString = date.toLocaleDateString('pt-BR');

        if (!groupedDocs[capitalizedMonthYear]) groupedDocs[capitalizedMonthYear] = {};
        if (!groupedDocs[capitalizedMonthYear][weekLabel]) groupedDocs[capitalizedMonthYear][weekLabel] = {};
        if (!groupedDocs[capitalizedMonthYear][weekLabel][dateString]) groupedDocs[capitalizedMonthYear][weekLabel][dateString] = [];
        
        groupedDocs[capitalizedMonthYear][weekLabel][dateString].push(log);
      });

      return (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          {isScanning && (
            <DocumentScanner 
              onScan={(imageSrc) => {
                setAtestadoForm({...atestadoForm, scannedImage: imageSrc});
                setIsScanning(false);
              }} 
              onClose={() => setIsScanning(false)} 
            />
          )}
          <button 
            onClick={() => {
              if (showAtestadoForm) {
                setShowAtestadoForm(false);
              } else {
                setMenuView('main');
              }
            }}
            className="flex items-center gap-2 text-slate-400 mb-6 active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-bold">{showAtestadoForm ? 'Voltar' : 'Voltar ao Menu'}</span>
          </button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            {showAtestadoForm ? 'Adicionar Atestado' : 'Comprovantes'}
          </h2>

          {!showAtestadoForm && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
              <button
                onClick={() => setDocsTab('comprovantes')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${docsTab === 'comprovantes' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
              >
                Ponto
              </button>
              <button
                onClick={() => setDocsTab('atestados')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${docsTab === 'atestados' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
              >
                Atestados Médicos
              </button>
            </div>
          )}
          
          {showAtestadoForm ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data do Atestado</label>
                <input 
                  type="date" 
                  value={atestadoForm.date}
                  onChange={(e) => setAtestadoForm({...atestadoForm, date: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Período</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setAtestadoForm({...atestadoForm, isFullDay: true})}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border ${atestadoForm.isFullDay ? 'bg-brand-blue/10 border-brand-blue text-brand-blue' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                  >
                    Dia Inteiro
                  </button>
                  <button 
                    onClick={() => setAtestadoForm({...atestadoForm, isFullDay: false})}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border ${!atestadoForm.isFullDay ? 'bg-brand-blue/10 border-brand-blue text-brand-blue' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                  >
                    Horário Específico
                  </button>
                </div>
              </div>

              {!atestadoForm.isFullDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hora Início</label>
                    <input 
                      type="time" 
                      value={atestadoForm.startTime}
                      onChange={(e) => setAtestadoForm({...atestadoForm, startTime: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hora Fim</label>
                    <input 
                      type="time" 
                      value={atestadoForm.endTime}
                      onChange={(e) => setAtestadoForm({...atestadoForm, endTime: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1 mt-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documento</label>
                {atestadoForm.scannedImage ? (
                  <div className="relative rounded-none overflow-hidden border border-slate-200 dark:border-slate-700 aspect-[3/4]">
                    <img 
                      src={atestadoForm.scannedImage} 
                      alt="Atestado Escaneado" 
                      className="w-full h-full object-contain bg-white" 
                      style={{ filter: 'grayscale(1) contrast(1.2) brightness(1.1)' }}
                    />
                    <button 
                      onClick={() => setAtestadoForm({...atestadoForm, scannedImage: null})}
                      className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsScanning(true)}
                    className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-95"
                  >
                    <div className="w-12 h-12 bg-brand-blue/10 text-brand-blue rounded-full flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    <span className="text-sm font-bold">Escanear Atestado</span>
                    <span className="text-[10px] text-slate-400 text-center">O documento será ajustado automaticamente para PDF</span>
                  </button>
                )}
              </div>

              <button 
                onClick={() => {
                  if (!atestadoForm.date || !atestadoForm.scannedImage || (!atestadoForm.isFullDay && (!atestadoForm.startTime || !atestadoForm.endTime))) {
                    return;
                  }
                  const saveAtestado = async () => {
                    if (!user || !user.supabaseId) return;
                    
                    setIsSavingPhoto(true);
                    
                    // Upload to storage first
                    const imageUrl = await uploadImage(atestadoForm.scannedImage!, 'tickets', 'atestados');

                    const newAtestadoData = {
                      user_id: user.supabaseId,
                      date: atestadoForm.date,
                      is_full_day: atestadoForm.isFullDay,
                      start_time: atestadoForm.startTime,
                      end_time: atestadoForm.endTime,
                      image: imageUrl
                    };

                    console.log("Saving atestado to Supabase...");
                    const { error } = await supabase
                      .from('medical_certificates')
                      .insert(newAtestadoData);

                    setIsSavingPhoto(false);

                    if (error) {
                      console.error('Error saving atestado:', error.message);
                      alert('Erro ao salvar atestado: ' + error.message);
                      return;
                    }

                    console.log("Atestado saved successfully");
                    setShowAtestadoForm(false);
                    setAtestadoForm({ date: '', isFullDay: true, startTime: '', endTime: '', scannedImage: null });
                    setSuccessMessage({ title: "Atestado Salvo", sub: "Seu atestado foi salvo com sucesso." });
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 3000);
                  };

                  saveAtestado();
                }}
                className={`w-full p-4 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-transform mt-4 ${
                  atestadoForm.date && atestadoForm.scannedImage && (atestadoForm.isFullDay || (atestadoForm.startTime && atestadoForm.endTime))
                    ? 'bg-brand-blue text-white shadow-brand-blue/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                Salvar Atestado
              </button>
            </div>
          ) : docsTab === 'comprovantes' ? (
            Object.keys(groupedDocs).length === 0 ? (
              <div className="text-center py-10">
                <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">Nenhum comprovante salvo.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedDocs).map(([month, weeks]) => (
                  <div key={month} className="space-y-2">
                    <h3 className="text-lg font-black text-brand-blue dark:text-brand-lime border-b-2 border-brand-blue/10 dark:border-brand-lime/10 pb-1">{month}</h3>
                    
                    {Object.entries(weeks).map(([week, days]) => (
                      <div key={week} className="space-y-1 pl-2 border-l-2 border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{week}</h4>
                        
                        {Object.entries(days).map(([dateStr, dayLogs]) => (
                          <div key={dateStr} className="bg-white dark:bg-slate-900 rounded-none p-2 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-1 text-center">{dateStr}</h5>
                            <div className="grid grid-cols-4 gap-1">
                              {dayLogs.map(log => (
                                <div 
                                  key={log.id} 
                                  onClick={() => setSelectedDoc(log.ticketImage || null)}
                                  className="bg-white dark:bg-slate-800 rounded-none overflow-hidden cursor-pointer active:scale-95 transition-transform border border-slate-200 dark:border-slate-700 relative group aspect-[3/4]"
                                >
                                  <img 
                                    src={log.ticketImage} 
                                    alt="Comprovante" 
                                    className="w-full h-full object-cover block" 
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                                    <span className="text-white text-[8px] font-bold">{new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {atestadosList.length === 0 ? (
                <div className="text-center py-10">
                  <Stethoscope size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium">Nenhum atestado médico salvo.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {atestadosList.map(atestado => (
                    <div key={atestado.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded-none flex items-center gap-3 shadow-sm">
                      <div 
                        onClick={() => setSelectedDoc(atestado.image)}
                        className="w-20 h-20 bg-white dark:bg-slate-800 rounded-none overflow-hidden cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
                      >
                        <img 
                          src={atestado.image} 
                          alt="Atestado" 
                          className="w-full h-full object-contain" 
                          style={{ filter: 'grayscale(1) contrast(1.2) brightness(1.1)' }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {new Date(atestado.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {atestado.isFullDay ? 'Dia Inteiro' : `${atestado.startTime} às ${atestado.endTime}`}
                        </p>
                      </div>
                      <button 
                        onClick={async () => {
                          if (!user || !user.supabaseId) return;
                          if (!window.confirm("Tem certeza que deseja excluir este atestado?")) return;
                          
                          const { error } = await supabase
                            .from('medical_certificates')
                            .delete()
                            .eq('id', atestado.id)
                            .eq('user_id', user.supabaseId);
                          
                          if (error) {
                            console.error('Error deleting atestado:', error.message);
                            alert('Erro ao excluir atestado: ' + error.message);
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-full active:scale-90 transition-transform"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button 
                onClick={() => setShowAtestadoForm(true)}
                className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-bold text-sm mt-4 active:scale-95 transition-transform hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Plus size={18} />
                Adicionar Atestado
              </button>
            </div>
          )}

          {/* Modal for viewing/printing full size */}
          <AnimatePresence>
            {selectedDoc && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
              >
                <div className="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center">
                  <div className="flex justify-between w-full mb-4 px-2">
                    <button 
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head><title>Imprimir Comprovante</title></head>
                              <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#f8fafc;">
                                <img src="${selectedDoc}" style="max-width:100%;max-height:100vh;object-fit:contain;box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.1);" />
                                <script>
                                  window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }
                                </script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }
                      }}
                      className="bg-brand-blue text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-brand-blue/20"
                    >
                      <Download size={16} /> Imprimir
                    </button>
                    <button 
                      onClick={() => setSelectedDoc(null)}
                      className="bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="bg-white p-1 rounded-lg shadow-2xl overflow-hidden">
                    <img 
                      src={selectedDoc} 
                      alt="Comprovante Ampliado" 
                      className="max-w-full max-h-[75vh] object-contain block" 
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    }

    if (menuView === 'reports') {
      return (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <button 
            onClick={() => setMenuView('main')}
            className="flex items-center gap-2 text-slate-400 mb-6 active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-bold">Voltar ao Menu</span>
          </button>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Espelho de Ponto</h2>
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <button 
                  onClick={() => setEspelhoFilterType('month')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${espelhoFilterType === 'month' ? 'bg-brand-blue text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                  Por Mês
                </button>
                <button 
                  onClick={() => setEspelhoFilterType('period')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${espelhoFilterType === 'period' ? 'bg-brand-blue text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                  Por Período
                </button>
              </div>

              {espelhoFilterType === 'month' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Selecione o Mês</label>
                  <input 
                    type="month" 
                    value={espelhoMonth}
                    onChange={(e) => setEspelhoMonth(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">Data Inicial</label>
                    <input 
                      type="date" 
                      value={espelhoStartDate}
                      onChange={(e) => setEspelhoStartDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">Data Final</label>
                    <input 
                      type="date" 
                      value={espelhoEndDate}
                      onChange={(e) => setEspelhoEndDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-blue"
                    />
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={generateAndSharePDF}
              className="w-full bg-brand-blue text-white p-4 rounded-2xl font-bold text-sm shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Download size={18} />
              Gerar PDF do Espelho
            </button>
            
            <button 
              onClick={generateComprovantesPDF}
              className="w-full mt-3 bg-brand-lime text-brand-navy p-4 rounded-2xl font-bold text-sm shadow-lg shadow-brand-lime/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Download size={18} />
              Gerar PDF de Comprovantes
            </button>
            
            <button 
              onClick={generateComprovantesZIP}
              className="w-full mt-3 bg-amber-500 text-white p-4 rounded-2xl font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Download size={18} />
              Gerar ZIP de Comprovantes
            </button>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Pré-visualização (Dias Especiais)</h3>
              <div className="space-y-2">
                {(() => {
                  let start = new Date();
                  let end = new Date();
                  
                  if (espelhoFilterType === 'month' && espelhoMonth) {
                    const [year, month] = espelhoMonth.split('-');
                    start = new Date(parseInt(year), parseInt(month) - 1, 1);
                    end = new Date(parseInt(year), parseInt(month), 0);
                  } else if (espelhoFilterType === 'period' && espelhoStartDate && espelhoEndDate) {
                    start = new Date(espelhoStartDate + 'T00:00:00');
                    end = new Date(espelhoEndDate + 'T23:59:59');
                  } else {
                    return <p className="text-xs text-slate-500 text-center py-4">Selecione um período válido.</p>;
                  }

                  const days = [];
                  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const status = getDayStatus(d);
                    if (status.isHoliday || status.isVacation || status.isMedical || status.isAbsence || status.isManualAdjustment || status.isDifferentWorkload || status.isOff) {
                      days.push({
                        date: new Date(d),
                        status
                      });
                    }
                  }

                  if (days.length === 0) {
                    return <p className="text-xs text-slate-500 text-center py-4">Nenhum dia especial neste período.</p>;
                  }

                  return days.map((day, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${
                      day.status.isHoliday ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30' :
                      day.status.isVacation ? 'bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800/30' :
                      day.status.isMedical ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30' :
                      day.status.isAbsence ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/30' :
                      day.status.isManualAdjustment || day.status.isDifferentWorkload ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/30' :
                      'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          day.status.isHoliday ? 'bg-amber-100 text-amber-600' :
                          day.status.isVacation ? 'bg-sky-100 text-sky-600' :
                          day.status.isMedical ? 'bg-emerald-100 text-emerald-600' :
                          day.status.isAbsence ? 'bg-rose-100 text-rose-600' :
                          day.status.isManualAdjustment || day.status.isDifferentWorkload ? 'bg-indigo-100 text-indigo-600' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          <span className="text-xs font-bold">{day.date.getDate()}</span>
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${
                            day.status.isHoliday ? 'text-amber-700' :
                            day.status.isVacation ? 'text-sky-700' :
                            day.status.isMedical ? 'text-emerald-700' :
                            day.status.isAbsence ? 'text-rose-700' :
                            day.status.isManualAdjustment || day.status.isDifferentWorkload ? 'text-indigo-700' :
                            'text-slate-700 dark:text-slate-300'
                          }`}>
                            {day.status.isHoliday ? 'Feriado' :
                             day.status.isVacation ? 'Férias' :
                             day.status.isMedical ? 'Atestado Médico' :
                             day.status.isAbsence ? 'Falta' :
                             day.status.isManualAdjustment ? 'Ajuste Manual' :
                             day.status.isDifferentWorkload ? 'Carga Horária' : 'Folga'}
                          </p>
                          <p className="text-[10px] text-slate-500">{day.status.shift}</p>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (menuView === 'requests') {
      return (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <button 
            onClick={() => {
              if (showNewRequest) {
                setShowNewRequest(false);
              } else {
                setMenuView('main');
              }
            }}
            className="flex items-center gap-2 text-slate-400 mb-6 active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-bold">{showNewRequest ? 'Voltar' : 'Voltar ao Menu'}</span>
          </button>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {showNewRequest ? 'Nova Solicitação' : 'Solicitações'}
            </h2>
            {!showNewRequest && requestsList.length > 0 && (
              <button 
                onClick={() => {
                  if (window.confirm('Tem certeza que deseja apagar todas as solicitações?')) {
                    setRequestsList([]);
                  }
                }}
                className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform flex items-center gap-1"
              >
                <Trash2 size={14} />
                Limpar
              </button>
            )}
          </div>
          
          {showNewRequest ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Solicitação</label>
                <select 
                  value={requestForm.type}
                  onChange={(e) => setRequestForm({...requestForm, type: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="Ajuste de Ponto">Ajuste de Ponto</option>
                  <option value="Justificativa de Falta">Justificativa de Falta</option>
                  <option value="Férias">Férias</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Referência</label>
                <input 
                  type="date" 
                  value={requestForm.date}
                  onChange={(e) => setRequestForm({...requestForm, date: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Motivo / Descrição</label>
                <textarea 
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({...requestForm, reason: e.target.value})}
                  rows={3}
                  placeholder="Descreva o motivo da sua solicitação..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none resize-none"
                />
              </div>
              <button 
                onClick={() => {
                  if (!requestForm.date || !requestForm.reason) {
                    return; // Silently return if fields are missing
                  }
                  if (editingRequestId !== null) {
                    setRequestsList(requestsList.map(req => 
                      req.id === editingRequestId 
                        ? { ...req, type: requestForm.type, desc: requestForm.reason }
                        : req
                    ));
                    setSuccessMessage({ title: "Solicitação Atualizada", sub: "Sua solicitação foi atualizada com sucesso." });
                  } else {
                    const newReq = {
                      id: Date.now(),
                      type: requestForm.type,
                      status: 'Pendente',
                      desc: requestForm.reason,
                      color: 'amber'
                    };
                    setRequestsList([newReq, ...requestsList]);
                    setSuccessMessage({ title: "Solicitação Enviada", sub: "Sua solicitação foi enviada para análise." });
                  }
                  setShowNewRequest(false);
                  setEditingRequestId(null);
                  setRequestForm({ type: 'Ajuste de Ponto', date: '', reason: '' });
                  setShowSuccess(true);
                  setTimeout(() => setShowSuccess(false), 3000);
                }}
                className="w-full bg-brand-blue text-white p-4 rounded-2xl font-bold text-sm shadow-lg shadow-brand-blue/20 active:scale-95 transition-transform mt-2"
              >
                {editingRequestId !== null ? 'Salvar Alterações' : 'Enviar Solicitação'}
              </button>
              {editingRequestId !== null && (
                <button 
                  onClick={() => {
                    setShowNewRequest(false);
                    setEditingRequestId(null);
                    setRequestForm({ type: 'Ajuste de Ponto', date: '', reason: '' });
                  }}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 p-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform mt-2"
                >
                  Cancelar
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {requestsList.map((req) => (
                <div key={req.id} className={`bg-${req.color}-500/10 border border-${req.color}-500/20 p-4 rounded-2xl`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-sm font-bold text-${req.color}-700 dark:text-${req.color}-400`}>{req.type}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black bg-${req.color}-500 text-white px-1.5 py-0.5 rounded uppercase`}>{req.status}</span>
                      {req.status === 'Pendente' && (
                        <div className="flex items-center gap-1 ml-2">
                          <button 
                            onClick={() => {
                              setRequestForm({ type: req.type, date: new Date().toISOString().split('T')[0], reason: req.desc });
                              setEditingRequestId(req.id);
                              setShowNewRequest(true);
                            }}
                            className={`p-1.5 rounded-lg bg-${req.color}-500/20 text-${req.color}-700 dark:text-${req.color}-400 hover:bg-${req.color}-500/30 transition-colors`}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              setRequestsList(requestsList.filter(r => r.id !== req.id));
                            }}
                            className={`p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs text-${req.color}-600/70`}>{req.desc}</p>
                </div>
              ))}
              <button 
                onClick={() => setShowNewRequest(true)}
                className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-bold text-sm mt-4 active:scale-95 transition-transform hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Plus size={18} />
                Nova Solicitação
              </button>
            </div>
          )}
        </motion.div>
      );
    }

    if (menuView === 'support') {
      return (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col h-full overflow-y-auto pb-20"
        >
          <button 
            onClick={() => setMenuView('main')}
            className="flex items-center gap-2 text-slate-400 mb-6 active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-bold">Voltar ao Menu</span>
          </button>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Ajuda e Suporte</h2>
          
          <div className="space-y-6">
            {/* FAQ Section */}
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Ajuda e FAQ</h3>
              <div className="space-y-3">
                <details className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group">
                  <summary className="font-bold text-slate-900 dark:text-white cursor-pointer list-none flex justify-between items-center">
                    Registrar Ponto
                    <ChevronRight size={18} className="text-slate-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                    Para registrar seu ponto, clique no botão redondo azul no centro do menu inferior. Você também pode usar o ícone "+" no topo da tela e selecionar "Registrar Ponto". O aplicativo irá capturar sua localização e, se configurado, solicitará uma foto.
                  </p>
                </details>
                <details className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group">
                  <summary className="font-bold text-slate-900 dark:text-white cursor-pointer list-none flex justify-between items-center">
                    Dias Especiais (Férias, Faltas, etc)
                    <ChevronRight size={18} className="text-slate-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                    Para registrar Folga, Férias, Falta, Feriado, Ajuste Manual ou Carga Horária Diferente, clique no ícone "+" no topo da tela e escolha a opção desejada. Isso atualizará sua escala e bloqueará o registro de ponto normal nesses dias.
                  </p>
                </details>
                <details className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group">
                  <summary className="font-bold text-slate-900 dark:text-white cursor-pointer list-none flex justify-between items-center">
                    Espelho de Ponto
                    <ChevronRight size={18} className="text-slate-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                    Acesse o menu lateral e clique em "Espelho". Lá você pode gerar um relatório em PDF do seu mês atual ou de um período específico. A tela também mostra um resumo dos dias especiais registrados.
                  </p>
                </details>
                <details className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group">
                  <summary className="font-bold text-slate-900 dark:text-white cursor-pointer list-none flex justify-between items-center">
                    Comprovantes e Histórico
                    <ChevronRight size={18} className="text-slate-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                    No menu inferior, clique no ícone de relógio para ver o Histórico de hoje. No menu lateral, em "Comprovantes", você pode ver as fotos das marcações separadas por mês e semana.
                  </p>
                </details>
                <details className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group">
                  <summary className="font-bold text-slate-900 dark:text-white cursor-pointer list-none flex justify-between items-center">
                    Meus Dados e Ajustes
                    <ChevronRight size={18} className="text-slate-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                    Em "Meus Dados" você pode atualizar seu Nome, E-mail, CPF e Matrícula.
                  </p>
                </details>
              </div>
            </section>

            {/* Termos de Uso Section */}
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Legal</h3>
              <details className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group">
                <summary className="font-bold text-slate-900 dark:text-white cursor-pointer list-none flex justify-between items-center">
                  Termos de Uso e Privacidade
                  <ChevronRight size={18} className="text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="text-sm text-slate-500 mt-4 leading-relaxed space-y-3">
                  <p><strong>1. Uso do Aplicativo:</strong> O Meu Ponto Chronos é uma ferramenta para registro pessoal de jornada de trabalho. Os dados são armazenados localmente no seu dispositivo.</p>
                  <p><strong>2. Privacidade:</strong> Não coletamos, vendemos ou compartilhamos seus dados pessoais, fotos ou localização com terceiros. A localização e fotos são usadas exclusivamente para o registro do ponto no seu próprio aparelho.</p>
                  <p><strong>3. Responsabilidade:</strong> O usuário é responsável pela veracidade das informações registradas. O aplicativo serve como um controle auxiliar e não substitui os sistemas oficiais da sua empresa.</p>
                </div>
              </details>
            </section>

            {/* App Version Section */}
            <section className="flex flex-col items-center justify-center py-8 text-slate-400">
              <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center mb-3">
                <Clock size={24} className="text-brand-blue" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Meu Ponto Chronos</h4>
              <p className="text-xs mt-1">Versão 1.0.0 (Build 42)</p>
              <p className="text-[10px] mt-4 text-center max-w-[200px]">Desenvolvido para facilitar o controle da sua jornada de trabalho.</p>
            </section>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        className="flex flex-col"
      >
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center border-2 border-brand-blue/20">
              <User size={32} className="text-brand-blue" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{profileData.name}</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{profileData.role}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Gerencie seus dados, consulte seus comprovantes ou acesse os canais de suporte e ajustes.
          </p>
        </header>
        <div className="grid grid-cols-2 gap-5">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMenuView(item.id as any)}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 flex flex-col items-center justify-center gap-4 transition-all group"
            >
              <div className={`w-16 h-16 rounded-2xl ${item.color} flex items-center justify-center text-white shadow-lg shadow-${item.color.split('-')[1]}-500/20 group-hover:scale-110 transition-transform duration-300`}>
                <item.icon size={32} strokeWidth={1.5} />
              </div>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-center">{item.label}</span>
            </motion.button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 pb-10">
          <button 
            onClick={handleLogout}
            className="w-full bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center justify-center gap-3 text-rose-500 font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
          >
            <LogOut size={18} />
            Sair da Conta
          </button>
          <p className="text-center text-[9px] text-slate-400 mt-4 font-bold uppercase tracking-[0.2em]">Chronos v2.4.0 • Made with ❤️</p>
        </div>
      </motion.div>
    );
  };

  return (
    <ErrorBoundary>
      {isIframe && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-rose-500 text-white p-4 text-center shadow-lg">
          <p className="font-bold">Acesso à Câmera Bloqueado</p>
          <p className="text-sm mb-2">Para tirar fotos, abra o app em uma nova aba.</p>
          <button 
            onClick={() => window.open(window.location.href, '_blank')}
            className="bg-white text-rose-500 px-4 py-2 rounded-full font-bold text-sm"
          >
            Abrir em Nova Aba
          </button>
        </div>
      )}
      <div className="fixed inset-0 sm:static sm:min-h-screen bg-brand-blue sm:bg-slate-200 sm:dark:bg-slate-900 flex items-center justify-center sm:p-8">
        <div className="w-full h-full sm:h-[1000px] sm:max-h-[calc(100vh-4rem)] sm:max-w-[376px] bg-white dark:bg-slate-950 relative flex flex-col sm:rounded-[3rem] sm:border-[12px] sm:border-slate-800 sm:shadow-2xl overflow-hidden [transform:translate3d(0,0,0)]">
          <div className="flex-1 flex flex-col relative overflow-x-hidden transition-colors duration-300">
          {/* Fixed Header - Redesigned based on reference */}
      <header className="shrink-0 bg-brand-blue z-40 pt-[env(safe-area-inset-top)]">
        {/* Main Header Row */}
        <div className="px-6 py-4 flex items-center justify-between text-brand-lime shadow-md relative z-20">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 -ml-1">
              <span className="text-white font-medium text-base tracking-tighter">tv</span>
              <span className="text-white font-bold text-base">Brasil</span>
              <div className="w-4 h-4 rounded-full bg-brand-lime flex items-center justify-center mx-1">
                <div className="w-2 h-2 bg-brand-blue" style={{ borderRadius: '1px 50% 50% 50%', transform: 'rotate(-45deg)' }} />
              </div>
              <span className="text-brand-lime font-black text-base">EBC</span>
            </div>
          </div>
          <h1 className="text-xs font-bold uppercase tracking-widest absolute left-1/2 -translate-x-1/2 opacity-60">
            {currentTab === 'ponto' ? 'Dia' : 
             currentTab === 'menu' ? (
               menuView === 'main' ? 'Menu' :
               menuView === 'historico' ? 'Histórico' :
               menuView === 'reports' ? 'Relatórios' :
               menuView === 'docs' ? 'Comprovantes' :
               menuView === 'escala' ? 'Escala' :
               menuView === 'profile' ? 'Meus Dados' :
               menuView === 'settings' ? 'Ajustes' : 'Menu'
             ) : 'Chronos'}
          </h1>
          <div className="flex items-center gap-4 relative" ref={plusMenuRef}>
            <Share 
              size={20} 
              className="cursor-pointer active:scale-90 transition-transform" 
              onClick={handleShare}
            />
            <Plus 
              size={20} 
              className={`cursor-pointer active:scale-90 transition-transform ${isPlusMenuOpen ? 'rotate-45 text-brand-lime' : ''}`} 
              onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
            />
            
            <AnimatePresence>
              {isPlusMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-2 z-50 overflow-hidden"
                >
                  <div className="flex flex-col">
                    <button 
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        handleClockAction();
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                        <Fingerprint size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Registrar Ponto</span>
                        <span className="text-[9px] text-slate-400">Marcação manual</span>
                      </div>
                    </button>
                    
                    <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1 mx-2" />
                    
                    <button 
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        setSpecialRegForm({ ...specialRegForm, type: 'Folga', date: selectedDate, reason: '' });
                        setShowSpecialRegPopup(true);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-lime/20 flex items-center justify-center text-brand-navy">
                        <Coffee size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Folga</span>
                        <span className="text-[9px] text-slate-400">Registrar folga</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        setSpecialRegForm({ ...specialRegForm, type: 'Férias', date: selectedDate, reason: '' });
                        setShowSpecialRegPopup(true);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
                        <Umbrella size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Férias</span>
                        <span className="text-[9px] text-slate-400">Registrar férias</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        setSpecialRegForm({ ...specialRegForm, type: 'Falta', date: selectedDate, reason: '' });
                        setShowSpecialRegPopup(true);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                        <AlertCircle size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Falta</span>
                        <span className="text-[9px] text-slate-400">Registrar ausência</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        setSpecialRegForm({ ...specialRegForm, type: 'Feriado', date: selectedDate, reason: '' });
                        setShowSpecialRegPopup(true);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Flag size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Feriado</span>
                        <span className="text-[9px] text-slate-400">Registrar feriado</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        setSpecialRegForm({ ...specialRegForm, type: 'Ajuste Manual', date: selectedDate, reason: '', time: '09:00 - 18:00' });
                        setShowSpecialRegPopup(true);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Edit3 size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Ajuste Manual</span>
                        <span className="text-[9px] text-slate-400">Ajustar horário</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        setSpecialRegForm({ ...specialRegForm, type: 'Carga Horária Diferente', date: selectedDate, reason: '', time: '09:00 - 18:00' });
                        setShowSpecialRegPopup(true);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <Clock size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Carga Horária</span>
                        <span className="text-[9px] text-slate-400">Horário diferente</span>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Date Navigation Bar & Stats Row - ONLY FOR PONTO */}
        {currentTab === 'ponto' && (
          <>
            <div className="bg-white dark:bg-slate-900 px-6 py-2 flex items-center justify-between h-[44px]">
              <button 
                onClick={() => {
                  const prev = new Date(selectedDate);
                  prev.setDate(prev.getDate() - 1);
                  setSelectedDate(prev);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors active:scale-90 w-[30px] h-[34px] flex items-center justify-center"
              >
                <ChevronLeft size={28} />
              </button>
              <div className="flex items-center gap-2 relative">
                <span className="text-lg font-bold text-slate-600 dark:text-slate-300 capitalize">
                  {formatDate(selectedDate)}
                </span>
                <input 
                  type="date"
                  value={getDateKey(selectedDate)}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split('-');
                      setSelectedDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
                    }
                  }}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                {selectedDate.toDateString() !== new Date().toDateString() && (
                  <button 
                    onClick={() => setSelectedDate(new Date())}
                    className="text-[10px] font-black text-brand-blue dark:text-brand-lime bg-brand-blue/10 dark:bg-brand-lime/10 px-2 py-0.5 rounded-md uppercase tracking-tighter active:scale-90 transition-transform z-10"
                  >
                    Hoje
                  </button>
                )}
              </div>
              <button 
                onClick={() => {
                  const next = new Date(selectedDate);
                  next.setDate(next.getDate() + 1);
                  setSelectedDate(next);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors active:scale-90 w-[28px] h-[35px] flex items-center justify-center"
              >
                <ChevronRight size={28} />
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 px-6 py-3 grid grid-cols-3 gap-2 h-[57.5px] shadow-md relative z-10">
              <div className="flex flex-col items-center -ml-[23px]">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-1">Trab. no dia</span>
                <span className="text-xs font-black text-slate-600 dark:text-slate-400">{stats.worked}</span>
              </div>
              <div className="flex flex-col items-center border-x border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-1">Saldo do dia</span>
                <span className={`text-xs font-black ${stats.balance.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stats.balance}
                </span>
              </div>
              <div className="flex flex-col items-center -mr-[23px]">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-1">
                  Trab. no Mês
                </span>
                <span className="text-xs font-black text-brand-blue dark:text-brand-lime">
                  {getMonthlyStats(new Date()).worked}
                </span>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Content */}
      <main className={`flex-1 mb-[70px] ${currentTab === 'ponto' ? 'px-0 pb-48 pt-4' : currentTab === 'menu' ? 'px-6 pb-0 pt-2' : 'px-6 pb-40 pt-8'} overscroll-none ${
        currentTab === 'ponto' && logs.filter(l => l.timestamp.toDateString() === selectedDate.toDateString()).length <= 4 
        ? 'overflow-hidden' 
        : 'overflow-y-auto'
      }`}>
        {/* RLS Warning Banner */}
        {isRLSBlocked && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-rose-500 text-white px-6 py-3 flex items-center justify-between gap-4 overflow-hidden mb-4"
          >
            <div className="flex items-center gap-3">
              <Shield size={20} className="flex-shrink-0" />
              <p className="text-[11px] font-bold leading-tight">
                Banco de dados bloqueado (Erro RLS). Clique para corrigir agora e permitir o salvamento.
              </p>
            </div>
            <button 
              onClick={() => setShowDatabaseHelp(true)}
              className="bg-white text-rose-500 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap active:scale-95 transition-transform"
            >
              Corrigir
            </button>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          {currentTab === 'ponto' && (
            <div className="w-full">
              {renderPontoView()}
            </div>
          )}
          {currentTab === 'extra_menu' && renderExtraMenuView()}
          {currentTab === 'menu' && renderMenuView()}
        </AnimatePresence>
      </main>
      </div>

      {/* Fixed Time and FAB */}
      <AnimatePresence>
        {currentTab === 'ponto' && selectedDate.toDateString() === new Date().toDateString() && (
          <div className="absolute bottom-[90px] left-0 right-0 pointer-events-none z-30 px-6 flex justify-center items-end">
            <div className="pointer-events-auto px-4 py-1">
              <span className="text-3xl font-black text-slate-700 dark:text-slate-200 tabular-nums tracking-tight">
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            
            <div className="absolute right-6 pointer-events-auto">
              <motion.button 
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                onClick={() => {
                  const dateStr = selectedDate.toDateString();
                  const dayLogs = logs.filter(l => l.timestamp.toDateString() === dateStr)
                    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                  const lastLog = dayLogs[dayLogs.length - 1];
                  
                  let nextAction: TimeLog['type'] = 'in';
                  if (lastLog) {
                    if (lastLog.type === 'in') nextAction = 'break_start';
                    else if (lastLog.type === 'break_start') nextAction = 'break_end';
                    else if (lastLog.type === 'break_end') nextAction = 'out';
                    else if (lastLog.type === 'out') nextAction = 'in';
                  }
                  handleClockAction(nextAction);
                }}
                className="w-11 h-11 bg-orange-500 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all"
              >
                <div className="relative">
                  <Clock size={18} />
                  <Plus size={9} className="absolute -top-1 -right-1 bg-orange-500 rounded-full border-2 border-orange-500" />
                </div>
              </motion.button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigation Bar - 5 buttons for perfect centering of 'Dia' */}
      <nav className="absolute bottom-0 left-0 right-0 z-40 bg-brand-blue h-[72.5px]">
        {/* The Bleed: Background that extends far below the screen to cover any gaps */}
        <div className="absolute inset-x-0 top-0 -bottom-[500px] bg-white w-0 h-0 -z-10" />
        <div className="bg-brand-blue px-2 pt-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] mb-[102px] flex justify-between items-center relative">
          
          <button 
            onClick={() => {
              setCurrentTab('menu');
              setMenuView('main');
            }}
            className={`flex flex-col items-center gap-1 flex-1 transition-all active:scale-90 ${currentTab === 'menu' && menuView === 'main' ? 'text-brand-lime scale-125' : 'text-brand-lime/40'}`}
          >
            <LayoutGrid size={currentTab === 'menu' && menuView === 'main' ? 24 : 20} />
            <span className="text-[8px] font-bold uppercase">Menu</span>
          </button>

          <button 
            onClick={() => {
              setCurrentTab('ponto');
              setSelectedDate(new Date());
            }}
            className={`flex flex-col items-center gap-1 flex-1 transition-all active:scale-90 ${currentTab === 'ponto' ? 'text-brand-lime scale-125' : 'text-brand-lime/40'}`}
          >
            <Fingerprint size={currentTab === 'ponto' ? 24 : 20} />
            <span className="text-[8px] font-bold uppercase">Dia</span>
          </button>

          {/* Settings on the right for balance */}
          <button 
            onClick={() => {
              setCurrentTab('menu');
              setMenuView('settings');
            }}
            className={`flex flex-col items-center gap-1 flex-1 transition-all active:scale-90 ${currentTab === 'menu' && menuView === 'settings' ? 'text-brand-lime scale-125' : 'text-brand-lime/40'}`}
          >
            <Settings size={currentTab === 'menu' && menuView === 'settings' ? 24 : 20} />
            <span className="text-[8px] font-bold uppercase">Ajustes</span>
          </button>
        </div>
      </nav>

      {/* Day Alert Notification */}
      <AnimatePresence>
        {showDayAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-24 left-6 right-6 p-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 border ${
              dayAlertMessage.type === 'holiday' 
                ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900' 
                : 'bg-brand-lime/10 dark:bg-brand-lime/5 border-brand-lime/20 dark:border-brand-lime/10 backdrop-blur-md'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              dayAlertMessage.type === 'holiday' 
                ? 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400' 
                : 'bg-brand-lime text-brand-navy'
            }`}>
              {dayAlertMessage.type === 'holiday' ? <AlertCircle size={18} /> : <Calendar size={18} />}
            </div>
            <div>
              <p className={`font-bold text-sm ${dayAlertMessage.type === 'holiday' ? 'text-amber-900 dark:text-amber-100' : 'text-brand-navy dark:text-brand-lime'}`}>
                {dayAlertMessage.title}
              </p>
              <p className={`text-xs ${dayAlertMessage.type === 'holiday' ? 'text-amber-700 dark:text-amber-400' : 'text-brand-navy/70 dark:text-brand-lime/70'}`}>
                {dayAlertMessage.sub}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Database Help Popup */}
      <AnimatePresence>
        {showDatabaseHelp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative"
            >
              <button 
                onClick={() => setShowDatabaseHelp(false)}
                className="absolute top-6 right-6 w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 active:scale-95 transition-transform"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-4">
                  <Shield size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Corrigir Permissões</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Siga os passos abaixo no seu painel do Supabase para liberar o salvamento de dados.
                </p>
              </div>

              <div className="space-y-6 mb-8">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-brand-blue text-white flex-shrink-0 flex items-center justify-center text-xs font-black">1</div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                    Acesse o <span className="text-brand-blue">SQL Editor</span> no menu lateral do Supabase.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-brand-blue text-white flex-shrink-0 flex items-center justify-center text-xs font-black">2</div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                    Clique em <span className="text-brand-blue">"New Query"</span> e cole o código abaixo:
                  </p>
                </div>
                
                <div className="bg-slate-950 rounded-2xl p-4 relative group">
                  <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto">
                    {`ALTER TABLE logs DISABLE ROW LEVEL SECURITY;\nALTER TABLE profiles DISABLE ROW LEVEL SECURITY;\nALTER TABLE settings DISABLE ROW LEVEL SECURITY;\nALTER TABLE custom_shifts DISABLE ROW LEVEL SECURITY;`}
                  </pre>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`ALTER TABLE logs DISABLE ROW LEVEL SECURITY;\nALTER TABLE profiles DISABLE ROW LEVEL SECURITY;\nALTER TABLE settings DISABLE ROW LEVEL SECURITY;\nALTER TABLE custom_shifts DISABLE ROW LEVEL SECURITY;`);
                      alert('Código copiado!');
                    }}
                    className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                  >
                    <Download size={14} />
                  </button>
                </div>

                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-brand-blue text-white flex-shrink-0 flex items-center justify-center text-xs font-black">3</div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                    Clique no botão <span className="text-emerald-500">"Run"</span> para aplicar as mudanças.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowDatabaseHelp(false)}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all"
              >
                Entendi, vou fazer isso
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Log Popup */}
      <AnimatePresence>
        {showManualLogPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white dark:bg-slate-900 w-full rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-w-md mx-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Novo Registro Manual</h3>
                <button 
                  onClick={() => setShowManualLogPopup(false)}
                  className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 active:scale-95 transition-transform"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Data</label>
                  <input 
                    type="date" 
                    value={manualLogForm.date}
                    onChange={(e) => setManualLogForm({...manualLogForm, date: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Horário</label>
                    <input 
                      type="time" 
                      value={manualLogForm.time}
                      onChange={(e) => setManualLogForm({...manualLogForm, time: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Tipo</label>
                    <select 
                      value={manualLogForm.type}
                      onChange={(e) => setManualLogForm({...manualLogForm, type: e.target.value as any})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-colors appearance-none"
                    >
                      <option value="in">Entrada</option>
                      <option value="break_start">Início Intervalo</option>
                      <option value="break_end">Fim Intervalo</option>
                      <option value="out">Saída</option>
                      <option value="manual_adjustment">Ajuste Manual</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Observações</label>
                  <textarea 
                    value={manualLogForm.observations}
                    onChange={(e) => setManualLogForm({...manualLogForm, observations: e.target.value})}
                    placeholder="Ex: Esqueci de bater o ponto..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-colors resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleManualLogSave}
                className="w-full py-4 bg-brand-blue text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-blue/20 active:scale-[0.98] transition-all"
              >
                Salvar Registro
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Preferences Popup */}
      <AnimatePresence>
        {showNotificationPrefs && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white dark:bg-slate-900 w-full rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notificações</h3>
                <button 
                  onClick={() => setShowNotificationPrefs(false)}
                  className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 active:scale-95 transition-transform"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Alertas do Dia</p>
                    <p className="text-[10px] text-slate-500">Avisos sobre feriados e folgas.</p>
                  </div>
                  <div 
                    onClick={() => saveSettings({...settings, notificationPrefs: {...settings.notificationPrefs, alerts: !settings.notificationPrefs?.alerts}})}
                    className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors ${settings.notificationPrefs?.alerts ? 'bg-brand-blue text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    {settings.notificationPrefs?.alerts && <Check size={14} />}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Lembretes de Ponto</p>
                    <p className="text-[10px] text-slate-500">Avisos para não esquecer de bater o ponto.</p>
                  </div>
                  <div 
                    onClick={() => saveSettings({...settings, notificationPrefs: {...settings.notificationPrefs, reminders: !settings.notificationPrefs?.reminders}})}
                    className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors ${settings.notificationPrefs?.reminders ? 'bg-brand-blue text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    {settings.notificationPrefs?.reminders && <Check size={14} />}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Avisos do Sistema</p>
                    <p className="text-[10px] text-slate-500">Atualizações e mensagens importantes.</p>
                  </div>
                  <div 
                    onClick={() => saveSettings({...settings, notificationPrefs: {...settings.notificationPrefs, system: !settings.notificationPrefs?.system}})}
                    className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors ${settings.notificationPrefs?.system ? 'bg-brand-blue text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    {settings.notificationPrefs?.system && <Check size={14} />}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowNotificationPrefs(false)}
                className="w-full bg-brand-blue text-white p-3 rounded-2xl font-bold text-sm shadow-lg shadow-brand-blue/20 active:scale-95 transition-transform"
              >
                Concluído
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-6 right-6 bg-brand-navy text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 z-30 border border-white/10"
          >
            <div className="w-8 h-8 rounded-full bg-brand-lime flex items-center justify-center text-brand-navy">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="font-bold text-sm">{successMessage.title || "Registro Realizado!"}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{successMessage.sub || `Ponto registrado com sucesso às ${formatTime(new Date())}`}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Status Popup */}
      <AnimatePresence>
        {showDayStatusPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDayStatusPopup(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Motivo / Observação</h3>
                  <button 
                    onClick={() => setShowDayStatusPopup(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Tipo de Dia</label>
                    {renderDayStatusTypeSelect(dayStatusForm.type, (val) => setDayStatusForm({ ...dayStatusForm, type: val }))}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Descrição / Motivo</label>
                    <input
                      type="text"
                      value={dayStatusForm.reason}
                      onChange={(e) => setDayStatusForm({ ...dayStatusForm, reason: e.target.value })}
                      placeholder="Ex: Feriado Nacional, Folga Compensatória..."
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-colors"
                    />
                  </div>

                  <button
                    onClick={() => {
                      const dateKey = getDateKey(selectedDate);
                      const type = dayStatusForm.type;
                      
                      const updatedShiftData = {
                        shift: dayStatusForm.reason || type,
                        isOff: ['Folga', 'Férias', 'Atestado Médico', 'Feriado', 'Falta'].includes(type),
                        isHoliday: type === 'Feriado',
                        isVacation: type === 'Férias',
                        isMedical: type === 'Atestado Médico',
                        isAbsence: type === 'Falta',
                        isManualAdjustment: type === 'Ajuste Manual',
                        isDifferentWorkload: type === 'Carga Horária Diferente'
                      };
                      
                      if (user) {
                        // Hierarchy: Special registrations override normal logs
                        const dateStr = selectedDate.toDateString();
                        const logsToDelete = logs.filter(l => l.timestamp.toDateString() === dateStr);
                        
                        const performUpdate = async () => {
                          try {
                            if (logsToDelete.length > 0) {
                              const logIds = logsToDelete.map(l => l.id);
                              await supabase.from('logs').delete().in('id', logIds);
                            }
                            
                            await supabase.from('custom_shifts').upsert({
                              user_id: user.supabaseId,
                              date_key: dateKey,
                              shift: updatedShiftData.shift,
                              is_off: updatedShiftData.isOff,
                              is_holiday: updatedShiftData.isHoliday,
                              is_vacation: updatedShiftData.isVacation,
                              is_medical: updatedShiftData.isMedical,
                              is_absence: updatedShiftData.isAbsence,
                              is_manual_adjustment: updatedShiftData.isManualAdjustment,
                              is_different_workload: updatedShiftData.isDifferentWorkload,
                              updated_at: new Date().toISOString()
                            });
                          } catch (err) {
                            console.error("Error updating day status:", err);
                          }
                        };
                        
                        performUpdate();
                      }
                      
                      setShowDayStatusPopup(false);
                      setSuccessMessage({ title: "Atualizado", sub: "Motivo atualizado com sucesso." });
                      setShowSuccess(true);
                      setTimeout(() => setShowSuccess(false), 2000);
                    }}
                    className="w-full bg-brand-blue text-white p-4 rounded-xl font-bold text-sm shadow-lg shadow-brand-blue/20 active:scale-95 transition-transform mt-2"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Special Registration Popup */}
      <AnimatePresence>
        {showSpecialRegPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSpecialRegPopup(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Registrar {specialRegForm.type}</h3>
                  <button 
                    onClick={() => setShowSpecialRegPopup(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Tipo de Registro</label>
                    {renderDayStatusTypeSelect(specialRegForm.type, (val) => setSpecialRegForm({ ...specialRegForm, type: val }))}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Data</label>
                    <input
                      type="date"
                      value={getDateKey(specialRegForm.date)}
                      onChange={(e) => {
                        const [year, month, day] = e.target.value.split('-');
                        setSpecialRegForm({ ...specialRegForm, date: new Date(Number(year), Number(month) - 1, Number(day)) });
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-colors"
                    />
                  </div>

                  {(specialRegForm.type === 'Ajuste Manual' || specialRegForm.type === 'Carga Horária Diferente') && (
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Horário / Turno</label>
                      <input
                        type="text"
                        value={specialRegForm.time}
                        onChange={(e) => setSpecialRegForm({ ...specialRegForm, time: e.target.value })}
                        placeholder="Ex: 09:00 - 18:00"
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-colors"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Motivo</label>
                    <input
                      type="text"
                      value={specialRegForm.reason}
                      onChange={(e) => setSpecialRegForm({ ...specialRegForm, reason: e.target.value })}
                      placeholder={`Ex: ${specialRegForm.type}...`}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Justificativa</label>
                    <input
                      type="text"
                      value={specialRegForm.justification}
                      onChange={(e) => setSpecialRegForm({ ...specialRegForm, justification: e.target.value })}
                      placeholder="Ex: Motivo detalhado..."
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-colors"
                    />
                  </div>

                  <button
                    onClick={() => {
                      const dateKey = getDateKey(specialRegForm.date);
                      const currentCustom = customShifts[dateKey] || { isOff: false, shift: '09:00 - 18:00' };
                      
                      const updatedShiftData = {
                        ...currentCustom,
                        shift: specialRegForm.reason || specialRegForm.type,
                        isOff: ['Folga', 'Férias', 'Falta', 'Feriado', 'Atestado Médico'].includes(specialRegForm.type),
                        isHoliday: specialRegForm.type === 'Feriado',
                        isVacation: specialRegForm.type === 'Férias',
                        isAbsence: specialRegForm.type === 'Falta',
                        isManualAdjustment: specialRegForm.type === 'Ajuste Manual',
                        isDifferentWorkload: specialRegForm.type === 'Carga Horária Diferente',
                        reason: specialRegForm.reason,
                        justification: specialRegForm.justification,
                      };

                      if ((specialRegForm.type === 'Ajuste Manual' || specialRegForm.type === 'Carga Horária Diferente') && specialRegForm.time) {
                        updatedShiftData.shift = specialRegForm.time;
                        if (specialRegForm.reason) {
                          updatedShiftData.shift += ` (${specialRegForm.reason})`;
                        }
                      }
                      
                      if (user) {
                        // Hierarchy: Special registrations override normal logs
                        const dateStr = specialRegForm.date.toDateString();
                        const logsToDelete = logs.filter(l => l.timestamp.toDateString() === dateStr);
                        
                        const performUpdate = async () => {
                          try {
                            if (logsToDelete.length > 0) {
                              const logIds = logsToDelete.map(l => l.id);
                              await supabase.from('logs').delete().in('id', logIds);
                            }
                            
                            await supabase.from('custom_shifts').upsert({
                              user_id: user.supabaseId,
                              date_key: dateKey,
                              shift: updatedShiftData.shift,
                              is_off: updatedShiftData.isOff,
                              is_holiday: updatedShiftData.isHoliday,
                              is_vacation: updatedShiftData.isVacation,
                              is_absence: updatedShiftData.isAbsence,
                              is_manual_adjustment: updatedShiftData.isManualAdjustment,
                              is_different_workload: updatedShiftData.isDifferentWorkload,
                              updated_at: new Date().toISOString()
                            });
                          } catch (err) {
                            console.error("Error saving special registration:", err);
                          }
                        };
                        
                        performUpdate();
                      }
                      
                      setShowSpecialRegPopup(false);
                      setSuccessMessage({ title: "Registrado", sub: `${specialRegForm.type} registrado com sucesso.` });
                      setShowSuccess(true);
                      setTimeout(() => setShowSuccess(false), 3000);
                    }}
                    className="w-full bg-brand-blue text-white p-4 rounded-xl font-bold text-sm shadow-lg shadow-brand-blue/20 active:scale-95 transition-transform mt-2"
                  >
                    Salvar Registro
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Popup */}
      <AnimatePresence>
        {showRegPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRegPopup(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full sm:max-w-xs bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center mb-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">
                  Registro de Ponto
                </h3>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      const newDate = new Date(regTime);
                      newDate.setMinutes(newDate.getMinutes() - 1);
                      setRegTime(newDate);
                    }}
                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90 transition-transform"
                  >
                    <Minus size={16} />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={2}
                      value={hoursInput}
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => {
                        const num = parseInt(e.target.value);
                        if (!isNaN(num) && num >= 0 && num < 24) {
                          const newDate = new Date(regTime);
                          newDate.setHours(num);
                          setRegTime(newDate);
                        } else {
                          setHoursInput(regTime.getHours().toString().padStart(2, '0'));
                        }
                      }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 2) val = val.slice(0, 2);
                        setHoursInput(val);
                        
                        const num = parseInt(val);
                        if (val.length === 2 && !isNaN(num) && num >= 0 && num < 24) {
                          const newDate = new Date(regTime);
                          newDate.setHours(num);
                          setRegTime(newDate);
                        }
                      }}
                      className="w-14 text-4xl font-black text-brand-blue dark:text-brand-lime bg-transparent text-center outline-none focus:ring-0 p-0"
                    />
                    <span className="text-4xl font-black text-brand-blue dark:text-brand-lime">:</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={2}
                      value={minutesInput}
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => {
                        const num = parseInt(e.target.value);
                        if (!isNaN(num) && num >= 0 && num < 60) {
                          const newDate = new Date(regTime);
                          newDate.setMinutes(num);
                          setRegTime(newDate);
                        } else {
                          setMinutesInput(regTime.getMinutes().toString().padStart(2, '0'));
                        }
                      }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 2) val = val.slice(0, 2);
                        setMinutesInput(val);
                        
                        const num = parseInt(val);
                        if (val.length === 2 && !isNaN(num) && num >= 0 && num < 60) {
                          const newDate = new Date(regTime);
                          newDate.setMinutes(num);
                          setRegTime(newDate);
                        }
                      }}
                      className="w-14 text-4xl font-black text-brand-blue dark:text-brand-lime bg-transparent text-center outline-none focus:ring-0 p-0"
                    />
                  </div>

                  <button 
                    onClick={() => {
                      const newDate = new Date(regTime);
                      newDate.setMinutes(newDate.getMinutes() + 1);
                      setRegTime(newDate);
                    }}
                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90 transition-transform"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Registro</label>
                  <select 
                    value={pendingLogType || ''}
                    onChange={(e) => {
                      setPendingLogType(e.target.value as TimeLog['type']);
                      setShowDuplicateWarning(false);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="in">Entrada</option>
                    <option value="break_start">Saída Pausa</option>
                    <option value="break_end">Retorno Pausa</option>
                    <option value="out">Saída</option>
                  </select>
                </div>

                {showDuplicateWarning && (
                  <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      Você já registrou um evento deste tipo anteriormente. Tem certeza que deseja registrar novamente sem um evento intermediário?
                    </p>
                  </div>
                )}

                <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${shouldCapturePhoto ? 'bg-brand-blue border-brand-blue' : 'border-slate-300 dark:border-slate-600'}`}>
                    {shouldCapturePhoto && <Check size={14} className="text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={shouldCapturePhoto}
                    onChange={(e) => setShouldCapturePhoto(e.target.checked)}
                  />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Adicionar foto</span>
                </label>

                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Tipo de ponto / Observações"
                    value={regObservations}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setRegObservations(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-slate-100 dark:border-slate-800 py-2 px-1 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-brand-blue transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    setShowRegPopup(false);
                    setRegObservations("");
                  }}
                  className="py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    confirmRegistration();
                  }}
                  className={`py-3.5 rounded-none text-white text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all ${showDuplicateWarning ? 'bg-amber-500' : 'bg-brand-blue'}`}
                >
                  {showDuplicateWarning ? 'Confirmar Duplicado' : 'Registrar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Screen Camera */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed top-0 left-0 w-full h-[100dvh] z-[110] bg-black"
          >
            <div className="absolute inset-0 overflow-hidden">
              {!capturedImage ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src={capturedImage} 
                  className="w-full h-full object-cover"
                  alt="Captured"
                />
              )}
              
              {/* Camera Header Controls */}
              <div className="absolute top-12 left-0 right-0 px-6 flex justify-between items-center z-20">
                <button 
                  onClick={() => {
                    setIsCameraOpen(false);
                    setCapturedImage(null);
                    stopCamera();
                  }}
                  className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white"
                >
                  <X size={24} />
                </button>

                {!capturedImage && cameraCapabilities?.torch && (
                  <button 
                    onClick={() => setIsCameraFlashOn(!isCameraFlashOn)}
                    className={`p-3 rounded-full backdrop-blur-md transition-colors ${isCameraFlashOn ? 'bg-brand-lime text-black' : 'bg-black/40 text-white'}`}
                  >
                    <Sun size={24} className={isCameraFlashOn ? 'fill-current' : ''} />
                  </button>
                )}
              </div>

              {/* Zoom Control for Main Camera */}
              {!capturedImage && cameraCapabilities?.zoom && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 z-20">
                  <button onClick={() => setCameraZoom(prev => Math.min(cameraCapabilities.zoom.max, prev + 0.5))} className="text-white p-1 active:scale-90">
                    <Plus size={18} />
                  </button>
                  <div className="h-32 w-1 bg-white/20 rounded-full relative">
                    <div 
                      className="absolute bottom-0 left-0 w-full bg-brand-lime rounded-full transition-all"
                      style={{ height: `${((cameraZoom - cameraCapabilities.zoom.min) / (cameraCapabilities.zoom.max - cameraCapabilities.zoom.min)) * 100}%` }}
                    />
                  </div>
                  <button onClick={() => setCameraZoom(prev => Math.max(cameraCapabilities.zoom.min, prev - 0.5))} className="text-white p-1 active:scale-90">
                    <Minus size={18} />
                  </button>
                </div>
              )}
              
              {/* Camera Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-64 h-80 border-2 border-white/30 rounded-3xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-blue rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-blue rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-blue rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-blue rounded-br-lg" />
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 w-full pb-12 pt-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center gap-6 z-10">
              {!capturedImage ? (
                <div className="flex items-center justify-center gap-12 relative w-full px-12">
                  <div className="w-12 h-12" /> {/* Spacer for centering */}
                  <button 
                    onClick={takePhoto}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1"
                  >
                    <div className="w-full h-full bg-white rounded-full active:scale-90 transition-transform" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <ImageIcon size={24} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-12">
                  <button 
                    onClick={retakePhoto}
                    className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <X size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Refazer</span>
                  </button>
                  <button 
                    onClick={usePhoto}
                    className="flex flex-col items-center gap-2 text-white"
                  >
                    <div className="w-20 h-20 rounded-full bg-brand-blue flex items-center justify-center shadow-2xl shadow-brand-blue/40 active:scale-95 transition-all">
                      <Check size={32} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Usar Foto</span>
                  </button>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Inputs for Tickets */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[110] flex flex-col items-center justify-center p-6"
            onClick={() => setViewingImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative max-w-full max-h-[70vh] rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={viewingImage.url} 
                alt="Ticket Large" 
                className="max-w-full max-h-[70vh] object-contain"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setViewingImage(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-md"
              >
                <X size={20} />
              </button>
            </motion.div>
            
            <div className="mt-8 flex flex-col gap-3 w-full max-w-[280px]" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => {
                  triggerFileUpload(viewingImage.logId, 'camera');
                  setViewingImage(null);
                }}
                className="w-full px-6 py-4 bg-brand-blue text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl"
              >
                <Camera size={20} />
                Tirar Nova Foto
              </button>
              <button 
                onClick={() => {
                  triggerFileUpload(viewingImage.logId, 'gallery');
                  setViewingImage(null);
                }}
                className="w-full px-6 py-4 bg-white/10 text-white rounded-2xl font-bold border border-white/20 backdrop-blur-md flex items-center justify-center gap-3"
              >
                <ImageIcon size={20} />
                Escolher da Galeria
              </button>
              <button 
                onClick={() => setViewingImage(null)}
                className="w-full px-6 py-3 text-slate-400 font-bold text-sm"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional Image Editor (Cropper) */}
      <AnimatePresence>
        {isCropping && imageToCrop && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[120] bg-slate-950 flex flex-col"
          >
            <div className="pt-16 pb-6 px-6 flex items-center justify-center bg-slate-900/50 backdrop-blur-md border-b border-slate-800">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Ajustar Imagem</h3>
            </div>

            <div className="flex-1 relative bg-black flex flex-col overflow-hidden">
              {/* Image Area - Scrollable if zoomed */}
              <div 
                className="flex-1 w-full overflow-auto flex items-center justify-center p-4 bg-slate-950 touch-none"
                onWheel={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -0.1 : 0.1;
                    setZoom(prev => Math.min(Math.max(1, prev + delta), 3));
                  }
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 2) {
                    const dist = Math.hypot(
                      e.touches[0].pageX - e.touches[1].pageX,
                      e.touches[0].pageY - e.touches[1].pageY
                    );
                    const angle = Math.atan2(
                      e.touches[0].pageY - e.touches[1].pageY,
                      e.touches[0].pageX - e.touches[1].pageX
                    ) * 180 / Math.PI;
                    
                    (e.currentTarget as any)._initialDist = dist;
                    (e.currentTarget as any)._initialZoom = zoom;
                    (e.currentTarget as any)._initialAngle = angle;
                    (e.currentTarget as any)._initialRotation = rotation;
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 2 && (e.currentTarget as any)._initialDist) {
                    const dist = Math.hypot(
                      e.touches[0].pageX - e.touches[1].pageX,
                      e.touches[0].pageY - e.touches[1].pageY
                    );
                    const angle = Math.atan2(
                      e.touches[0].pageY - e.touches[1].pageY,
                      e.touches[0].pageX - e.touches[1].pageX
                    ) * 180 / Math.PI;
                    
                    const scale = dist / (e.currentTarget as any)._initialDist;
                    const rotationDiff = angle - (e.currentTarget as any)._initialAngle;
                    
                    setZoom(Math.min(Math.max(1, (e.currentTarget as any)._initialZoom * scale), 3));
                    setRotation((((e.currentTarget as any)._initialRotation + rotationDiff) % 360 + 360) % 360);
                  }
                }}
              >
                <div style={{ 
                  transform: `rotate(${rotation}deg)`, 
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'inline-block'
                }}>
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                  >
                    <img 
                      src={imageToCrop || ''} 
                      alt="Crop" 
                      className="block select-none pointer-events-none"
                      style={{ 
                        width: `${zoom * 100}%`,
                        maxWidth: zoom > 1 ? 'none' : '100%',
                        maxHeight: zoom > 1 ? 'none' : '65vh',
                        objectFit: 'contain',
                        filter: `grayscale(1) contrast(${contrast}%) brightness(${brightness}%)`
                      }}
                    />
                  </ReactCrop>
                </div>
              </div>

              {/* Action Buttons - Fixed at bottom of image area */}
              <div className="w-full px-6 py-4 flex items-center gap-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 z-10">
                <button 
                  onClick={() => {
                    setIsCropping(false);
                    setImageToCrop(null);
                    setActiveLogId(null);
                    setRotation(0);
                    setAspect(3 / 4);
                    setZoom(1);
                  }} 
                  className="flex-1 py-3 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-transform"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveCroppedImage}
                  disabled={isSavingPhoto}
                  className={`flex-[2] py-3 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isSavingPhoto ? 'bg-slate-700 cursor-not-allowed' : 'bg-brand-blue shadow-brand-blue/20'}`}
                >
                  {isSavingPhoto ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Recorte'
                  )}
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-900 space-y-6 border-t border-slate-800">
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => setAspect(undefined)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!aspect ? 'bg-brand-blue text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  Livre
                </button>
                <button 
                  onClick={() => setAspect(3/4)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${aspect === 3/4 ? 'bg-brand-blue text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  3:4
                </button>
                <button 
                  onClick={() => setAspect(1)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${aspect === 1 ? 'bg-brand-blue text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  1:1
                </button>
                <button 
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-colors"
                  title="Girar 90°"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase w-12">Zoom</span>
                  <input 
                    type="range" 
                    min={1} 
                    max={2.5} 
                    step={0.01} 
                    value={zoom} 
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-800 rounded-full appearance-none accent-brand-blue"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase w-12">Brilho</span>
                  <input 
                    type="range" 
                    min={50} 
                    max={200} 
                    step={1} 
                    value={brightness} 
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-800 rounded-full appearance-none accent-brand-blue"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase w-12">Contraste</span>
                  <input 
                    type="range" 
                    min={50} 
                    max={250} 
                    step={1} 
                    value={contrast} 
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-800 rounded-full appearance-none accent-brand-blue"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Time Modal */}
      <AnimatePresence>
        {editingLog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingLog(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full sm:max-w-xs bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Editar Marcação</h3>
                    <div className="mt-2 relative">
                      <select
                        value={editingLog.type}
                        onChange={(e) => setEditingLog(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                        className="appearance-none bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1 px-3 pr-8 text-[10px] font-bold text-brand-blue dark:text-brand-blue uppercase tracking-widest outline-none focus:ring-1 focus:ring-brand-blue/30 transition-all"
                      >
                        <option value="in">Entrada</option>
                        <option value="break_start">Início Intervalo</option>
                        <option value="break_end">Fim Intervalo</option>
                        <option value="out">Saída</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-brand-blue/50">
                        <ChevronRight size={12} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditingLog(null)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-4 mb-8">
                  {/* Photo Section in Edit Modal */}
                  <div 
                    className="w-full aspect-video rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors overflow-hidden relative group"
                  >
                    {editingLog.ticketImage ? (
                      <>
                        <img 
                          src={editingLog.ticketImage} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                          <button 
                            onClick={(e) => { e.stopPropagation(); triggerFileUpload(editingLog.id, 'camera'); }}
                            className="flex flex-col items-center gap-2 text-white hover:text-brand-blue transition-colors"
                          >
                            <Camera size={24} />
                            <span className="text-[10px] font-bold uppercase">Câmera</span>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); triggerFileUpload(editingLog.id, 'gallery'); }}
                            className="flex flex-col items-center gap-2 text-white hover:text-brand-blue transition-colors"
                          >
                            <ImageIcon size={24} />
                            <span className="text-[10px] font-bold uppercase">Galeria</span>
                          </button>
                        </div>
                        {editingLog.ticketImage && !isProcessingOCR && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              extractNSR(editingLog.ticketImage!, editingLog.id);
                            }}
                            className="absolute bottom-2 right-2 p-2 bg-brand-blue text-white rounded-xl shadow-lg hover:bg-brand-navy transition-colors"
                            title="Escanear NSR"
                          >
                            <ScanText size={16} />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex gap-6">
                        <button 
                          onClick={(e) => { e.stopPropagation(); triggerFileUpload(editingLog.id, 'camera'); }}
                          className="flex flex-col items-center gap-2"
                        >
                          <div className="w-12 h-12 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue flex items-center justify-center hover:bg-brand-blue/20 transition-colors">
                            <Camera size={20} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Câmera</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); triggerFileUpload(editingLog.id, 'gallery'); }}
                          className="flex flex-col items-center gap-2"
                        >
                          <div className="w-12 h-12 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue dark:text-brand-blue flex items-center justify-center hover:bg-brand-blue/20 transition-colors">
                            <ImageIcon size={20} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Galeria</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Observations in Edit Modal */}
                  <div className="w-full">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">
                      Observações (Nome do Card)
                    </label>
                    <input
                      type="text"
                      value={editingLog.observations || ""}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEditingLog(prev => prev ? { ...prev, observations: e.target.value } : null)}
                      placeholder="Ex: Almoço, Reunião..."
                      className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-blue/20 transition-all"
                    />
                  </div>

                  <div className="relative group w-full">
                    <div className="absolute -top-6 right-0 flex items-center gap-1.5 bg-brand-blue/10 dark:bg-brand-blue/20 px-2 py-1 rounded-lg border border-brand-blue/20 dark:border-brand-blue/30">
                      <ScanText size={12} className="text-brand-blue" />
                      <input
                        type="text"
                        value={editingLog.nsr || ""}
                        onChange={(e) => setEditingLog(prev => prev ? { ...prev, nsr: e.target.value } : null)}
                        placeholder="NSR"
                        className="text-[10px] font-black text-brand-blue dark:text-brand-blue uppercase tracking-tight bg-transparent border-none p-0 w-20 focus:ring-0"
                      />
                    </div>
                    {isProcessingOCR && (
                      <div className="absolute -top-6 right-0 flex items-center gap-1.5 px-2 py-1">
                        <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase animate-pulse">Lendo Ticket...</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={editHoursInput}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 2) val = val.slice(0, 2);
                          
                          const num = parseInt(val);
                          if (val === "" || (!isNaN(num) && num >= 0 && num < 24)) {
                            setEditHoursInput(val);
                          }
                        }}
                        onBlur={(e) => {
                          const num = parseInt(e.target.value);
                          if (!isNaN(num) && num >= 0 && num < 24) {
                            const formatted = num.toString().padStart(2, '0');
                            setEditHoursInput(formatted);
                            setEditTime(prev => `${formatted}:${prev.split(':')[1] || '00'}`);
                          } else {
                            setEditHoursInput(editTime.split(':')[0] || '00');
                          }
                        }}
                        className="w-16 text-5xl font-black text-brand-blue dark:text-brand-blue bg-transparent border-none focus:ring-0 p-0 text-center tabular-nums cursor-pointer"
                      />
                      <span className="text-5xl font-black text-brand-blue dark:text-brand-blue">:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={editMinutesInput}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 2) val = val.slice(0, 2);
                          
                          const num = parseInt(val);
                          if (val === "" || (!isNaN(num) && num >= 0 && num < 60)) {
                            setEditMinutesInput(val);
                          }
                        }}
                        onBlur={(e) => {
                          const num = parseInt(e.target.value);
                          if (!isNaN(num) && num >= 0 && num < 60) {
                            const formatted = num.toString().padStart(2, '0');
                            setEditMinutesInput(formatted);
                            setEditTime(prev => `${prev.split(':')[0] || '00'}:${formatted}`);
                          } else {
                            setEditMinutesInput(editTime.split(':')[1] || '00');
                          }
                        }}
                        className="w-16 text-5xl font-black text-brand-blue dark:text-brand-blue bg-transparent border-none focus:ring-0 p-0 text-center tabular-nums cursor-pointer"
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-brand-blue/20 rounded-full group-hover:bg-brand-blue/40 transition-colors" />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center px-4">
                    Toque no horário acima para ajustar manualmente a marcação.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setEditingLog(null)}
                    className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={updateLogTime}
                    className="py-3 rounded-2xl bg-brand-blue text-white font-bold text-xs shadow-lg shadow-brand-blue/20 transition-all active:scale-95"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Edit Schedule Modal */}
      <AnimatePresence>
        {editingSchedule && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSchedule(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full sm:max-w-xs bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Editar Escala</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                      {editingSchedule.day}, {new Date(editingSchedule.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                    </p>
                  </div>
                  <button 
                    onClick={() => setEditingSchedule(null)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-6 mb-8">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Dia de Folga</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Marque se não houver expediente</span>
                    </div>
                    <button 
                      onClick={() => {
                        const newIsOff = !editingSchedule.isOff;
                        setEditingSchedule({ 
                          ...editingSchedule, 
                          isOff: newIsOff, 
                          shift: newIsOff ? 'Folga' : '09:00 - 18:00'
                        });
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${editingSchedule.isOff ? 'bg-brand-blue' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <motion.div 
                        animate={{ x: editingSchedule.isOff ? 26 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Feriado</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Marque se for um feriado</span>
                    </div>
                    <button 
                      onClick={() => {
                        const newIsHoliday = !editingSchedule.isHoliday;
                        setEditingSchedule({ 
                          ...editingSchedule, 
                          isHoliday: newIsHoliday
                        });
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${editingSchedule.isHoliday ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <motion.div 
                        animate={{ x: editingSchedule.isHoliday ? 26 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  {!editingSchedule.isOff && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Horário de Trabalho</label>
                      <input 
                        type="text"
                        value={editingSchedule.shift}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setEditingSchedule({ ...editingSchedule, shift: e.target.value })}
                        placeholder="Ex: 09:00 - 18:00"
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-brand-blue rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 dark:text-white outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setEditingSchedule(null)}
                    className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => saveCustomShift(editingSchedule.date, editingSchedule.shift, editingSchedule.isOff, editingSchedule.isHoliday)}
                    className="py-3 rounded-2xl bg-brand-blue text-white font-bold text-xs shadow-lg shadow-brand-blue/20 transition-all active:scale-95"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {isSideMenuOpen && (
          <div className="fixed inset-0 z-[100] flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSideMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-[280px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
            >
              {/* Menu Header */}
              <div className="p-6 bg-brand-blue text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                    <User size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{profileData.name}</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-70">{profileData.role}</span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto py-4">
                {[
                  { id: 'ponto', label: 'Registrar Ponto', icon: Fingerprint },
                  { id: 'historico', label: 'Histórico', icon: History },
                  { id: 'reports', label: 'Espelho de Ponto', icon: BarChart3 },
                  { id: 'docs', label: 'Comprovantes', icon: FileText },
                  { id: 'escala', label: 'Escala / Horários', icon: Calendar },
                  { id: 'profile', label: 'Meus Dados', icon: User },
                  { id: 'settings', label: 'Ajustes', icon: Settings },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'ponto') {
                        setCurrentTab('ponto');
                        setSelectedDate(new Date());
                      } else {
                        setCurrentTab('menu');
                        setMenuView(item.id as any);
                      }
                      setIsSideMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${
                      (currentTab === item.id || (currentTab === 'menu' && menuView === item.id))
                        ? 'bg-brand-blue/5 text-brand-blue border-r-4 border-brand-blue'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="text-sm font-bold">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Menu Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 text-rose-500 font-bold text-sm active:scale-95 transition-transform"
                >
                  <LogOut size={20} />
                  Sair
                </button>
                <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-widest">Chronos v2.4.1</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Month Picker for Escala */}
      <AnimatePresence>
        {isMonthPickerOpen && currentTab === 'escala' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMonthPickerOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full sm:max-w-xs bg-white dark:bg-slate-900 rounded-[32px] p-4 shadow-2xl"
            >
              <div className="grid grid-cols-3 gap-2">
                {months.map((month, idx) => (
                  <button
                    key={month}
                    onClick={() => {
                      const newDate = new Date(escalaDate);
                      newDate.setMonth(idx);
                      setEscalaDate(newDate);
                      setIsMonthPickerOpen(false);
                    }}
                    className={`py-3 rounded-xl text-[10px] font-bold uppercase transition-all ${
                      escalaDate.getMonth() === idx 
                        ? 'bg-brand-blue text-white' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {month.substring(0, 3)}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </div>
      </div>
    </ErrorBoundary>
  );
}
