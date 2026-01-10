import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  Camera,
  QrCode,
  Download,
  Trash2,
  Eye,
  History,
  Moon,
  Sun,
  Menu,
  X,
  Upload,
  Mail,
  Phone,
  FileText,
  Zap,
  Shield,
  Clock,
  BarChart3,
  Lock,
  Calendar,
  Linkedin,
  Github,
  ArrowUp,
  RefreshCw,
  Globe,
  Wifi,
  CreditCard,
  User,
  MessageSquare,
  MapPin,
  Instagram,
  Facebook,
  Youtube,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Layers,
  Scan,
  CheckCircle,
  Smartphone,
  Share2,
  Bell,
  Settings,
  LogOut,
  Home,
  Users,
  ExternalLink,
  PlayCircle,
} from 'lucide-react';

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from '@clerk/clerk-react';

/**
 * SmartQRHub with Clerk integrated history storage
 * QR codes are stored per user and persist across sessions
 */

/* ---------- Utility Helpers ---------- */
const createSMQREnvelope = ({ payloadType, payload, expiryDate = null, password = null }) => {
  const envelope = {
    smqr: true,
    payloadType,
    payload,
    expiryDate: expiryDate || null,
    password: password || null,
    createdAt: new Date().toISOString(),
  };
  return 'SMQR:' + btoa(JSON.stringify(envelope));
};

const parseSMQREnvelope = (str) => {
  try {
    const base64 = str.replace(/^SMQR:/, '');
    const json = atob(base64);
    const obj = JSON.parse(json);
    if (obj && obj.smqr) return obj;
  } catch (e) {}
  return null;
};

const isExpired = (expiryDateISO) => {
  if (!expiryDateISO) return false;
  try {
    const now = new Date();
    const expiry = new Date(expiryDateISO);
    return now > expiry;
  } catch {
    return false;
  }
};

const normalizePhone = (phone) => {
  if (!phone) return phone;
  const plus = phone.trim().startsWith('+') ? '+' : '';
  const digits = phone.replace(/[^\d]/g, '');
  return plus + digits;
};

/* ---------- QR Content Builders ---------- */
const buildWifiQR = ({ ssid, password, security }) => {
  const type = security && security.toLowerCase() !== 'open' ? security.toUpperCase() : 'nopass';
  if (type === 'nopass') {
    return `WIFI:T:nopass;S:${escapeSemicolons(ssid)};;`;
  }
  return `WIFI:T:${type};S:${escapeSemicolons(ssid)};P:${escapeSemicolons(password)};;`;
};

const escapeSemicolons = (s) => {
  if (!s) return '';
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;');
};

const buildUPI = ({ pa, pn, am, tn }) => {
  const params = new URLSearchParams();
  if (pa) params.set('pa', pa);
  if (pn) params.set('pn', pn);
  if (am) params.set('am', am);
  if (tn) params.set('tn', tn);
  params.set('cu', 'INR');
  return `upi://pay?${params.toString()}`;
};

const buildVCard = ({ fullName, phone, email, address, org, title, website }) => {
  const lines = [];
  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');
  if (fullName) lines.push(`FN:${escapeVCard(fullName)}`);
  if (org) lines.push(`ORG:${escapeVCard(org)}`);
  if (title) lines.push(`TITLE:${escapeVCard(title)}`);
  if (phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(phone)}`);
  if (email) lines.push(`EMAIL:${escapeVCard(email)}`);
  if (address) lines.push(`ADR:;;${escapeVCard(address)};;;;`);
  if (website) lines.push(`URL:${escapeVCard(website)}`);
  lines.push('END:VCARD');
  return lines.join('\n');
};

const escapeVCard = (s) => (s ? s.replace(/\n/g, '\\n') : '');

const buildWhatsApp = ({ phone, message }) => {
  const normalized = normalizePhone(phone);
  const txt = message ? encodeURIComponent(message) : '';
  if (txt) return `https://api.whatsapp.com/send?phone=${normalized.replace('+', '')}&text=${txt}`;
  return `https://api.whatsapp.com/send?phone=${normalized.replace('+', '')}`;
};

const buildMaps = ({ placeName, lat, lon }) => {
  if (lat && lon) {
    return `https://www.google.com/maps?q=${lat},${lon}&z=15`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
};

const buildSocial = ({ platform, profile }) => {
  try {
    const maybeUrl = new URL(profile);
    return maybeUrl.toString();
  } catch {
    const username = profile.replace(/^@/, '').trim();
    switch (platform) {
      case 'instagram':
        return `https://instagram.com/${username}`;
      case 'facebook':
        return `https://facebook.com/${username}`;
      case 'linkedin':
        return `https://www.linkedin.com/in/${username}`;
      case 'telegram':
        return `https://t.me/${username}`;
      case 'youtube':
        if (username.startsWith('@')) {
          return `https://youtube.com/${username}`;
        }
        return `https://youtube.com/@${username}`;
      default:
        return profile;
    }
  }
};

/* ---------- YouTube Video Helper ---------- */
const buildYouTubeVideo = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://youtube.com/watch?v=${match[1]}`;
    }
  }
  
  return url;
};

const extractYouTubeVideoId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

/* ---------- Scanner Helpers ---------- */
const loadJsQR = () => {
  return new Promise((resolve, reject) => {
    if (window.jsQR) return resolve(window.jsQR);
    const scriptId = 'jsqr-cdn-script';
    if (document.getElementById(scriptId)) {
      const check = setInterval(() => {
        if (window.jsQR) {
          clearInterval(check);
          resolve(window.jsQR);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        reject(new Error('jsQR load timeout'));
      }, 5000);
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://unpkg.com/jsqr/dist/jsQR.js';
    script.async = true;
    script.onload = () => {
      if (window.jsQR) resolve(window.jsQR);
      else reject(new Error('jsQR did not initialize'));
    };
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
};

const decodeImageWithJsQR = async (file) => {
  await loadJsQR();
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1024;
      let width = img.width;
      let height = img.height;
      if (Math.max(width, height) > maxDim) {
        const ratio = maxDim / Math.max(width, height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const code = window.jsQR(imageData.data, width, height);
        URL.revokeObjectURL(url);
        if (code && code.data) {
          resolve(code.data);
        } else {
          resolve(null);
        }
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
};

const decodeImageWithApi = async (file) => {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
      method: 'POST',
      body: form,
    });
    const json = await res.json();
    if (Array.isArray(json) && json.length > 0 && json[0].symbol && json[0].symbol[0]) {
      return json[0].symbol[0].data || null;
    }
  } catch (e) {
    console.warn('QR API decode failed', e);
  }
  return null;
};

const initCamera = async (videoRef, canvasRef) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    return stream;
  } catch (err) {
    console.error('Camera error:', err);
    throw new Error('Camera access denied or not available');
  }
};

const scanFromCamera = async (videoRef, canvasRef) => {
  if (!window.jsQR) {
    await loadJsQR();
  }
  const video = videoRef.current;
  const canvas = canvasRef.current;
  if (!video || !canvas) return null;
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = window.jsQR(imageData.data, canvas.width, canvas.height);
  return code ? code.data : null;
};

/* ---------- QR Data Parser ---------- */
const decodeQRData = (decodedString) => {
  if (!decodedString) return null;
  
  if (decodedString.startsWith('SMQR:')) {
    const env = parseSMQREnvelope(decodedString);
    if (!env) return { type: 'invalid', content: 'Invalid secured QR format', action: 'Invalid' };
    if (isExpired(env.expiryDate)) return { type: 'expired', content: 'QR Code Expired', action: 'Expired', expiryDate: env.expiryDate };
    if (env.password) return { type: 'protected', content: `Protected ${env.payloadType}`, action: 'Requires Password', envelope: env };
    const inner = decodeQRData(env.payload);
    if (inner) inner.envelope = env;
    return inner;
  }

  if (decodedString.startsWith('WIFI:') || decodedString.match(/^WIFI:/i)) {
    const data = {};
    try {
      const body = decodedString.substring(5);
      const parts = body.split(';').filter(Boolean);
      parts.forEach((p) => {
        const [k, ...rest] = p.split(':');
        data[k] = rest.join(':');
      });
      return {
        type: 'wifi',
        content: decodedString,
        action: 'Connect WiFi',
        ssid: data.S || data.s || data.SSID || data.ssid || data.SSID,
        password: data.P || data.p || '',
        security: data.T || data.t || 'WPA',
      };
    } catch {
      return {
        type: 'wifi',
        content: decodedString,
        action: 'Connect WiFi',
      };
    }
  }

  if (decodedString.startsWith('BEGIN:VCARD')) {
    const lines = decodedString.split(/\r?\n/);
    const out = {};
    lines.forEach((ln) => {
      if (ln.startsWith('FN:')) out.fullName = ln.substring(3).trim();
      if (ln.startsWith('TEL')) {
        const parts = ln.split(':');
        out.phone = parts[1] ? parts[1].trim() : out.phone;
      }
      if (ln.startsWith('EMAIL')) {
        const parts = ln.split(':');
        out.email = parts[1] ? parts[1].trim() : out.email;
      }
      if (ln.startsWith('ORG:')) out.org = ln.substring(4).trim();
      if (ln.startsWith('ADR')) {
        const parts = ln.split(':');
        out.address = parts[1] ? parts[1].replace(/;;/g, ' ').trim() : out.address;
      }
      if (ln.startsWith('TITLE:')) out.title = ln.substring(6).trim();
      if (ln.startsWith('URL:')) out.website = ln.substring(4).trim();
    });
    return {
      type: 'vcard',
      content: decodedString,
      action: 'Save Contact',
      ...out,
    };
  }

  if (decodedString.includes('whatsapp') || decodedString.includes('wa.me') || decodedString.startsWith('https://api.whatsapp.com')) {
    try {
      const u = new URL(decodedString);
      const phone = u.searchParams.get('phone') || u.pathname.replace(/^\//, '');
      const text = u.searchParams.get('text') || '';
      return {
        type: 'whatsapp',
        content: decodedString,
        action: 'Open WhatsApp',
        phone,
        message: decodeURIComponent(text),
        url: decodedString,
      };
    } catch {
      return {
        type: 'whatsapp',
        content: decodedString,
        action: 'Open WhatsApp',
        url: decodedString,
      };
    }
  }

  if (decodedString.startsWith('upi:') || decodedString.startsWith('upi://') || decodedString.includes('upi://')) {
    try {
      const urlObj = new URL(decodedString.startsWith('upi://') ? decodedString : 'upi://' + decodedString.replace('upi:', ''));
      const params = Object.fromEntries(urlObj.searchParams.entries());
      return {
        type: 'payment',
        content: decodedString,
        action: 'Open Payment',
        provider: 'UPI',
        params,
        url: decodedString,
      };
    } catch {
      return {
        type: 'payment',
        content: decodedString,
        action: 'Open Payment',
        url: decodedString,
      };
    }
  }

  if (decodedString.startsWith('geo:') || decodedString.includes('google.com/maps') || decodedString.includes('maps.google.com') || decodedString.startsWith('https://maps.app.goo.gl/')) {
    return {
      type: 'maps',
      content: decodedString,
      action: 'Open Maps',
      url: decodedString,
    };
  }

  try {
    const u = new URL(decodedString);
    const host = u.hostname.toLowerCase();
    
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const videoId = extractYouTubeVideoId(decodedString);
      if (videoId) {
        return {
          type: 'youtube',
          content: decodedString,
          action: 'Watch Video',
          url: decodedString,
          videoId: videoId,
        };
      }
    }
    
    if (host.includes('portfolio') || host.includes('personal') || host.includes('cv') || host.includes('resume')) {
      return {
        type: 'portfolio',
        content: decodedString,
        action: 'Open Portfolio',
        url: decodedString,
      };
    }
    
    const socialPlatforms = [
      { domain: 'instagram.com', type: 'social', platform: 'instagram' },
      { domain: 'facebook.com', type: 'social', platform: 'facebook' },
      { domain: 'linkedin.com', type: 'social', platform: 'linkedin' },
      { domain: 't.me', type: 'social', platform: 'telegram' },
      { domain: 'telegram.me', type: 'social', platform: 'telegram' },
      { domain: 'youtube.com', type: 'social', platform: 'youtube' },
      { domain: 'youtu.be', type: 'social', platform: 'youtube' },
    ];
    
    for (const social of socialPlatforms) {
      if (host.includes(social.domain) || host.endsWith(social.domain)) {
        return {
          type: 'social',
          content: decodedString,
          action: 'Open Social',
          platform: social.platform,
          url: decodedString,
        };
      }
    }
    
    return {
      type: 'url',
      content: decodedString,
      action: 'Open URL',
      url: decodedString,
    };
  } catch {}

  if (decodedString.startsWith('mailto:')) {
    const email = decodedString.substring(7);
    return {
      type: 'email',
      content: decodedString,
      action: 'Send Email',
      email: email,
    };
  }

  if (decodedString.startsWith('tel:')) {
    const phone = decodedString.substring(4);
    return {
      type: 'phone',
      content: decodedString,
      action: 'Call Number',
      phone: phone,
    };
  }

  return {
    type: 'text',
    content: decodedString,
    action: 'Text Content',
  };
};

/* ---------- Local Storage Helper ---------- */
const getLocalUserHistory = (userId) => {
  try {
    const stored = localStorage.getItem(`qr_history_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading history from localStorage:', e);
    return [];
  }
};

const saveLocalUserHistory = (userId, history) => {
  try {
    localStorage.setItem(`qr_history_${userId}`, JSON.stringify(history));
  } catch (e) {
    console.error('Error saving history to localStorage:', e);
  }
};

/* ---------- Memoized UI components ---------- */
const Card3D = memo(({ children, className = '', hover = true, intensity = 'medium', style }) => {
  const intensityClass = intensity === 'high' ? 'shadow-2xl' : intensity === 'medium' ? 'shadow-xl' : 'shadow-lg';
  return (
    <div className={`relative group ${className}`} style={style}>
      <div className={`absolute inset-0 rounded-2xl blur-xl opacity-20 transition-all duration-500 group-hover:opacity-40 group-hover:scale-105`} />
      <div className={`relative backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden transition-all duration-500 transform bg-white/90 ${intensityClass} ${hover ? 'group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-current/30' : ''}`}>
        {children}
      </div>
    </div>
  );
});

const StatsCard = memo(({ icon: Icon, label, value, color, darkMode, currentTheme }) => (
  <Card3D className="group">
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'} backdrop-blur-sm group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${color} group-hover:scale-110 transition-transform duration-300`} />
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
        </div>
      </div>
      <div className={`h-1 mt-4 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden`}>
        <div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000`} style={{ width: `${Math.min(100, (value || 0) * 10)}%` }}></div>
      </div>
    </div>
  </Card3D>
));

const FeatureCard = memo(({ icon: Icon, title, description }) => (
  <Card3D className={`group animate-slide-up`} >
    <div className="p-6">
      <div className="flex items-start space-x-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className={`font-bold text-lg mb-2`}>{title}</h3>
          <p className={`text-gray-600`}>{description}</p>
        </div>
      </div>
    </div>
  </Card3D>
));

const ProtectedRevealBox = memo(({ result, onReveal, darkMode }) => {
  const [passwordAttempt, setPasswordAttempt] = useState('');
  return (
    <div className={`mb-4 p-4 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
      <div className="flex items-center space-x-3 mb-3">
        <Lock className="w-5 h-5 text-purple-500" />
        <div>
          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Protected Content</p>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Enter password to reveal</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          value={passwordAttempt}
          onChange={(e) => setPasswordAttempt(e.target.value)}
          placeholder="Enter password"
          className={`flex-1 px-4 py-2 rounded-lg border bg-transparent ${darkMode ? 'border-gray-700 text-white' : 'border-gray-300 text-gray-900'}`}
        />
        <button
          onClick={() => onReveal(result.envelope, passwordAttempt)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium"
        >
          Unlock
        </button>
      </div>
    </div>
  );
});

/* ---------- Main Component ---------- */
const SmartQRHub = () => {
  // Clerk user
  const { isSignedIn, user } = useUser();
  const userId = user?.id;

  // UI State
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('blue');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [showStats, setShowStats] = useState(false);

  // QR Generation states
  const [qrType, setQrType] = useState('url');
  const [qrInput, setQrInput] = useState('');
  const [generatedQR, setGeneratedQR] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrSettings, setQrSettings] = useState({
    hasExpiry: false,
    expiryDate: '',
    hasPassword: false,
    password: '',
  });

  // Form fields for specific QR types
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [socialPlatform, setSocialPlatform] = useState('instagram');
  const [socialProfile, setSocialProfile] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiSecurity, setWifiSecurity] = useState('WPA');
  const [paymentProvider, setPaymentProvider] = useState('upi');
  const [paymentId, setPaymentId] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [vcardFullName, setVcardFullName] = useState('');
  const [vcardPhone, setVcardPhone] = useState('');
  const [vcardEmail, setVcardEmail] = useState('');
  const [vcardAddress, setVcardAddress] = useState('');
  const [vcardOrg, setVcardOrg] = useState('');
  const [vcardTitle, setVcardTitle] = useState('');
  const [vcardWebsite, setVcardWebsite] = useState('');
  const [whatsPhone, setWhatsPhone] = useState('');
  const [whatsMessage, setWhatsMessage] = useState('');
  const [mapsPlaceName, setMapsPlaceName] = useState('');
  const [mapsLat, setMapsLat] = useState('');
  const [mapsLon, setMapsLon] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Scanner states
  const [scanResult, setScanResult] = useState(null);
  const [scanFile, setScanFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraScanning, setCameraScanning] = useState(false);
  const scanInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraIntervalRef = useRef(null);

  // History & Analytics
  const [qrHistory, setQrHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all');

  // Load user history on login
  useEffect(() => {
    if (isSignedIn && userId) {
      const storedHistory = getLocalUserHistory(userId);
      setQrHistory(storedHistory);
    } else {
      setQrHistory([]);
    }
  }, [isSignedIn, userId]);

  // Save history when it changes
  useEffect(() => {
    if (isSignedIn && userId && qrHistory.length > 0) {
      saveLocalUserHistory(userId, qrHistory);
    }
  }, [qrHistory, isSignedIn, userId]);

  // Back to top listener
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
      if (window.scrollY > 600) {
        setShowStats(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (cameraIntervalRef.current) {
        clearInterval(cameraIntervalRef.current);
      }
    };
  }, [cameraStream]);

  // Stats calculations
  const totalQRs = qrHistory.length;
  const totalScans = qrHistory.reduce((sum, qr) => sum + (qr.scanCount || 0), 0);
  const qrTypesUsed = [...new Set(qrHistory.map(qr => qr.type))].length;

  // Themes
  const themes = {
    blue: {
      name: 'Ocean Blue',
      primary: 'from-blue-600 to-cyan-500',
      secondary: 'from-blue-500 to-cyan-400',
      accent: 'text-blue-500',
      accentBorder: 'border-blue-500',
      accentBg: 'bg-blue-500',
      gradient: 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500',
      light: 'from-blue-50 via-cyan-50 to-purple-50',
      dark: 'from-gray-900 via-blue-900/30 to-purple-900/30',
      navBg: 'from-blue-900/95 via-blue-800/95 to-cyan-900/95',
      navLight: 'from-blue-50/95 via-cyan-50/95 to-white/95',
      navShadow: 'shadow-[0_10px_40px_rgba(0,0,0,0.3)]',
      navBorder: 'border-blue-700/30',
      navBorderLight: 'border-blue-300/30',
    },
    purple: {
      name: 'Royal Purple',
      primary: 'from-purple-600 to-pink-500',
      secondary: 'from-purple-500 to-pink-400',
      accent: 'text-purple-500',
      accentBorder: 'border-purple-500',
      accentBg: 'bg-purple-500',
      gradient: 'bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500',
      light: 'from-purple-50 via-pink-50 to-rose-50',
      dark: 'from-gray-900 via-purple-900/30 to-rose-900/30',
      navBg: 'from-purple-900/95 via-purple-800/95 to-pink-900/95',
      navLight: 'from-purple-50/95 via-pink-50/95 to-white/95',
      navShadow: 'shadow-[0_10px_40px_rgba(0,0,0,0.3)]',
      navBorder: 'border-purple-700/30',
      navBorderLight: 'border-purple-300/30',
    },
    green: {
      name: 'Emerald Green',
      primary: 'from-emerald-600 to-teal-500',
      secondary: 'from-emerald-500 to-teal-400',
      accent: 'text-emerald-500',
      accentBorder: 'border-emerald-500',
      accentBg: 'bg-emerald-500',
      gradient: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
      light: 'from-emerald-50 via-teal-50 to-cyan-50',
      dark: 'from-gray-900 via-emerald-900/30 to-cyan-900/30',
      navBg: 'from-emerald-900/95 via-emerald-800/95 to-teal-900/95',
      navLight: 'from-emerald-50/95 via-teal-50/95 to-white/95',
      navShadow: 'shadow-[0_10px_40px_rgba(0,0,0,0.3)]',
      navBorder: 'border-emerald-700/30',
      navBorderLight: 'border-emerald-300/30',
    },
    orange: {
      name: 'Sunset Orange',
      primary: 'from-orange-600 to-red-500',
      secondary: 'from-orange-500 to-red-400',
      accent: 'text-orange-500',
      accentBorder: 'border-orange-500',
      accentBg: 'bg-orange-500',
      gradient: 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-500',
      light: 'from-orange-50 via-red-50 to-pink-50',
      dark: 'from-gray-900 via-orange-900/30 to-pink-900/30',
      navBg: 'from-orange-900/95 via-orange-800/95 to-red-900/95',
      navLight: 'from-orange-50/95 via-red-50/95 to-white/95',
      navShadow: 'shadow-[0_10px_40px_rgba(0,0,0,0.3)]',
      navBorder: 'border-orange-700/30',
      navBorderLight: 'border-orange-300/30',
    },
  };
  const currentTheme = themes[theme] || themes.blue;

  /* ---------- Camera Functions ---------- */
  const startCameraScan = useCallback(async () => {
    try {
      setIsScanning(true);
      setCameraScanning(true);
      const stream = await initCamera(videoRef, canvasRef);
      setCameraStream(stream);
      setCameraActive(true);

      cameraIntervalRef.current = setInterval(async () => {
        try {
          const decoded = await scanFromCamera(videoRef, canvasRef);
          if (decoded) {
            clearInterval(cameraIntervalRef.current);
            const parsed = decodeQRData(decoded);
            setScanResult(parsed);
            setCameraScanning(false);
            setIsScanning(false);

            stream.getTracks().forEach(track => track.stop());
            setCameraActive(false);
            setCameraStream(null);
          }
        } catch (err) {
          console.error('Scan error:', err);
        }
      }, 500);
    } catch (err) {
      alert('Camera access denied or not available. Please use image upload instead.');
      setIsScanning(false);
      setCameraScanning(false);
    }
  }, []);

  const stopCameraScan = useCallback(() => {
    if (cameraIntervalRef.current) {
      clearInterval(cameraIntervalRef.current);
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setCameraScanning(false);
    setIsScanning(false);
  }, [cameraStream]);

  /* ---------- Reset Function ---------- */
  const resetGenerateForm = useCallback(() => {
    setQrInput('');
    setGeneratedQR(null);
    setIsGenerating(false);
    setQrSettings({
      hasExpiry: false,
      expiryDate: '',
      hasPassword: false,
      password: '',
    });
    setPortfolioUrl('');
    setSocialPlatform('instagram');
    setSocialProfile('');
    setWifiSsid('');
    setWifiPassword('');
    setWifiSecurity('WPA');
    setPaymentProvider('upi');
    setPaymentId('');
    setPaymentName('');
    setPaymentAmount('');
    setPaymentNote('');
    setVcardFullName('');
    setVcardPhone('');
    setVcardEmail('');
    setVcardAddress('');
    setVcardOrg('');
    setVcardTitle('');
    setVcardWebsite('');
    setWhatsPhone('');
    setWhatsMessage('');
    setMapsPlaceName('');
    setMapsLat('');
    setMapsLon('');
    setYoutubeUrl('');
  }, []);

  /* ---------- QR Generation ---------- */
  const generateQR = useCallback(async () => {
    setIsGenerating(true);

    try {
      let payload = '';
      let contentPreview = '';

      if (qrType === 'url') {
        if (!qrInput.trim()) {
          alert('Please enter a URL');
          setIsGenerating(false);
          return;
        }
        let urlVal = qrInput.trim();
        if (!/^https?:\/\//i.test(urlVal)) urlVal = 'https://' + urlVal;
        payload = urlVal;
        contentPreview = urlVal;
      } else if (qrType === 'text') {
        if (!qrInput.trim()) {
          alert('Please enter text');
          setIsGenerating(false);
          return;
        }
        payload = qrInput;
        contentPreview = qrInput.slice(0, 80);
      } else if (qrType === 'email') {
        if (!qrInput.trim()) {
          alert('Please enter email');
          setIsGenerating(false);
          return;
        }
        payload = `mailto:${qrInput.trim()}`;
        contentPreview = qrInput.trim();
      } else if (qrType === 'phone') {
        if (!qrInput.trim()) {
          alert('Please enter phone number');
          setIsGenerating(false);
          return;
        }
        payload = `tel:${normalizePhone(qrInput.trim())}`;
        contentPreview = normalizePhone(qrInput.trim());
      } else if (qrType === 'portfolio') {
        if (!portfolioUrl.trim()) {
          alert('Please enter portfolio URL');
          setIsGenerating(false);
          return;
        }
        let urlVal = portfolioUrl.trim();
        if (!/^https?:\/\//i.test(urlVal)) urlVal = 'https://' + urlVal;
        payload = urlVal;
        contentPreview = `Portfolio: ${urlVal}`;
      } else if (qrType === 'social') {
        if (!socialProfile.trim()) {
          alert('Please enter username or profile URL');
          setIsGenerating(false);
          return;
        }
        const url = buildSocial({ platform: socialPlatform, profile: socialProfile.trim() });
        payload = url;
        contentPreview = `${socialPlatform}: ${socialProfile}`;
      } else if (qrType === 'wifi') {
        if (!wifiSsid.trim()) {
          alert('Please enter SSID');
          setIsGenerating(false);
          return;
        }
        payload = buildWifiQR({ ssid: wifiSsid.trim(), password: wifiPassword, security: wifiSecurity });
        contentPreview = `WiFi: ${wifiSsid}`;
      } else if (qrType === 'payment') {
        if (!paymentId.trim()) {
          alert('Please enter UPI ID or mobile number');
          setIsGenerating(false);
          return;
        }
        const upiLink = buildUPI({ pa: paymentId.trim(), pn: paymentName.trim(), am: paymentAmount.trim(), tn: paymentNote.trim() });
        payload = upiLink;
        contentPreview = `${paymentProvider.toUpperCase()}: ${paymentId}`;
      } else if (qrType === 'vcard') {
        if (!vcardFullName.trim() && !vcardPhone.trim()) {
          alert('Please enter at least a name or phone number for vCard');
          setIsGenerating(false);
          return;
        }
        payload = buildVCard({
          fullName: vcardFullName.trim(),
          phone: vcardPhone.trim(),
          email: vcardEmail.trim(),
          address: vcardAddress.trim(),
          org: vcardOrg.trim(),
          title: vcardTitle.trim(),
          website: vcardWebsite.trim(),
        });
        contentPreview = `vCard: ${vcardFullName || vcardPhone}`;
      } else if (qrType === 'whatsapp') {
        if (!whatsPhone.trim()) {
          alert('Please enter phone number for WhatsApp');
          setIsGenerating(false);
          return;
        }
        payload = buildWhatsApp({ phone: whatsPhone.trim(), message: whatsMessage.trim() });
        contentPreview = `WhatsApp: ${whatsPhone}`;
      } else if (qrType === 'maps') {
        if ((!mapsLat || !mapsLon) && !mapsPlaceName.trim()) {
          alert('Please enter a place name or latitude & longitude');
          setIsGenerating(false);
          return;
        }
        payload = buildMaps({ placeName: mapsPlaceName.trim(), lat: mapsLat.trim(), lon: mapsLon.trim() });
        contentPreview = `Maps: ${mapsPlaceName || `${mapsLat},${mapsLon}`}`;
      } else if (qrType === 'youtube') {
        if (!youtubeUrl.trim()) {
          alert('Please enter YouTube video URL');
          setIsGenerating(false);
          return;
        }
        const videoUrl = buildYouTubeVideo(youtubeUrl.trim());
        payload = videoUrl;
        const videoId = extractYouTubeVideoId(youtubeUrl.trim());
        contentPreview = videoId ? `YouTube Video: ${videoId}` : `YouTube: ${youtubeUrl}`;
      }

      let finalContent = payload;
      if (qrSettings.hasExpiry || qrSettings.hasPassword) {
        finalContent = createSMQREnvelope({
          payloadType: qrType,
          payload,
          expiryDate: qrSettings.hasExpiry ? qrSettings.expiryDate : null,
          password: qrSettings.hasPassword ? qrSettings.password : null,
        });
      }

      const encodedContent = encodeURIComponent(finalContent);
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodedContent}&format=png&margin=10`;

      const qrDataObj = {
        id: Date.now(),
        type: qrType,
        content: contentPreview,
        fullContent: finalContent,
        qrUrl: qrImageUrl,
        createdAt: new Date().toISOString(),
        settings: { ...qrSettings },
        scanCount: 0,
      };

      setGeneratedQR(qrDataObj);

      if (isSignedIn) {
        // Save to user's history
        setQrHistory((prev) => [qrDataObj, ...prev]);
        alert('QR code generated and saved to your history!');
      } else {
        alert('QR code generated! Sign in to save it to your history.');
      }

    } catch (err) {
      console.error('Error generating QR:', err);
      alert('❌ Error generating QR. See console for details.');
    } finally {
      setIsGenerating(false);
    }
  }, [
    qrType, qrInput, portfolioUrl, socialPlatform, socialProfile,
    wifiSsid, wifiPassword, wifiSecurity, paymentId, paymentName, paymentAmount, paymentNote,
    vcardFullName, vcardPhone, vcardEmail, vcardAddress, vcardOrg, vcardTitle, vcardWebsite,
    whatsPhone, whatsMessage, mapsPlaceName, mapsLat, mapsLon, youtubeUrl, qrSettings, isSignedIn
  ]);

  /* ---------- Scanner: Upload Handler ---------- */
  const handleScanUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    setScanFile(file);
    setScanResult(null);

    try {
      let decoded = null;
      try {
        decoded = await decodeImageWithJsQR(file);
      } catch (err) {
        console.warn('jsQR decode failed, will try API fallback', err);
      }

      if (!decoded) {
        decoded = await decodeImageWithApi(file);
      }

      if (!decoded) {
        setScanResult({
          type: 'invalid',
          content: 'Unable to decode QR code from image',
          action: 'Retry with a clearer image',
        });
        setIsScanning(false);
        return;
      }

      const parsed = decodeQRData(decoded);
      setScanResult(parsed);
    } catch (err) {
      console.error('Scan error', err);
      setScanResult({
        type: 'error',
        content: 'Error while scanning QR code',
        action: 'See console for details',
      });
    } finally {
      setIsScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  }, []);

  /* ---------- Scan generated QR ---------- */
  const scanGeneratedQR = useCallback(async () => {
    if (!generatedQR) {
      alert('No generated QR available to scan.');
      return;
    }
    setIsScanning(true);
    try {
      const content = generatedQR.fullContent;
      const parsed = decodeQRData(content);
      setScanResult(parsed);
      if (isSignedIn) {
        setQrHistory((prev) =>
          prev.map((q) => {
            if (q.id === generatedQR.id) {
              return { ...q, scanCount: (q.scanCount || 0) + 1 };
            }
            return q;
          })
        );
      }
    } catch (err) {
      console.error('Error scanning generated QR', err);
      setScanResult({
        type: 'error',
        content: 'Error while scanning generated QR',
        action: 'See console',
      });
    } finally {
      setIsScanning(false);
    }
  }, [generatedQR, isSignedIn]);

  /* ---------- Handle Protected Envelope ---------- */
  const handleProtectedReveal = useCallback((envelope, passwordAttempt) => {
    if (!envelope) return null;
    if (envelope.password === passwordAttempt) {
      const inner = decodeQRData(envelope.payload);
      if (inner) inner.envelope = envelope;
      setScanResult(inner);
      return inner;
    }
    return null;
  }, []);

  /* ---------- Fixed Download QR Function ---------- */
  const downloadQR = useCallback(async (qrUrl, id) => {
    if (!qrUrl) {
      alert('QR image URL is not available');
      return;
    }

    try {
      // Show loading state
      const downloadBtn = document.querySelector(`[data-download="${id}"]`);
      const originalHTML = downloadBtn ? downloadBtn.innerHTML : '';
      const originalClass = downloadBtn ? downloadBtn.className : '';

      if (downloadBtn) {
        downloadBtn.innerHTML = `
          <div class="flex items-center justify-center space-x-2">
            <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Preparing...</span>
          </div>
        `;
        downloadBtn.className = originalClass + ' opacity-70 cursor-not-allowed';
        downloadBtn.disabled = true;
      }

      // Method 1: Try fetch with blob
      try {
        console.log('Attempting to download QR from:', qrUrl);
        
        // Add timestamp to avoid caching issues
        const timestamp = Date.now();
        const uniqueUrl = qrUrl.includes('?') 
          ? `${qrUrl}&_=${timestamp}` 
          : `${qrUrl}?_=${timestamp}`;
        
        const response = await fetch(uniqueUrl, {
          mode: 'cors',
          cache: 'no-cache',
          headers: {
            'Accept': 'image/png,image/*;q=0.9,*/*;q=0.8'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Fetch failed with status: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        if (blob.size === 0) {
          throw new Error('Empty blob received');
        }
        
        // Create blob URL
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `smartqr-${id || Date.now()}.png`;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);

        console.log(`QR code downloaded: smartqr-${id || Date.now()}.png (${blob.size} bytes)`);
        
        // Success feedback
        if (downloadBtn) {
          downloadBtn.innerHTML = `
            <div class="flex items-center justify-center space-x-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Downloaded!</span>
            </div>
          `;
          downloadBtn.className = originalClass + ' opacity-90 bg-green-600';
          downloadBtn.disabled = false;
          
          setTimeout(() => {
            if (downloadBtn) {
              downloadBtn.innerHTML = originalHTML;
              downloadBtn.className = originalClass;
              downloadBtn.disabled = false;
            }
          }, 2000);
        }
        
        return;
      } catch (fetchError) {
        console.warn('Fetch method failed, trying alternative:', fetchError);
      }

      // Method 2: Direct download using anchor tag (fallback)
      try {
        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = `smartqr-${id || Date.now()}.png`;
        link.target = '_blank'; // Open in new tab as fallback
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
        
        console.log('Direct download attempted');
        
        if (downloadBtn) {
          downloadBtn.innerHTML = `
            <div class="flex items-center justify-center space-x-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path>
              </svg>
              <span>Opening...</span>
            </div>
          `;
          downloadBtn.className = originalClass + ' opacity-90 bg-blue-600';
          downloadBtn.disabled = false;
          
          setTimeout(() => {
            if (downloadBtn) {
              downloadBtn.innerHTML = originalHTML;
              downloadBtn.className = originalClass;
              downloadBtn.disabled = false;
            }
          }, 2000);
        }
        
      } catch (directError) {
        console.error('Direct download also failed:', directError);
        throw new Error('All download methods failed');
      }

    } catch (error) {
      console.error('Download failed:', error);
      
      // Method 3: Open image in new tab
      window.open(qrUrl, '_blank');
      
      alert('QR image opened in new tab. Please right-click the image and select "Save image as..." to download.');
      
      // Reset button
      const downloadBtn = document.querySelector(`[data-download="${id}"]`);
      if (downloadBtn) {
        downloadBtn.innerHTML = `
          <div class="flex items-center justify-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path>
            </svg>
            <span>Open Image</span>
          </div>
        `;
        downloadBtn.className = originalClass + ' opacity-90 bg-blue-600';
        downloadBtn.disabled = false;
        
        setTimeout(() => {
          if (downloadBtn) {
            downloadBtn.innerHTML = originalHTML;
            downloadBtn.className = originalClass;
            downloadBtn.disabled = false;
          }
        }, 3000);
      }
    }
  }, []);

  /* ---------- Delete QR from history ---------- */
  const deleteQR = useCallback((id) => {
    if (!isSignedIn) {
      alert('Please sign in to manage QR codes!');
      return;
    }
    if (confirm('Are you sure you want to delete this QR code?')) {
      setQrHistory((prev) => prev.filter((q) => q.id !== id));
      if (generatedQR && generatedQR.id === id) setGeneratedQR(null);
      alert('QR code deleted successfully!');
    }
  }, [isSignedIn, generatedQR]);

  const filteredHistory = qrHistory.filter((qr) => historyFilter === 'all' || qr.type === historyFilter);

  /* ---------- Effect: load jsQR early ---------- */
  useEffect(() => {
    loadJsQR().catch(() => {});
  }, []);

  /* ---------- Small helper: safeValue ---------- */
  const safe = (v) => (v == null ? '' : v);

  /* ---------- Render ---------- */
  return (
    <div className={`min-h-screen transition-all duration-500 ${darkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : currentTheme.light} bg-fixed`}>

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${currentTheme.gradient} opacity-6 animate-float`}
            style={{
              width: `${Math.random() * 80 + 40}px`,
              height: `${Math.random() * 80 + 40}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${Math.random() * 12 + 8}s`,
            }}
          />
        ))}
      </div>

      {/* Enhanced 3D Navigation Bar */}
      <nav className={`sticky top-0 z-50 transition-all duration-500 ${darkMode ? currentTheme.navBg : currentTheme.navLight} backdrop-blur-2xl ${currentTheme.navShadow} ${darkMode ? currentTheme.navBorder : currentTheme.navBorderLight} border-b`}>
        {/* 3D Effect Layers */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo with 3D Effect */}
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('home')}>
              <div className="relative">
                <div className={`absolute -inset-2 ${currentTheme.gradient} rounded-xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-300`}></div>
                <div className={`relative w-10 h-10 rounded-xl ${currentTheme.gradient} flex items-center justify-center shadow-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <QrCode className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <span className={`text-xl font-bold bg-gradient-to-r ${currentTheme.primary} bg-clip-text text-transparent`}>
                  Smart QR Hub
                </span>
                {isSignedIn && (
                  <p className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-600'} flex items-center`}>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                    Signed in as {user?.firstName || user?.username || 'User'}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop navigation - 3D Buttons */}
            <div className="hidden md:flex items-center space-x-1">
              {[
                { id: 'home', label: 'Home', icon: Home },
                { id: 'generate', label: 'Generate', icon: QrCode },
                { id: 'scan', label: 'Scan', icon: Camera },
                { id: 'history', label: 'History', icon: History },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 group perspective-1000 ${
                    activeTab === tab.id 
                      ? `${darkMode ? 'text-white' : 'text-gray-900'} transform -translate-y-1` 
                      : `${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                  }`}
                >
                  {/* 3D Button Background */}
                  <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                    activeTab === tab.id 
                      ? `${darkMode ? `bg-gradient-to-br ${currentTheme.primary} shadow-2xl shadow-current/30` : `bg-gradient-to-br ${currentTheme.primary} shadow-2xl`}` 
                      : `${darkMode ? 'bg-gray-800/50 hover:bg-gray-700/50' : 'bg-gray-100/50 hover:bg-gray-200/50'}`
                  }`}></div>
                  
                  {/* Button Border Effect */}
                  <div className={`absolute inset-0 rounded-xl border transition-all duration-300 ${
                    activeTab === tab.id 
                      ? `border-transparent ${darkMode ? 'shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'shadow-[0_0_20px_rgba(0,0,0,0.1)]'}` 
                      : `${darkMode ? 'border-gray-700/50' : 'border-gray-300/50'}`
                  }`}></div>
                  
                  <tab.icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                  
                  {/* Active Indicator - 3D Effect */}
                  {activeTab === tab.id && (
                    <>
                      <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 ${currentTheme.gradient} rounded-t-full shadow-lg`}></div>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white/20 rounded-t-full blur-sm"></div>
                    </>
                  )}
                  
                  {/* Hover Effect */}
                  <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    darkMode ? 'bg-white/5' : 'bg-black/5'
                  }`}></div>
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-3">
              {/* Theme Toggle - 3D Button */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`relative p-2.5 rounded-xl transition-all duration-300 group perspective-1000 ${
                  darkMode 
                    ? 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl shadow-gray-900/50' 
                    : 'bg-gradient-to-br from-gray-100 to-white shadow-2xl shadow-gray-300/50'
                }`}
                aria-label="Toggle dark mode"
              >
                <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                  darkMode 
                    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 group-hover:from-yellow-500/30 group-hover:to-orange-500/30' 
                    : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 group-hover:from-blue-500/30 group-hover:to-cyan-500/30'
                }`}></div>
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400 relative z-10 group-hover:rotate-180 transition-transform duration-500" /> : <Moon className="w-5 h-5 text-gray-700 relative z-10 group-hover:rotate-180 transition-transform duration-500" />}
              </button>

              {/* Theme Selector (desktop) - 3D Style */}
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className={`hidden sm:block px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-300 backdrop-blur-sm ${
                  darkMode 
                    ? 'bg-gray-800/50 border-gray-700/50 text-gray-200 hover:bg-gray-700/50 hover:border-gray-600/50 shadow-lg' 
                    : 'bg-white/50 border-gray-300/50 text-gray-700 hover:bg-white hover:border-gray-400 shadow-lg'
                }`}
              >
                {Object.entries(themes).map(([key, themeData]) => (
                  <option key={key} value={key}>
                    {themeData.name}
                  </option>
                ))}
              </select>

              {/* User Avatar / Login - 3D Style */}
              <div className="hidden md:flex items-center space-x-3">
                <SignedOut>
                  <div className="flex items-center space-x-2">
                    <SignInButton mode="modal">
                      <button className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 group overflow-hidden ${
                        darkMode 
                          ? `bg-gradient-to-r ${currentTheme.primary} text-white shadow-2xl shadow-current/30` 
                          : `bg-gradient-to-r ${currentTheme.primary} text-white shadow-2xl`
                      }`}>
                        <div className={`absolute inset-0 bg-gradient-to-r ${currentTheme.secondary} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                        <span className="relative z-10">Login</span>
                      </button>
                    </SignInButton>
                    <SignUpButton>
                      <button className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 group overflow-hidden ${
                        darkMode 
                          ? `bg-gradient-to-r ${currentTheme.secondary} text-white shadow-2xl shadow-current/30` 
                          : `bg-gradient-to-r ${currentTheme.secondary} text-white shadow-2xl`
                      }`}>
                        <div className={`absolute inset-0 bg-gradient-to-r ${currentTheme.primary} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                        <span className="relative z-10">Sign Up</span>
                      </button>
                    </SignUpButton>
                  </div>
                </SignedOut>

                <SignedIn>
                  <div className="flex items-center space-x-3 group">
                    <div className="relative">
                      <div className={`absolute -inset-1 ${currentTheme.gradient} rounded-full blur opacity-70 group-hover:opacity-100 transition-opacity duration-300`}></div>
                      <UserButton 
                        afterSignOutUrl="/" 
                        appearance={{
                          elements: {
                            avatarBox: "w-10 h-10 border-2 border-white/20 shadow-xl"
                          }
                        }}
                      />
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user?.fullName || user?.firstName || 'User'}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="inline-flex items-center">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1"></div>
                          {totalQRs} QR codes
                        </span>
                      </p>
                    </div>
                  </div>
                </SignedIn>
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 rounded-xl transition-all duration-300 relative group ${
                  darkMode 
                    ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white border border-gray-700/50' 
                    : 'bg-white/50 text-gray-700 hover:bg-white hover:text-gray-900 border border-gray-300/50'
                }`}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - 3D Side Drawer */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden transition-all duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* 3D Drawer */}
          <div
            className={`fixed top-0 left-0 h-full w-64 z-50 md:hidden transform transition-all duration-500 ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            } ${darkMode ? currentTheme.navBg : currentTheme.navLight} backdrop-blur-2xl ${currentTheme.navShadow} border-r ${darkMode ? currentTheme.navBorder : currentTheme.navBorderLight}`}
          >
            {/* Drawer Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-30"></div>
            
            <div className="relative p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`relative w-8 h-8 rounded-lg ${currentTheme.gradient} flex items-center justify-center shadow-lg`}>
                  <QrCode className="w-4 h-4 text-white" />
                </div>
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Menu</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  darkMode 
                    ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white border border-gray-700/50' 
                    : 'bg-gray-100/50 text-gray-700 hover:bg-gray-200/50 hover:text-gray-900 border border-gray-300/50'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative p-4 space-y-1">
              {[
                { id: 'home', label: 'Home', icon: Home },
                { id: 'generate', label: 'Generate', icon: QrCode },
                { id: 'scan', label: 'Scan', icon: Camera },
                { id: 'history', label: 'History', icon: History },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                  className={`relative group flex items-center w-full text-left px-4 py-3 rounded-xl transition-all space-x-3 ${
                    activeTab === tab.id 
                      ? `${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white shadow-lg` : `bg-gradient-to-r ${currentTheme.primary} text-white shadow-lg`}` 
                      : darkMode 
                        ? 'text-gray-400 hover:bg-gray-800/50 hover:text-white' 
                        : 'text-gray-700 hover:bg-gray-100/50'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className={`absolute right-3 w-2 h-2 ${currentTheme.gradient} rounded-full animate-pulse`}></div>
                  )}
                </button>
              ))}

              {/* Theme selector in drawer */}
              <div className="px-4 py-3">
                <label className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-300 ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700/50' 
                      : 'bg-white/50 border-gray-300/50 text-gray-700 hover:bg-white'
                  }`}
                >
                  {Object.entries(themes).map(([key, themeData]) => (
                    <option key={key} value={key}>
                      {themeData.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auth in drawer */}
              <div className="px-4 py-3 border-t border-white/10">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className={`w-full mb-2 px-4 py-2 text-sm font-medium text-center rounded-lg transition-all duration-300 ${
                      darkMode 
                        ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white border border-gray-700/50' 
                        : 'bg-gray-100/50 text-gray-700 hover:bg-gray-200/50 hover:text-gray-900 border border-gray-300/50'
                    }`}>
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button className={`w-full px-4 py-2 text-sm font-medium text-center rounded-lg transition-all duration-300 ${
                      darkMode 
                        ? `bg-gradient-to-r ${currentTheme.primary} text-white shadow-lg hover:shadow-xl` 
                        : `bg-gradient-to-r ${currentTheme.primary} text-white shadow-lg hover:shadow-xl`
                    }`}>
                      Get Started
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center space-x-3">
                    <UserButton 
                      afterSignOutUrl="/" 
                      appearance={{
                        elements: {
                          avatarBox: "w-10 h-10 border-2 border-white/20 shadow-lg"
                        }
                      }}
                    />
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user?.fullName || user?.firstName || 'User'}</p>
                      <p className="text-xs opacity-70">{user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ''}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className="inline-flex items-center">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1"></div>
                          {totalQRs} QR codes
                        </span>
                      </p>
                    </div>
                  </div>
                </SignedIn>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <main className="relative z-10">
        {activeTab === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Hero Section */}
            <section className="text-center py-8 sm:py-12 md:py-20 relative">
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl hidden sm:block" />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl hidden sm:block" />
              
              <div className="flex justify-center mb-6">
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ${currentTheme.gradient} flex items-center justify-center shadow-2xl shadow-current/30 animate-pulse-slow`}>
                  <QrCode className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 animate-slide-up">
                <span className={`bg-gradient-to-r ${currentTheme.primary} bg-clip-text text-transparent`}>Smart QR Hub</span>
              </h1>
              
              <p className={`text-base sm:text-xl md:text-2xl max-w-3xl mx-auto mb-8 sm:mb-10 px-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'} animate-slide-up delay-100`}>
                Generate, scan, and manage QR codes with advanced features — now with Social, WiFi, Payments, vCard, WhatsApp, Maps & YouTube support.
              </p>
              
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 px-4 animate-slide-up delay-200">
                <button
                  onClick={() => setActiveTab('generate')}
                  className={`px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white shadow-2xl shadow-current/30 hover:shadow-xl` : `bg-gradient-to-r ${currentTheme.primary} text-white shadow-2xl hover:shadow-3xl`}`}
                >
                  Generate QR Code
                </button>
                <button
                  onClick={() => setActiveTab('scan')}
                  className={`px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold text-base sm:text-lg border-2 transition-all duration-300 transform hover:scale-105 active:scale-95 ${darkMode ? 'border-white/20 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm' : 'border-gray-300 text-gray-900 hover:bg-gray-50'}`}
                >
                  Scan QR Code
                </button>
              </div>
              
              <SignedOut>
                <div className="animate-fade-in delay-300 px-4">
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Unlock history and analytics with an account</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <SignInButton mode="modal">
                      <button className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold border-2 transition-all ${darkMode ? `${currentTheme.accentBorder} ${currentTheme.accent} hover:bg-opacity-10` : `${currentTheme.accentBorder} ${currentTheme.accent} hover:bg-opacity-10`}`}>
                        Login
                      </button>
                    </SignInButton>
                    <SignUpButton>
                      <button className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold transition-all ${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white shadow-xl shadow-current/30` : `bg-gradient-to-r ${currentTheme.primary} text-white shadow-xl`}`}>
                        Sign Up Free
                      </button>
                    </SignUpButton>
                  </div>
                </div>
              </SignedOut>
            </section>

            {/* Stats Section */}
            {isSignedIn && showStats && (
              <section className="mb-12 sm:mb-16 animate-fade-in px-4">
                <h2 className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>Your Dashboard</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <StatsCard icon={Layers} label="Total QR Codes" value={totalQRs} color="text-blue-500" darkMode={darkMode} currentTheme={currentTheme} />
                  <StatsCard icon={Scan} label="Total Scans" value={totalScans} color="text-green-500" darkMode={darkMode} currentTheme={currentTheme} />
                  <StatsCard icon={TrendingUp} label="QR Types Used" value={qrTypesUsed} color="text-purple-500" darkMode={darkMode} currentTheme={currentTheme} />
                </div>
              </section>
            )}

            {/* Supported QR Types */}
            <section className="mb-12 sm:mb-16 px-4">
              <h2 className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>Supported QR Types</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {[
                  { icon: Globe, label: 'URL', color: 'from-blue-500 to-cyan-500' },
                  { icon: FileText, label: 'Text', color: 'from-gray-600 to-gray-500' },
                  { icon: Mail, label: 'Email', color: 'from-red-500 to-pink-500' },
                  { icon: Phone, label: 'Phone', color: 'from-green-500 to-emerald-500' },
                  { icon: User, label: 'Portfolio', color: 'from-purple-500 to-indigo-500' },
                  { icon: Instagram, label: 'Social', color: 'from-pink-500 to-rose-500' },
                  { icon: Wifi, label: 'WiFi', color: 'from-indigo-500 to-blue-500' },
                  { icon: CreditCard, label: 'Payment', color: 'from-yellow-500 to-orange-500' },
                  { icon: User, label: 'vCard', color: 'from-teal-500 to-cyan-500' },
                  { icon: MessageSquare, label: 'WhatsApp', color: 'from-green-500 to-lime-500' },
                  { icon: MapPin, label: 'Maps', color: 'from-orange-500 to-red-500' },
                  { icon: PlayCircle, label: 'YouTube', color: 'from-red-500 to-rose-500' },
                  { icon: Shield, label: 'Secure', color: 'from-gray-700 to-gray-600' },
                ].map((item, idx) => (
                  <div
                    key={item.label}
                    className="group relative cursor-pointer"
                    onClick={() => { setActiveTab('generate'); setQrType(item.label.toLowerCase()); }}
                  >
                    <Card3D>
                      <div className="p-3 sm:p-4 md:p-6 flex flex-col items-center">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <item.icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <span className={`font-medium text-xs sm:text-sm text-center`}>
                          {item.label}
                        </span>
                      </div>
                    </Card3D>
                  </div>
                ))}
              </div>
            </section>

            {/* Features */}
            <section className="mb-12 sm:mb-16 px-4">
              <h2 className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>Powerful Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { icon: Zap, title: 'Lightning Fast', description: 'Generate and scan QR codes instantly with our optimized engine.' },
                  { icon: Shield, title: 'Secure & Private', description: 'Bank-level encryption and password protection for sensitive codes.' },
                  { icon: Clock, title: 'Expiry Control', description: 'Set expiration dates to automatically invalidate QR codes.' },
                  { icon: BarChart3, title: 'Analytics', description: 'Track scan counts, locations, and performance metrics.' },
                  { icon: History, title: 'QR History', description: 'Access your complete QR code history anytime, anywhere.' },
                  { icon: Smartphone, title: 'Multi-Platform', description: 'Generate QR codes for any platform or use case imaginable.' },
                ].map((feature, idx) => (
                  <FeatureCard key={idx} {...feature} />
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
              <h1 className={`text-3xl sm:text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Generate QR Code</h1>
              {(generatedQR || qrInput || qrSettings.hasExpiry || qrSettings.hasPassword) && (
                <button
                  onClick={resetGenerateForm}
                  className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <Card3D className="mb-6 sm:mb-8">
              <div className="p-4 sm:p-6 md:p-8">
                {/* QR Type Selection */}
                <div className="mb-6 sm:mb-8">
                  <label className={`block mb-4 font-medium text-lg ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select QR Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { type: 'url', label: 'URL', icon: Globe },
                      { type: 'text', label: 'Text', icon: FileText },
                      { type: 'email', label: 'Email', icon: Mail },
                      { type: 'phone', label: 'Phone', icon: Phone },
                      { type: 'portfolio', label: 'Portfolio', icon: User },
                      { type: 'social', label: 'Social', icon: Instagram },
                      { type: 'wifi', label: 'WiFi', icon: Wifi },
                      { type: 'payment', label: 'Payment', icon: CreditCard },
                      { type: 'vcard', label: 'vCard', icon: User },
                      { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                      { type: 'maps', label: 'Maps', icon: MapPin },
                      { type: 'youtube', label: 'YouTube', icon: PlayCircle },
                    ].map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => setQrType(type)}
                        className={`relative group p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 ${
                          qrType === type 
                            ? `border-blue-500 bg-gradient-to-br ${currentTheme.primary}/10` 
                            : darkMode 
                              ? 'border-gray-700 hover:border-gray-600 bg-gray-800/50' 
                              : 'border-gray-200 hover:border-gray-300 bg-white/50'
                        }`}
                        type="button"
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition-all ${
                            qrType === type 
                              ? `bg-gradient-to-br ${currentTheme.secondary}` 
                              : darkMode 
                                ? 'bg-gray-700' 
                                : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${
                              qrType === type 
                                ? 'text-white' 
                                : darkMode 
                                  ? 'text-gray-400' 
                                  : 'text-gray-600'
                            }`} />
                          </div>
                          <span className={`text-xs sm:text-sm font-medium ${
                            qrType === type 
                              ? `${currentTheme.accent}` 
                              : darkMode 
                                ? 'text-gray-300' 
                                : 'text-gray-700'
                          }`}>
                            {label}
                          </span>
                        </div>
                        {qrType === type && (
                          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full animate-ping"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Input Fields */}
                <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-6">
                  {qrType === 'url' && (
                    <div>
                      <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Enter URL</label>
                      <input
                        type="text"
                        value={safe(qrInput)}
                        onChange={(e) => setQrInput(e.target.value)}
                        placeholder="https://example.com"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        autoComplete="off"
                      />
                    </div>
                  )}

                  {qrType === 'text' && (
                    <div>
                      <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Enter Text</label>
                      <textarea
                        value={safe(qrInput)}
                        onChange={(e) => setQrInput(e.target.value)}
                        rows={3}
                        placeholder="Any text content..."
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                      />
                    </div>
                  )}

                  {qrType === 'email' && (
                    <div>
                      <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Enter Email Address</label>
                      <input
                        type="email"
                        value={safe(qrInput)}
                        onChange={(e) => setQrInput(e.target.value)}
                        placeholder="you@example.com"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                      />
                    </div>
                  )}

                  {qrType === 'phone' && (
                    <div>
                      <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Enter Phone Number</label>
                      <input
                        type="tel"
                        value={safe(qrInput)}
                        onChange={(e) => setQrInput(e.target.value)}
                        placeholder="+1 555 123 4567"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                      />
                    </div>
                  )}

                  {qrType === 'portfolio' && (
                    <div>
                      <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Portfolio URL</label>
                      <input
                        type="text"
                        value={safe(portfolioUrl)}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="https://yourportfolio.com"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                      />
                    </div>
                  )}

                  {qrType === 'social' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Platform</label>
                        <select
                          value={socialPlatform}
                          onChange={(e) => setSocialPlatform(e.target.value)}
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white' : 'border-gray-300 text-gray-900'}`}
                        >
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="youtube">YouTube</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Username or Profile URL</label>
                        <input
                          value={safe(socialProfile)}
                          onChange={(e) => setSocialProfile(e.target.value)}
                          placeholder="@username or https://profile"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                    </div>
                  )}

                  {qrType === 'wifi' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Network Name (SSID)</label>
                        <input
                          value={safe(wifiSsid)}
                          onChange={(e) => setWifiSsid(e.target.value)}
                          placeholder="MyWiFi"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
                        <input
                          value={safe(wifiPassword)}
                          onChange={(e) => setWifiPassword(e.target.value)}
                          placeholder="WiFi password"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-1">
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Security Type</label>
                        <select
                          value={wifiSecurity}
                          onChange={(e) => setWifiSecurity(e.target.value)}
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white' : 'border-gray-300 text-gray-900'}`}
                        >
                          <option>WPA</option>
                          <option>WPA2</option>
                          <option>WEP</option>
                          <option>Open</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {qrType === 'payment' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>UPI ID / Mobile</label>
                        <input
                          value={safe(paymentId)}
                          onChange={(e) => setPaymentId(e.target.value)}
                          placeholder="example@bank or +9198xxxx"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Amount (optional)</label>
                        <input
                          value={safe(paymentAmount)}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="100.00"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Payee Name (optional)</label>
                        <input
                          value={safe(paymentName)}
                          onChange={(e) => setPaymentName(e.target.value)}
                          placeholder="Abhishek Sahani"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Note (optional)</label>
                        <input
                          value={safe(paymentNote)}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          placeholder="Payment for services"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                    </div>
                  )}

                  {qrType === 'vcard' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</label>
                        <input
                          value={safe(vcardFullName)}
                          onChange={(e) => setVcardFullName(e.target.value)}
                          placeholder="Abhishek Sahani"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
                        <input
                          value={safe(vcardPhone)}
                          onChange={(e) => setVcardPhone(e.target.value)}
                          placeholder="+1 555 123 4567"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                        <input
                          value={safe(vcardEmail)}
                          onChange={(e) => setVcardEmail(e.target.value)}
                          placeholder="abhi@example.com"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Organization</label>
                        <input
                          value={safe(vcardOrg)}
                          onChange={(e) => setVcardOrg(e.target.value)}
                          placeholder="Company Inc."
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Address (optional)</label>
                        <input
                          value={safe(vcardAddress)}
                          onChange={(e) => setVcardAddress(e.target.value)}
                          placeholder="123 Main St, City"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                    </div>
                  )}

                  {qrType === 'whatsapp' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone Number</label>
                        <input
                          value={safe(whatsPhone)}
                          onChange={(e) => setWhatsPhone(e.target.value)}
                          placeholder="+9198xxxx"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Prefilled Message (optional)</label>
                        <input
                          value={safe(whatsMessage)}
                          onChange={(e) => setWhatsMessage(e.target.value)}
                          placeholder="Hi, I'd like to connect..."
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                    </div>
                  )}

                  {qrType === 'maps' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div className="sm:col-span-2 lg:col-span-2">
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Place Name</label>
                        <input
                          value={safe(mapsPlaceName)}
                          onChange={(e) => setMapsPlaceName(e.target.value)}
                          placeholder="Eiffel Tower, Paris"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Latitude (optional)</label>
                        <input
                          value={safe(mapsLat)}
                          onChange={(e) => setMapsLat(e.target.value)}
                          placeholder="48.8584"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Longitude (optional)</label>
                        <input
                          value={safe(mapsLon)}
                          onChange={(e) => setMapsLon(e.target.value)}
                          placeholder="2.2945"
                          className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        />
                      </div>
                    </div>
                  )}

                  {qrType === 'youtube' && (
                    <div>
                      <label className={`block mb-2 sm:mb-3 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>YouTube Video URL</label>
                      <input
                        type="text"
                        value={safe(youtubeUrl)}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID"
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 bg-transparent transition-colors text-sm sm:text-base ${darkMode ? 'border-gray-700 text-white placeholder-gray-500 focus:border-blue-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'}`}
                        autoComplete="off"
                      />
                      <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Supports: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/..., etc.
                      </p>
                    </div>
                  )}
                </div>

                {/* Advanced Settings */}
                <div className="mb-6 sm:mb-8">
                  <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Advanced Settings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className={`p-3 sm:p-4 rounded-xl border-2 ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-blue-500" />
                          <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Expiry Date</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={qrSettings.hasExpiry}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setQrSettings({ 
                                ...qrSettings, 
                                hasExpiry: checked,
                                expiryDate: checked ? qrSettings.expiryDate : ''
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      {qrSettings.hasExpiry && (
                        <div className="mt-2">
                          <input
                            type="date"
                            value={safe(qrSettings.expiryDate)}
                            onChange={(e) => setQrSettings({ ...qrSettings, expiryDate: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                            min={new Date().toISOString().split('T')[0]}
                          />
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            QR code will expire after this date
                          </p>
                        </div>
                      )}
                    </div>

                    <div className={`p-3 sm:p-4 rounded-xl border-2 ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Lock className="w-5 h-5 text-purple-500" />
                          <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Password Protection</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={qrSettings.hasPassword}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setQrSettings({ 
                                ...qrSettings, 
                                hasPassword: checked,
                                password: checked ? qrSettings.password : ''
                              });
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      {qrSettings.hasPassword && (
                        <div className="mt-2">
                          <input
                            type="password"
                            value={safe(qrSettings.password)}
                            onChange={(e) => setQrSettings({ ...qrSettings, password: e.target.value })}
                            placeholder="Enter password"
                            className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                          />
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Password required to scan this QR code
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={generateQR}
                    disabled={isGenerating}
                    className={`flex-1 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white shadow-2xl shadow-current/30 hover:shadow-current/50` : `bg-gradient-to-r ${currentTheme.primary} text-white shadow-2xl hover:shadow-3xl`}`}
                  >
                    {isGenerating ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating...</span>
                      </div>
                    ) : (
                      'Generate QR Code'
                    )}
                  </button>
                  {(generatedQR || qrInput || qrSettings.hasExpiry || qrSettings.hasPassword) && (
                    <button
                      onClick={resetGenerateForm}
                      className={`px-4 py-3 sm:px-6 sm:py-4 rounded-xl border-2 transition-all ${darkMode ? 'border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white' : 'border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900'}`}
                    >
                      <span className="hidden sm:inline">Reset</span>
                      <RefreshCw className="w-5 h-5 sm:hidden mx-auto" />
                    </button>
                  )}
                </div>

                {/* Generated QR Display - FIXED DOWNLOAD SECTION */}
                {generatedQR && (
                  <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-800/50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                      {/* QR Image and Download Buttons */}
                      <div className="flex flex-col items-center">
                        <Card3D className="p-4 sm:p-6" intensity="high">
                          <img 
                            src={generatedQR.qrUrl} 
                            alt="QR Code" 
                            className="w-48 h-48 sm:w-64 sm:h-64" 
                            crossOrigin="anonymous"
                          />
                        </Card3D>
                        <div className="mt-4 sm:mt-6 space-y-3 w-full max-w-sm">
                          {/* Main Download Button */}
                          <button
                            onClick={() => downloadQR(generatedQR.qrUrl, generatedQR.id)}
                            data-download={generatedQR.id}
                            className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${
                              darkMode 
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl' 
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl'
                            }`}
                          >
                            <Download className="w-5 h-5" />
                            <span>Download QR Code</span>
                          </button>
                          
                          {/* Alternative Download Options */}
                          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
                            <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Having download issues? Try:</p>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => window.open(generatedQR.qrUrl, '_blank')}
                                className={`flex-1 px-2 py-1.5 text-xs rounded-lg transition-all ${
                                  darkMode 
                                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                }`}
                              >
                                Open in New Tab
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedQR.qrUrl)
                                    .then(() => alert('QR image URL copied to clipboard! Right-click and save image.'))
                                    .catch(() => alert('Failed to copy URL'));
                                }}
                                className={`flex-1 px-2 py-1.5 text-xs rounded-lg transition-all ${
                                  darkMode 
                                    ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                              >
                                Copy URL
                              </button>
                              <button
                                onClick={() => {
                                  // Right-click simulation alternative
                                  const link = document.createElement('a');
                                  link.href = generatedQR.qrUrl;
                                  link.target = '_blank';
                                  link.rel = 'noopener noreferrer';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className={`flex-1 px-2 py-1.5 text-xs rounded-lg transition-all ${
                                  darkMode 
                                    ? 'bg-purple-700 hover:bg-purple-600 text-white' 
                                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                                }`}
                              >
                                View Image
                              </button>
                            </div>
                          </div>
                          
                          <button
                            onClick={scanGeneratedQR}
                            className={`w-full py-3 rounded-xl font-medium transition-all ${
                              darkMode 
                                ? 'border-2 border-gray-700 text-gray-300 hover:bg-gray-800' 
                                : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            Test Scan This QR
                          </button>
                        </div>
                      </div>
                      
                      {/* QR Details */}
                      <div>
                        <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>QR Details</h3>
                        <Card3D>
                          <div className="p-4 sm:p-6 space-y-4">
                            <div>
                              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Type</span>
                              <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{generatedQR.type.toUpperCase()}</p>
                            </div>
                            <div>
                              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Content</span>
                              <p className={`break-words ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{generatedQR.content}</p>
                            </div>
                            <div>
                              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Created</span>
                              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {new Date(generatedQR.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {generatedQR.settings.hasExpiry && generatedQR.settings.expiryDate && (
                              <div className={`p-3 rounded-lg ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-yellow-500" />
                                  <span className={`text-sm ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                                    Expires: {new Date(generatedQR.settings.expiryDate).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            )}
                            {generatedQR.settings.hasPassword && (
                              <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/20' : 'bg-purple-50'}`}>
                                <div className="flex items-center space-x-2">
                                  <Lock className="w-4 h-4 text-purple-500" />
                                  <span className={`text-sm ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                                    Password Protected
                                  </span>
                                </div>
                              </div>
                            )}
                            <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                              <p className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                <strong>Download Tip:</strong> If automatic download doesn't work, right-click the QR image above and select "Save image as..."
                              </p>
                            </div>
                          </div>
                        </Card3D>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card3D>
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <h1 className={`text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Scan QR Code</h1>

            <Card3D className="mb-6 sm:mb-8">
              <div className="p-4 sm:p-6 md:p-8">
                <div className="text-center">
                  {!cameraActive ? (
                    <div className="mb-6 sm:mb-8">
                      <h3 className={`text-xl font-bold mb-4 sm:mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Choose Scanning Method</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                        <button
                          onClick={startCameraScan}
                          disabled={isScanning}
                          className={`group p-6 sm:p-8 rounded-2xl border-2 transition-all duration-300 ${darkMode ? 'border-blue-500/30 bg-blue-900/10 hover:bg-blue-900/20' : 'border-blue-500/20 bg-blue-50 hover:bg-blue-100'} ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl ${currentTheme.gradient} flex items-center justify-center shadow-lg shadow-current/30`}>
                            <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                          </div>
                          <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Use Camera</p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Real-time scanning with your device camera</p>
                        </button>

                        <div>
                          <input type="file" ref={scanInputRef} onChange={handleScanUpload} accept="image/*" className="hidden" />
                          <button
                            onClick={() => scanInputRef.current?.click()}
                            disabled={isScanning}
                            className={`w-full group p-6 sm:p-8 rounded-2xl border-2 transition-all duration-300 ${darkMode ? 'border-green-500/30 bg-green-900/10 hover:bg-green-900/20' : 'border-green-500/20 bg-green-50 hover:bg-green-100'} ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30`}>
                              <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Upload Image</p>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Upload QR code image from your device</p>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 sm:mb-8">
                      <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-64 object-cover"
                        />
                        <div className="absolute inset-0 border-4 border-blue-500/50 animate-pulse rounded-2xl"></div>
                        {cameraScanning && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <div className="text-center">
                              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                              <p className="text-white font-medium">Scanning for QR codes...</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={stopCameraScan}
                        className="mt-4 sm:mt-6 px-6 sm:px-8 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                      >
                        Stop Camera
                      </button>
                    </div>
                  )}

                  {/* Scan Result */}
                  {scanResult && (
                    <div className={`mt-6 sm:mt-8 p-4 sm:p-6 rounded-2xl border-2 ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                      <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Scan Result</h3>

                      {scanResult.type === 'protected' && (
                        <ProtectedRevealBox
                          result={scanResult}
                          onReveal={(env, pw) => {
                            const reveal = handleProtectedReveal(env, pw);
                            if (!reveal) {
                              alert('Incorrect password');
                              return;
                            }
                            setScanResult(reveal);
                          }}
                          darkMode={darkMode}
                        />
                      )}

                      {scanResult.type === 'expired' && (
                        <div className={`p-4 rounded-xl ${darkMode ? 'bg-red-900/20 border border-red-700/30' : 'bg-red-50 border border-red-200'}`}>
                          <p className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-700'}`}>QR Code Expired</p>
                          <p className={`text-sm mt-1 ${darkMode ? 'text-red-300/70' : 'text-red-600/70'}`}>
                            This QR code expired on {new Date(scanResult.expiryDate).toLocaleString()}
                          </p>
                        </div>
                      )}

                      {scanResult.type === 'error' && (
                        <div className={`p-4 rounded-xl ${darkMode ? 'bg-red-900/20 border border-red-700/30' : 'bg-red-50 border border-red-200'}`}>
                          <p className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Error Scanning QR Code</p>
                          <p className={`text-sm mt-1 ${darkMode ? 'text-red-300/70' : 'text-red-600/70'}`}>
                            Please try again with a clearer image
                          </p>
                        </div>
                      )}

                      {scanResult.type === 'invalid' && (
                        <div className={`p-4 rounded-xl ${darkMode ? 'bg-yellow-900/20 border border-yellow-700/30' : 'bg-yellow-50 border border-yellow-200'}`}>
                          <p className={`font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>Invalid QR Code</p>
                          <p className={`text-sm mt-1 ${darkMode ? 'text-yellow-300/70' : 'text-yellow-600/70'}`}>
                            {scanResult.content}
                          </p>
                        </div>
                      )}

                      {/* Display QR content for different types */}
                      {!['protected', 'expired', 'error', 'invalid'].includes(scanResult.type) && (
                        <div className="space-y-4">
                          {(scanResult.type === 'url' || scanResult.type === 'social' || scanResult.type === 'portfolio' || scanResult.type === 'youtube') && (
                            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg ${currentTheme.gradient} flex items-center justify-center`}>
                                  {scanResult.type === 'social' ? (
                                    scanResult.platform === 'instagram' ? <Instagram className="w-5 h-5 text-white" /> :
                                    scanResult.platform === 'facebook' ? <Facebook className="w-5 h-5 text-white" /> :
                                    scanResult.platform === 'linkedin' ? <Linkedin className="w-5 h-5 text-white" /> :
                                    scanResult.platform === 'youtube' ? <PlayCircle className="w-5 h-5 text-white" /> :
                                    <Globe className="w-5 h-5 text-white" />
                                  ) : scanResult.type === 'portfolio' ? (
                                    <User className="w-5 h-5 text-white" />
                                  ) : scanResult.type === 'youtube' ? (
                                    <PlayCircle className="w-5 h-5 text-white" />
                                  ) : (
                                    <Globe className="w-5 h-5 text-white" />
                                  )}
                                </div>
                                <div>
                                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {scanResult.type === 'social' ? 'Social Link' : 
                                     scanResult.type === 'portfolio' ? 'Portfolio Link' :
                                     scanResult.type === 'youtube' ? 'YouTube Video' : 'URL'}
                                  </p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} break-words`}>
                                    {scanResult.url || scanResult.content}
                                  </p>
                                  {scanResult.type === 'youtube' && scanResult.videoId && (
                                    <div className="mt-2">
                                      <div className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'}`}>
                                        Video ID: {scanResult.videoId}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <a
                                href={scanResult.url || scanResult.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full px-4 py-2 rounded-lg flex items-center justify-center space-x-2 ${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white` : `bg-gradient-to-r ${currentTheme.primary} text-white`}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span>{scanResult.type === 'youtube' ? 'Watch Video' : 'Open Link'}</span>
                              </a>
                            </div>
                          )}

                          {scanResult.type === 'email' && (
                            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg ${currentTheme.gradient} flex items-center justify-center`}>
                                  <Mail className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Email Address</p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{scanResult.email}</p>
                                </div>
                              </div>
                              <a
                                href={`mailto:${scanResult.email}`}
                                className={`w-full px-4 py-2 rounded-lg flex items-center justify-center space-x-2 ${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white` : `bg-gradient-to-r ${currentTheme.primary} text-white`}`}
                              >
                                <Mail className="w-4 h-4" />
                                <span>Send Email</span>
                              </a>
                            </div>
                          )}

                          {scanResult.type === 'phone' && (
                            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg ${currentTheme.gradient} flex items-center justify-center`}>
                                  <Phone className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Phone Number</p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{scanResult.phone}</p>
                                </div>
                              </div>
                              <a
                                href={`tel:${scanResult.phone}`}
                                className={`w-full px-4 py-2 rounded-lg flex items-center justify-center space-x-2 ${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white` : `bg-gradient-to-r ${currentTheme.primary} text-white`}`}
                              >
                                <Phone className="w-4 h-4" />
                                <span>Call Number</span>
                              </a>
                            </div>
                          )}

                          {scanResult.type === 'wifi' && (
                            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg ${currentTheme.gradient} flex items-center justify-center`}>
                                  <Wifi className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>WiFi Network</p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{scanResult.ssid || 'Unknown SSID'}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className={`p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Security</p>
                                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{scanResult.security || 'Unknown'}</p>
                                </div>
                                {scanResult.password && (
                                  <div className={`p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Password</p>
                                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{scanResult.password}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {scanResult.type === 'payment' && (
                            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg ${currentTheme.gradient} flex items-center justify-center`}>
                                  <CreditCard className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Payment</p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Open payment app to complete transaction</p>
                                </div>
                              </div>
                              <a
                                href={scanResult.url || scanResult.content}
                                className={`w-full px-4 py-2 rounded-lg flex items-center justify-center space-x-2 ${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white` : `bg-gradient-to-r ${currentTheme.primary} text-white`}`}
                              >
                                <CreditCard className="w-4 h-4" />
                                <span>Open Payment</span>
                              </a>
                            </div>
                          )}

                          {scanResult.type === 'vcard' && (
                            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg ${currentTheme.gradient} flex items-center justify-center`}>
                                  <User className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Contact Card</p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{scanResult.fullName || 'Unnamed Contact'}</p>
                                </div>
                              </div>
                              <div className="space-y-2 mb-4">
                                {scanResult.phone && (
                                  <div className={`p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Phone</p>
                                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{scanResult.phone}</p>
                                  </div>
                                )}
                                {scanResult.email && (
                                  <div className={`p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
                                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{scanResult.email}</p>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => alert('Save this contact to your phone\'s address book')}
                                className={`w-full px-4 py-2 rounded-lg flex items-center justify-center space-x-2 ${darkMode ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'}`}
                              >
                                <User className="w-4 h-4" />
                                <span>Save Contact</span>
                              </button>
                            </div>
                          )}

                          {scanResult.type === 'whatsapp' && (
                            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg ${currentTheme.gradient} flex items-center justify-center`}>
                                  <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>WhatsApp Message</p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{scanResult.phone || 'Unknown number'}</p>
                                </div>
                              </div>
                              <a
                                href={scanResult.url || scanResult.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full px-4 py-2 rounded-lg flex items-center justify-center space-x-2 ${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white` : `bg-gradient-to-r ${currentTheme.primary} text-white`}`}
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>Open WhatsApp</span>
                              </a>
                            </div>
                          )}

                          {scanResult.type === 'maps' && (
                            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg ${currentTheme.gradient} flex items-center justify-center`}>
                                  <MapPin className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Location</p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Open in maps application</p>
                                </div>
                              </div>
                              <a
                                href={scanResult.url || scanResult.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full px-4 py-2 rounded-lg flex items-center justify-center space-x-2 ${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white` : `bg-gradient-to-r ${currentTheme.primary} text-white`}`}
                              >
                                <MapPin className="w-4 h-4" />
                                <span>Open Maps</span>
                              </a>
                            </div>
                          )}

                          {scanResult.type === 'text' && (
                            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg ${currentTheme.gradient} flex items-center justify-center`}>
                                  <FileText className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Text Content</p>
                                </div>
                              </div>
                              <div className={`p-3 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                <p className={`break-words ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{scanResult.content}</p>
                              </div>
                            </div>
                          )}

                          {/* Clear Button */}
                          <button
                            onClick={() => { 
                              setScanResult(null); 
                              setScanFile(null); 
                              if (scanInputRef.current) scanInputRef.current.value = ''; 
                              if (cameraActive) stopCameraScan();
                            }}
                            className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:opacity-90 transition-opacity"
                          >
                            Clear Result
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card3D>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <SignedOut>
              <div className="text-center py-12 sm:py-20">
                <Card3D>
                  <div className="p-8 sm:p-12">
                    <Lock className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                    <h3 className={`text-xl sm:text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Login Required</h3>
                    <p className={`mb-6 sm:mb-8 px-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Please sign in to view and manage your QR code history</p>
                    <SignInButton mode="modal">
                      <button
                        className={`px-6 py-3 sm:px-8 sm:py-3 rounded-xl font-medium transition-all ${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white shadow-xl shadow-current/30` : `bg-gradient-to-r ${currentTheme.primary} text-white shadow-xl`}`}
                      >
                        Sign In / Sign Up
                      </button>
                    </SignInButton>
                  </div>
                </Card3D>
              </div>
            </SignedOut>

            <SignedIn>
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
                  <h1 className={`text-3xl sm:text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>QR History</h1>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={historyFilter}
                      onChange={(e) => setHistoryFilter(e.target.value)}
                      className={`px-4 py-2 rounded-xl border backdrop-blur-sm text-sm sm:text-base ${darkMode ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-white/50 border-gray-300'}`}
                    >
                      <option value="all">All Types</option>
                      <option value="url">URL</option>
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="portfolio">Portfolio</option>
                      <option value="social">Social</option>
                      <option value="wifi">WiFi</option>
                      <option value="payment">Payment</option>
                      <option value="vcard">vCard</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="maps">Maps</option>
                      <option value="youtube">YouTube</option>
                    </select>
                    {qrHistory.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to clear all history?')) {
                            setQrHistory([]);
                            alert('History cleared successfully!');
                          }
                        }}
                        className={`px-4 py-2 rounded-xl border backdrop-blur-sm text-sm sm:text-base ${darkMode ? 'bg-red-900/30 border-red-700 text-red-300 hover:bg-red-800/40' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'}`}
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {filteredHistory.length === 0 ? (
                  <Card3D>
                    <div className="p-8 sm:p-12 text-center">
                      <History className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                      <h3 className={`text-lg sm:text-xl font-medium mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No QR Codes Yet</h3>
                      <p className={`mb-6 sm:mb-8 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Generate your first QR code to see it here</p>
                      <button
                        onClick={() => setActiveTab('generate')}
                        className={`px-6 py-3 sm:px-8 sm:py-3 rounded-xl font-medium transition-all ${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white shadow-lg` : `bg-gradient-to-r ${currentTheme.primary} text-white shadow-lg`}`}
                      >
                        Generate QR Code
                      </button>
                    </div>
                  </Card3D>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredHistory.map((qr) => (
                      <Card3D key={qr.id} className="group">
                        <div className="p-4 sm:p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${currentTheme.gradient} flex items-center justify-center`}>
                                {qr.type === 'url' && <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                                {qr.type === 'text' && <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                                {qr.type === 'email' && <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                                {qr.type === 'phone' && <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                                {qr.type === 'portfolio' && <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                                {qr.type === 'social' && <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                                {qr.type === 'wifi' && <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                                {qr.type === 'payment' && <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                                {qr.type === 'vcard' && <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                                {qr.type === 'whatsapp' && <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                                {qr.type === 'maps' && <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                                {qr.type === 'youtube' && <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                              </div>
                              <div>
                                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {qr.type.charAt(0).toUpperCase() + qr.type.slice(1)}
                                </span>
                                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                  {new Date(qr.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                              {qr.scanCount || 0} scans
                            </span>
                          </div>
                          <img src={qr.qrUrl} alt="QR Code" className="w-full h-40 sm:h-48 object-contain mb-4 rounded-lg" />
                          <p className={`text-sm mb-4 truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{qr.content}</p>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => downloadQR(qr.qrUrl, qr.id)}
                              data-download={qr.id}
                              className="flex-1 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2"
                            >
                              <Download className="w-4 h-4" />
                              <span className="hidden sm:inline">Download</span>
                            </button>
                            <button
                              onClick={() => deleteQR(qr.id)}
                              className="px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </Card3D>
                    ))}
                  </div>
                )}
              </>
            </SignedIn>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`mt-12 sm:mt-20 border-t ${darkMode ? 'border-gray-700 bg-gradient-to-br from-gray-900 to-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-2 mb-4">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${currentTheme.gradient} flex items-center justify-center`}><QrCode className="w-4 h-4 sm:w-6 sm:h-6 text-white" /></div>
                <span className={`font-bold text-base sm:text-lg bg-gradient-to-r ${currentTheme.primary} bg-clip-text text-transparent`}>Smart QR Hub</span>
              </div>
              <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Modern QR code solution for everyone</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-3">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>QR Generator</span>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>QR Scanner</span>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>History & Analytics</span>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>Secure Storage</span>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>YouTube QR</span>
              </div>
            </div>

            <div className="text-center md:text-right">
              <h4 className={`font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Connect With Us</h4>
              <div className="flex justify-center md:justify-end space-x-3 sm:space-x-4">
                <a href="https://www.linkedin.com/in/abhishek-sahani-447851341" target="_blank" rel="noopener noreferrer" className={`p-2 sm:p-3 rounded-lg transition-all transform hover:scale-110 ${darkMode ? 'bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white' : 'bg-gray-100 hover:bg-blue-600 text-gray-600 hover:text-white'}`} title="LinkedIn"><Linkedin className="w-5 h-5" /></a>
                <a href="mailto:abhishek242443@gmail.com" className={`p-2 sm:p-3 rounded-lg transition-all transform hover:scale-110 ${darkMode ? 'bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white' : 'bg-gray-100 hover:bg-red-600 text-gray-600 hover:text-white'}`} title="Email"><Mail className="w-5 h-5" /></a>
              </div>
            </div>
          </div>

          <div className={`mt-8 pt-8 border-t text-center ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>© Smart QR Hub. All rights reserved. Created by Sahani Abhishek.</p>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed bottom-4 sm:bottom-8 right-4 sm:right-8 z-40 p-2 sm:p-3 rounded-full shadow-2xl transition-all duration-300 animate-fade-in ${darkMode ? `bg-gradient-to-r ${currentTheme.primary} text-white` : `bg-gradient-to-r ${currentTheme.primary} text-white`}`}
          title="Back to Top"
        >
          <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-slide-up { animation: slide-up 0.6s ease-out; }
        .animate-float { animation: float 20s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
        
        /* 3D Perspective */
        .perspective-1000 {
          perspective: 1000px;
        }
        
        /* Navigation Bar Enhancements */
        .nav-blur {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        
        /* Enhanced shadows for 3D effect */
        .shadow-3d {
          box-shadow: 
            0 10px 40px rgba(0, 0, 0, 0.3),
            0 0 20px rgba(255, 255, 255, 0.1) inset,
            0 -5px 20px rgba(0, 0, 0, 0.2) inset;
        }
      `}</style>
    </div>
  );
};

export default SmartQRHub;