import { useState, useEffect, useRef, useCallback } from 'react';
import AuthPage from './components/AuthPage.jsx';
import {
  getSession, saveSession, logout,
  searchUsers, subscribeConversations,
  getOrCreateConv, sendMessage,
  markConvRead, deleteMessage, subscribeMessages,
  addStatus, subscribeStatuses,
  setTypingStatus, subscribeTypingStatus, getAllUsers,
  updateProfile
} from './auth.js';
import { EMOJIS } from './data.js';
import emailjs from '@emailjs/browser';
import { 
  MessageCircle, Edit3, LogOut, Search, Shield, Video, Phone, 
  MoreVertical, Smile, Paperclip, Mic, Square, Send, X, 
  RotateCcw, Copy, Star, Forward, Trash2, Home, Settings,
  CheckCheck, Info, Monitor, Zap, Plus, Play, Pause, AlertCircle,
  Menu, User
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Avatar({ user, size = 40 }) {
  if (user?.avatarUrl) {
    return (
      <img 
        src={user.avatarUrl} 
        alt={user.name} 
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} 
        title={user.name}
      />
    );
  }
  const initials = user?.initials || user?.name?.slice(0, 2).toUpperCase() || '??';
  return (
    <div
      className={`avatar ${user?.color || 'av-green'}`}
      style={{ width: size, height: size, fontSize: size * 0.34, borderRadius: '50%' }}
      title={user?.name}
    >
      {initials}
    </div>
  );
}

function OnlineAvatar({ user, size = 40, borderColor }) {
  return (
    <div className="chat-avatar-wrap">
      <Avatar user={user} size={size} />
      {user?.online && (
        <span className="online-dot" style={borderColor ? { borderColor } : {}} />
      )}
    </div>
  );
}

// ─── Audio Player ───────────────────────────────────────────────────────────────
function AudioPlayer({ src, isMe, contactUser, meUser }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => setProgress((audio.currentTime / (audio.duration || 1)) * 100);
    const end = () => { setPlaying(false); setProgress(0); };
    const load = () => { if(audio.duration && audio.duration !== Infinity) setDuration(audio.duration); };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('ended', end);
    audio.addEventListener('loadedmetadata', load);
    
    if (audio.readyState >= 1) load();

    return () => {
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('ended', end);
      audio.removeEventListener('loadedmetadata', load);
    };
  }, []);

  const toggle = () => {
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const fmt = (secs) => {
    if (!secs || secs === Infinity || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 240 }}>
      <button 
        onClick={toggle} 
        style={{ 
           background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
           color: isMe ? '#fff' : 'var(--text-primary)',
        }}
        title={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
         <div style={{ position: 'relative', width: '100%', height: 4, background: isMe ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)', borderRadius: 2, margin: '8px 0', cursor: 'pointer' }}
              onClick={(e) => {
                 if(!audioRef.current || !audioRef.current.duration || audioRef.current.duration === Infinity) return;
                 const rect = e.currentTarget.getBoundingClientRect();
                 const frac = (e.clientX - rect.left) / rect.width;
                 audioRef.current.currentTime = frac * audioRef.current.duration;
                 if(!playing) { audioRef.current.play(); setPlaying(true); }
              }}
         >
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: isMe ? 'white' : 'var(--accent-primary)', borderRadius: 2 }} />
            <div style={{ position: 'absolute', top: -4, left: `calc(${progress}% - 6px)`, width: 12, height: 12, background: isMe ? 'white' : 'var(--accent-primary)', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
         </div>
         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: isMe ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
            <span>{playing ? fmt(audioRef.current?.currentTime) : fmt(duration)}</span>
         </div>
      </div>
      
      <div className={`avatar ${isMe ? meUser?.color : contactUser?.color}`} style={{ width: 34, height: 34, fontSize: 12, borderRadius: '50%', fontWeight: 600 }}>
        {isMe ? meUser?.initials : contactUser?.initials}
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}

// ─── Context Menu ────────────────────────────────────────────────────────────
function ContextMenu({ x, y, isMe, onClose, onReply, onDelete }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const items = [
    { icon: <RotateCcw size={16} />, label: 'Reply',   action: onReply },
    { icon: <Copy size={16} />,      label: 'Copy',    action: onClose },
    { icon: <Star size={16} />,      label: 'Star',    action: onClose },
    { icon: <Forward size={16} />,   label: 'Forward', action: onClose },
    ...(isMe ? [{ icon: <Trash2 size={16} />, label: 'Delete', danger: true, action: onDelete }] : []),
  ];

  return (
    <div ref={ref} className="context-menu" style={{ top: y, left: x }}>
      {items.map((item, i) => (
        <button
          key={i}
          className={`context-item ${item.danger ? 'danger' : ''}`}
          onClick={item.action}
        >
          <span>{item.icon}</span><span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Emoji Picker ────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return (
    <div ref={ref} className="emoji-picker">
      <div className="emoji-grid">
        {EMOJIS.map(em => <button key={em} onClick={() => onSelect(em)}>{em}</button>)}
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast">
      <div className="toast-icon">{toast.icon}</div>
      <div className="toast-body">
        <div className="toast-title">{toast.title}</div>
        {toast.msg && <div className="toast-msg">{toast.msg}</div>}
      </div>
    </div>
  );
}

// ─── New Chat Modal ───────────────────────────────────────────────────────────
function NewChatModal({ currentUserId, onStartChat, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    searchUsers(query, currentUserId).then(res => setResults(res));
  }, [query, currentUserId]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={18} /> New Chat
          </span>
        </div>
        <div className="modal-body">
          <div className="search-bar">
            <span className="search-icon"><Search size={16} /></span>
            <input
              className="search-input"
              placeholder="Enter exact @username or email..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              id="new-chat-search"
            />
          </div>

          <div className="user-search-results">
            {results.length === 0 && (
              <div className="search-empty">
                <div className="search-empty-icon"><Search size={40} /></div>
                <p>{query.trim() ? `No users found for "${query}"` : "Search for a user to start chatting"}</p>
              </div>
            )}
            {results.map(user => (
              <div
                key={user.id}
                className="user-result-item"
                onClick={() => onStartChat(user)}
                id={`user-result-${user.id}`}
              >
                <OnlineAvatar user={user} size={40} />
                <div className="user-result-info">
                  <div className="user-result-name">{user.name}</div>
                  <div className="user-result-email">@{user.username || 'user'} • {user.email}</div>
                </div>
                {user.online
                  ? <span className="user-result-badge">🟢 Online</span>
                  : <span className="user-result-badge" style={{ opacity: 0.6 }}>Offline</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Settings Modal ──────────────────────────────────────────────────
function ProfileSettingsModal({ user, onClose, onUpdate }) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username || '');
  const [about, setAbout] = useState(user.about || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!username.trim() || username.trim().length < 3) {
       setError('Username must be at least 3 characters.');
       setLoading(false);
       return;
    }

    const res = await updateProfile(user.id, { 
       name: name.trim(), 
       username: username.trim(),
       about: about.trim(), 
       avatarUrl 
    });
    
    if (res.error) {
       setError(res.error);
       setLoading(false);
       return;
    }
    
    onUpdate(res.user);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <button className="icon-btn" onClick={onClose} type="button"><X size={20} /></button>
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} /> Settings
          </span>
        </div>
        <form className="modal-body" onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, position: 'relative' }}>
             <Avatar user={{ ...user, avatarUrl }} size={100} />
             <label style={{ marginTop: 12, color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
               Change Profile Photo
               <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
             </label>
          </div>
          
          <div className="auth-field">
            <label className="auth-label">Your Name</label>
            <input className="auth-input" value={name} onChange={e=>setName(e.target.value)} required />
          </div>

          <div className="auth-field" style={{ marginTop: 16 }}>
            <label className="auth-label">Username</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">@</span>
              <input className="auth-input" value={username} onChange={e=>setUsername(e.target.value)} required />
            </div>
          </div>
          
          <div className="auth-field" style={{ marginTop: 16 }}>
            <label className="auth-label">About</label>
            <input className="auth-input" value={about} onChange={e=>setAbout(e.target.value)} placeholder="Available" />
          </div>

          {error && (
             <div className="auth-error" style={{ marginTop: 16 }}>
                <span><AlertCircle size={16} /></span> {error}
             </div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, borderRadius: 8, background: 'var(--accent-primary)', color: '#fff', border: 'none', marginTop: 24, fontWeight: 600, cursor: 'pointer' }}>
             {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Info Panel ──────────────────────────────────────────────────────────────
function InfoPanel({ user, onClose }) {
  return (
    <div className="info-panel">
      <div className="info-panel-header">
        <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        <span className="info-panel-title">Contact Info</span>
      </div>
      <div className="info-cover">
        <Avatar user={user} size={120} />
        <div className="info-name" style={{ marginTop: 16 }}>{user.name}</div>
        <div className="info-status">{user.online ? '🟢 Online' : '⚫ Offline'}</div>
      </div>
      <div className="info-section">
        <div className="info-section-title">About</div>
        <div className="info-row">
          <span className="info-row-icon"><Info size={16} /></span>
          <span className="info-row-text">{user.about || 'Hey there! I am using ChatterBox.'}</span>
        </div>
        <div className="info-row">
          <span className="info-row-icon">@</span>
          <span className="info-row-text">@{user.username || 'user'}</span>
        </div>
        <div className="info-row">
          <span className="info-row-icon">✉️</span>
          <span className="info-row-text">{user.email}</span>
        </div>
      </div>
      <div className="info-section">
        <div className="info-section-title">Media</div>
        <div className="media-grid">
          {['🖼️','📷','🎬','📸','🖼️','🌅'].map((e, i) => (
            <div key={i} className="media-thumb" style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, background:'var(--bg-tertiary)' }}>
              {e}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, contactUser, meUser, onContextMenu }) {
  const isMe = msg.from === meUser.id;
  return (
    <div className={`msg-row ${isMe ? 'out' : 'in'}`}>
      {!isMe && (
        <div className="msg-avatar-sm">
          <Avatar user={contactUser} size={28} />
        </div>
      )}
      <div className="msg-bubble-group">
        <div
          className="msg-bubble"
          onContextMenu={e => { e.preventDefault(); onContextMenu(e, msg); }}
        >
          {msg.replyTo && (
            <div className="reply-preview">
              <div className="reply-preview-name">{msg.replyTo.from === meUser.id ? 'You' : contactUser?.name}</div>
              <div className="reply-preview-text">{msg.replyTo.text}</div>
            </div>
          )}

          {msg.type === 'image' && (
            <div className="msg-media">
              <img src={msg.mediaUrl} alt="attachment" />
              {msg.text && <div style={{marginTop: 4, fontSize: 13.5}}>{msg.text}</div>}
            </div>
          )}

          {msg.type === 'voice' && (
            <div className="voice-msg" style={{ padding: '4px 0' }}>
              <AudioPlayer src={msg.mediaUrl} isMe={isMe} contactUser={contactUser} meUser={meUser} />
            </div>
          )}

          {(!msg.type || msg.type === 'text') && (
            <span className="msg-text">{msg.text}</span>
          )}
          <div className="msg-meta">
            <span className="msg-time">{msg.time}</span>
            {isMe && <span className={`msg-ticks ${msg.read ? 'read' : ''}`}><CheckCheck size={14} /></span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Area ────────────────────────────────────────────────────────────────
function ChatArea({ convId, contactUser, meUser, showInfo, setShowInfo, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const inputRef = useRef(null);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  // Listen to real-time messages
  useEffect(() => {
    const unsubscribe = subscribeMessages(convId, (msgs) => {
       setMessages(msgs);
       markConvRead(convId, meUser.id);
    });
    return () => unsubscribe();
  }, [convId, meUser.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real typing indicator
  useEffect(() => {
    const unsub = subscribeTypingStatus(convId, contactUser.id, setIsTyping);
    return () => unsub();
  }, [convId, contactUser.id]);

  let typingTimeout = useRef(null);
  const handleInputChange = (e) => {
    setInput(e.target.value);
    
    // Set typing status to true
    setTypingStatus(convId, meUser.id, true);
    
    // Clear and reset the timeout to set typing back to false
    if(typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
       setTypingStatus(convId, meUser.id, false);
    }, 3000);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(convId, meUser.id, text, 'text', null, null, replyTo);
    setInput('');
    setReplyTo(null);
    setShowEmoji(false);
    inputRef.current?.focus();
    
    // Instantly stop typing
    setTypingStatus(convId, meUser.id, false);
    if(typingTimeout.current) clearTimeout(typingTimeout.current);
  };

  const handleAttachClick = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      sendMessage(convId, meUser.id, '', 'image', ev.target.result, null, replyTo);
      setReplyTo(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
      setRecordTime(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = e => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            sendMessage(convId, meUser.id, '', 'voice', reader.result, null, replyTo);
            setReplyTo(null);
          };
          stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setRecordTime(0);
        recordTimerRef.current = setInterval(() => setRecordTime(p => p + 1), 1000);
      } catch (err) {
        alert('Microphone access denied or unavailable.');
      }
    }
  };

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleCtx = (e, msg) => {
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 220);
    setCtxMenu({ x, y, msg });
  };

  const handleDelete = (msgId) => {
    deleteMessage(convId, msgId);
    setCtxMenu(null);
  };

  // Group by date
  const grouped = [];
  let lastDate = null;
  messages.forEach(msg => {
    if (msg.date !== lastDate) { grouped.push({ type: 'date', label: msg.date }); lastDate = msg.date; }
    grouped.push({ type: 'msg', msg });
  });

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <OnlineAvatar user={contactUser} size={42} borderColor="var(--bg-secondary)" />
        <div className="chat-header-info">
          <div className="chat-header-name">{contactUser.name}</div>
          <div className="chat-header-sub">
            {isTyping ? (
              <>
                <span style={{ color: 'var(--accent-primary)' }}>typing</span>
                <div className="typing-dots">
                  <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                </div>
              </>
            ) : contactUser.online ? '🟢 Online' : '⚫ Offline'}
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="icon-btn" title="Video call"><Video size={20} /></button>
          <button className="icon-btn" title="Voice call"><Phone size={20} /></button>
          <button
            className="icon-btn"
            onClick={() => setShowInfo(v => !v)}
            title="Contact info"
            style={showInfo ? { background: 'var(--accent-glow)', color: 'var(--accent-primary)' } : {}}
          ><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-bg" id="chat-messages">
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)', fontSize: 13, paddingTop: 40 }}>
            <div style={{ fontSize: 48 }}>👋</div>
            <p>Say hi to <strong style={{ color: 'var(--accent-primary)' }}>{contactUser.name}</strong>!</p>
            <p style={{ fontSize: 12 }}>This is the beginning of your conversation.</p>
          </div>
        )}
        {grouped.map((item, idx) => {
          if (item.type === 'date') return (
            <div key={`d${idx}`} className="date-divider">
              <span className="date-label">{item.label}</span>
            </div>
          );
          return (
            <MessageBubble
              key={item.msg.id}
              msg={item.msg}
              meUser={meUser}
              contactUser={contactUser}
              onContextMenu={handleCtx}
            />
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="input-area" style={{ position: 'relative' }}>
        {showEmoji && (
          <EmojiPicker onSelect={em => setInput(v => v + em)} onClose={() => setShowEmoji(false)} />
        )}
        {replyTo && (
          <div className="reply-bar">
            <div className="reply-bar-content">
              <div className="reply-bar-name">{replyTo.from === meUser.id ? 'You' : contactUser.name}</div>
              <div className="reply-bar-text">{replyTo.text}</div>
            </div>
            <button className="reply-close" onClick={() => setReplyTo(null)}><X size={18} /></button>
          </div>
        )}
        <div className="input-row">
          <div className="input-actions">
            <button className="icon-btn" title="Attach" onClick={handleAttachClick}><Paperclip size={20} /></button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
          </div>
          <div className="input-box-wrap" style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', borderRadius: 24, padding: '8px 16px' }}>
            {isRecording ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'red', animation: 'pulse-dot 1.5s infinite' }} />
                  <span style={{ fontSize: 15, fontWeight: '500', color: 'var(--text-primary)' }}>
                    {Math.floor(recordTime/60)}:{(recordTime%60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  ◄ slide to cancel
                </div>
              </div>
            ) : (
              <>
                <button className="emoji-btn" onClick={() => setShowEmoji(v => !v)} title="Emoji" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}><Smile size={22} /></button>
                <textarea
                  ref={inputRef}
                  className="msg-input"
                  placeholder="Type a message..."
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKey}
                  rows={1}
                  id="message-input"
                  style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', outline: 'none', resize: 'none', padding: '6px 10px', fontSize: 14, fontFamily: 'inherit' }}
                  onInput={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                />
              </>
            )}
            
            {!input.trim() && !isRecording && (
              <button 
                className="icon-btn" 
                onClick={toggleRecording} 
                title="Record voice" 
                style={{ marginLeft: 4 }}
              >
                <Mic size={20} />
              </button>
            )}

            {isRecording && (
              <button 
                className="icon-btn" 
                onClick={toggleRecording} 
                title="Stop and Send" 
                style={{ color: '#e74c3c', marginLeft: 4 }}
              >
                <Square size={20} fill="currentColor" />
              </button>
            )}
          </div>
          
          {(!isRecording && input.trim()) && (
            <button className="send-btn" onClick={handleSend} id="send-btn" title="Send" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-primary)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.2s' }}>
              <Send size={20} />
            </button>
          )}
        </div>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          isMe={ctxMenu.msg.from === meUser.id}
          onClose={() => setCtxMenu(null)}
          onReply={() => { setReplyTo(ctxMenu.msg); setCtxMenu(null); inputRef.current?.focus(); }}
          onDelete={() => handleDelete(ctxMenu.msg.id)}
        />
      )}
    </div>
  );
}

// ─── Status Viewer ─────────────────────────────────────────────────────────────
function StatusViewer({ groupedStatuses, meUser, onClose, onAddStatus }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [viewingUserIdx, setViewingUserIdx] = useState(-1);
  const [viewingStatusIdx, setViewingStatusIdx] = useState(0);

  // Auto-advance
  useEffect(() => {
    if (viewingUserIdx < 0) return;
    const currentGroup = groupedStatuses[viewingUserIdx];
    if (!currentGroup) { setViewingUserIdx(-1); return; }

    const timer = setTimeout(() => {
      if (viewingStatusIdx < currentGroup.statuses.length - 1) {
        setViewingStatusIdx(v => v + 1);
      } else {
        if (viewingUserIdx < groupedStatuses.length - 1) {
          setViewingUserIdx(v => v + 1);
          setViewingStatusIdx(0);
        } else {
          setViewingUserIdx(-1);
        }
      }
    }, 4000); // 4 sec per status
    return () => clearTimeout(timer);
  }, [viewingUserIdx, viewingStatusIdx, groupedStatuses]);

  const handleAdd = () => {
    if (!text.trim()) return;
    const bgs = ['linear-gradient(135deg, #FF9A9E, #FECFEF)', 'linear-gradient(135deg, #4facfe, #00f2fe)', 'linear-gradient(135deg, #43e97b, #38f9d7)', 'linear-gradient(135deg, #fa709a, #fee140)', 'linear-gradient(135deg, #30cfd0, #330867)'];
    const bg = bgs[Math.floor(Math.random() * bgs.length)];
    onAddStatus(text, bg);
    setAdding(false);
    setText('');
  };

  if (viewingUserIdx >= 0) {
    const group = groupedStatuses[viewingUserIdx];
    const status = group?.statuses[viewingStatusIdx];
    if (!group || !status) return null;

    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
        {/* Progress bars */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 10px 0 10px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          {group.statuses.map((s, i) => (
            <div key={s.id} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#fff', width: i < viewingStatusIdx ? '100%' : i === viewingStatusIdx ? '100%' : '0%', transition: i === viewingStatusIdx ? 'width 4s linear' : 'none' }} />
            </div>
          ))}
        </div>
        {/* Header */}
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar user={group.user} size={40} />
            <div style={{ color: '#fff' }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{group.user.id === meUser.id ? 'My Status' : group.user.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{new Date(status.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
          <button onClick={() => setViewingUserIdx(-1)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>✕</button>
        </div>
        {/* Content */}
        <div style={{ flex: 1, background: status.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, cursor: 'pointer' }} onClick={() => {
           if (viewingStatusIdx < group.statuses.length - 1) setViewingStatusIdx(v => v + 1);
           else if (viewingUserIdx < groupedStatuses.length - 1) { setViewingUserIdx(v => v + 1); setViewingStatusIdx(0); }
           else setViewingUserIdx(-1);
        }}>
          <h1 style={{ color: '#fff', fontSize: 36, textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{status.text}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area" style={{ background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
      <div className="chat-header" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Status</h2>
        <button onClick={onClose} className="icon-btn">✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {adding ? (
          <div style={{ background: 'var(--bg-tertiary)', padding: 24, borderRadius: 12, maxWidth: 500, margin: '0 auto', boxShadow: 'var(--shadow-md)' }}>
             <h3 style={{ marginBottom: 16 }}>Create new status</h3>
             <textarea autoFocus placeholder="Type a status..." value={text} onChange={e=>setText(e.target.value)} style={{ width: '100%', height: 100, background: 'var(--bg-hover)', border: 'none', borderRadius: 8, padding: 12, color: 'var(--text-primary)', outline: 'none', resize: 'none', marginBottom: 16, fontSize: 18 }} />
             <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
               <button onClick={() => setAdding(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px 16px', fontWeight: 600 }}>Cancel</button>
               <button onClick={handleAdd} style={{ background: 'var(--accent-primary)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 24px', borderRadius: 24, fontWeight: 600 }}>Post</button>
             </div>
          </div>
        ) : (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
             {/* My status row */}
             <div className="chat-item" style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--bg-tertiary)', marginBottom: 30 }} onClick={() => {
                const myGroup = groupedStatuses.find(g => g.user.id === meUser.id);
                if (myGroup) { setViewingUserIdx(groupedStatuses.indexOf(myGroup)); setViewingStatusIdx(0); }
             }}>
               <div style={{ position: 'relative' }}>
                 <Avatar user={meUser} size={54} />
                 <button onClick={(e) => { e.stopPropagation(); setAdding(true); }} style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, background: 'var(--accent-primary)', border: '2px solid var(--bg-tertiary)', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', padding: 0 }}>+</button>
               </div>
               <div className="chat-body" style={{ paddingLeft: 16 }}>
                 <div className="chat-name">My status</div>
                 <div className="chat-preview">{groupedStatuses.find(g=>g.user.id===meUser.id) ? 'Tap to view your status update' : 'Tap to add status update'}</div>
               </div>
             </div>

             <h3 style={{ color: 'var(--text-muted)', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, paddingLeft: 8 }}>Recent updates</h3>
             
             {groupedStatuses.filter(g => g.user.id !== meUser.id).length === 0 && (
               <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No recent updates from your contacts.</div>
             )}

             {groupedStatuses.filter(g => g.user.id !== meUser.id).map((group, idx) => (
               <div key={group.user.id} className="chat-item" style={{ borderRadius: 12 }} onClick={() => {
                  setViewingUserIdx(groupedStatuses.indexOf(group));
                  setViewingStatusIdx(0);
               }}>
                 <div style={{ padding: 3, borderRadius: '50%', border: '2px solid var(--accent-primary)' }}>
                   <Avatar user={group.user} size={48} />
                 </div>
                 <div className="chat-body" style={{ paddingLeft: 16 }}>
                   <div className="chat-name">{group.user.name}</div>
                   <div className="chat-preview">{new Date(group.statuses[group.statuses.length-1].ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ meUser, conversations, activeConvId, onSelect, onNewChat, onLogout, activeTab, setActiveTab, onOpenProfile }) {
  const [search, setSearch] = useState('');
  const [activeTabLocal, setActiveTabLocal] = useState('Chats');
  const finalTab = activeTab || activeTabLocal;
  const setTab = setActiveTab || setActiveTabLocal;

  const filtered = conversations.filter(c =>
    c.contact.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo"><MessageCircle size={22} color="white" /></div>
          <span className="sidebar-brand-name">ChatterBox</span>
        </div>
        <div className="sidebar-actions">
          <button className="icon-btn" onClick={onNewChat} title="New chat" id="new-chat-btn"><Edit3 size={20} /></button>
          <button className="icon-btn" onClick={onLogout} title="Sign out"><LogOut size={20} /></button>
        </div>
      </div>

      {/* My status */}
      <div className="my-status-bar" onClick={onOpenProfile} style={{ cursor: 'pointer' }} title="Profile Settings">
        <div className="my-avatar">
          <Avatar user={meUser} size={42} />
          <span className="online-dot" />
        </div>
        <div className="my-info">
          <div className="my-name">{meUser.name}</div>
          <div className="my-status-text">🟢 Online</div>
        </div>
      </div>

      {/* Search */}
      <div className="search-wrapper">
        <div className="search-bar">
          <span className="search-icon"><Search size={16} /></span>
          <input
            className="search-input"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="search-input"
          />
          {search && <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center' }} onClick={() => setSearch('')}><X size={16} /></button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs">
        {['Chats', 'Status', 'Calls'].map(t => (
          <button
            key={t}
            className={`tab-btn ${finalTab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'Chats' && <MessageCircle size={16} />}{t === 'Status' && <Zap size={16} />}{t === 'Calls' && <Phone size={16} />}{t}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="chat-list">
        {finalTab === 'Chats' && (
          <>
            {filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8, display: 'flex', justifyContent: 'center' }}><MessageCircle size={40} /></div>
                {search ? `No results for "${search}"` : 'No conversations yet. Start a new chat!'}
              </div>
            )}
            {filtered.map(conv => {
              const last = conv.messages[conv.messages.length - 1];
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  className={`chat-item ${isActive ? 'active' : ''} ${conv.unread > 0 ? 'unread' : ''}`}
                  onClick={() => onSelect(conv)}
                  id={`chat-item-${conv.id}`}
                >
                  <OnlineAvatar user={conv.contact} size={46} borderColor={isActive ? 'var(--bg-hover)' : 'var(--bg-secondary)'} />
                  <div className="chat-body">
                    <div className="chat-top-row">
                      <span className="chat-name">{conv.contact.name}</span>
                      <span className="chat-time">{last?.time || ''}</span>
                    </div>
                    <div className="chat-bottom-row">
                      <span className="chat-preview">
                        {last?.from === meUser.id && <span style={{ color: 'var(--accent-primary)' }}>✓✓ </span>}
                        {last?.text || <em style={{ color: 'var(--text-muted)' }}>Start the conversation</em>}
                      </span>
                      {conv.unread > 0 && <span className="unread-badge">{conv.unread}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        {finalTab === 'Status' && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Zap size={40} className="pulse" /></div>
            <p>View updates from your contacts on the right panel.</p>
          </div>
        )}
        {finalTab === 'Calls' && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Phone size={40} /></div>
            <p>Call history coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── External Admin Dashboard ────────────────────────────────────────────────────────
function AdminExternalPanel({ currentUserId, onLogout }) {
  const [users, setUsers] = useState([]);
  const [draftUser, setDraftUser] = useState(null);
  const [emailSubject, setEmailSubject] = useState('Message from ChatterBox Admin');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  
  useEffect(() => {
    import('./auth.js').then(m => m.getAllUsers()).then(res => setUsers(res));
  }, []);

  const handleSendEmailJS = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setSendError('');
    setSendSuccess(false);

    try {
      const SERVICE_ID = 'service_tgmhdhi';
      const TEMPLATE_ID = 'template_ttt6ycx';
      const PUBLIC_KEY = 'w9CuN7gza9ilF2UNZ';

      const templateParams = {
        to_name: draftUser.name,
        to_email: draftUser.email,
        subject: emailSubject,
        message: emailBody,
      };

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      setSendSuccess(true);
      setTimeout(() => setDraftUser(null), 2000); 
    } catch (err) {
      setSendError('Failed to send email. Check your EmailJS configuration.');
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
      <header style={{ padding: '24px 60px', background: 'rgba(15, 17, 21, 0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', sticky: 'top', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
           <div style={{ width: 42, height: 42, background: 'var(--bubble-out)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' }}>
             <Shield size={24} color="white" />
           </div>
           <div>
             <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>System Admin</h1>
             <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Management Dashboard</p>
           </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
           <button onClick={() => window.location.replace('/CHATBOT1/')} style={{ padding: '10px 24px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'var(--transition)' }}>Back to App</button>
           <button onClick={onLogout} style={{ padding: '10px 24px', background: 'rgba(231, 76, 60, 0.15)', border: '1px solid rgba(231, 76, 60, 0.3)', borderRadius: 12, color: '#ff6b6b', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Logout</button>
        </div>
      </header>
      
      <main style={{ flex: 1, padding: '60px 20px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
         <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h2 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>User Management</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Overview of all registered accounts on the platform</p>
            </div>
            <div style={{ padding: '14px 28px', background: 'var(--bg-tertiary)', borderRadius: 20, border: '1px solid var(--border)', textAlign: 'center' }}>
               <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-primary)' }}>{users.length}</div>
               <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Total Users</div>
            </div>
         </div>

         <div style={{ background: 'var(--bg-tertiary)', borderRadius: 24, border: '1px solid var(--border)', padding: 12, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
               <div style={{ flex: 2 }}>User Info</div>
               <div style={{ flex: 1 }}>Status</div>
               <div style={{ width: 140, textAlign: 'right' }}>Actions</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
               {users.map((u, i) => (
                 <div key={u.id} className="admin-user-row" style={{ display: 'flex', alignItems: 'center', padding: '20px 24px', borderRadius: 16, transition: 'var(--transition)', borderBottom: i === users.length - 1 ? 'none' : '1px solid var(--border)' }}>
                    <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 16 }}>
                      <OnlineAvatar user={u} size={50} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{u.name} {u.id === currentUserId ? ' (You)' : ''}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{u.email}</div>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                       {u.online ? (
                         <span style={{ color: 'var(--accent-primary)', fontSize: 12, fontWeight: 700, padding: '4px 12px', background: 'var(--accent-glow)', borderRadius: 20 }}>Online</span>
                       ) : (
                         <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>Offline</span>
                       )}
                    </div>
                    <div style={{ width: 140, textAlign: 'right' }}>
                       <button 
                         onClick={() => { setDraftUser(u); setSendSuccess(false); setSendError(''); setEmailBody(''); }}
                         style={{ background: 'white', color: 'black', border: 'none', padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,255,255,0.1)' }}
                       >
                         Email
                       </button>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </main>

      {draftUser && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) setDraftUser(null); }}>
          <div className="modal" style={{ maxWidth: 540, borderRadius: 28, background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '30px 40px', border: 'none', background: 'var(--bg-hover)' }}>
              <div>
                <span className="modal-title" style={{ fontSize: 24, fontWeight: 800 }}>Draft Email</span>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Sending to {draftUser.name}</p>
              </div>
              <button className="icon-btn" onClick={() => setDraftUser(null)}>✕</button>
            </div>
            <form className="modal-body" style={{ padding: '40px' }} onSubmit={handleSendEmailJS}>
              <div className="auth-field" style={{ marginBottom: 24 }}>
                <label className="auth-label" style={{ fontWeight: 700, opacity: 0.6 }}>Recipient</label>
                <input className="auth-input" value={draftUser.email} disabled style={{ background: 'rgba(0,0,0,0.2)', border: 'none', opacity: 0.6 }} />
              </div>
              <div className="auth-field" style={{ marginBottom: 24 }}>
                <label className="auth-label" style={{ fontWeight: 700 }}>Subject</label>
                <input className="auth-input" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '16px' }} value={emailSubject} onChange={e => setEmailSubject(e.target.value)} required />
              </div>
              <div className="auth-field" style={{ marginBottom: 30 }}>
                <label className="auth-label" style={{ fontWeight: 700 }}>Message</label>
                <textarea 
                  className="auth-input" 
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '16px', borderRadius: 20, resize: 'none' }}
                  value={emailBody} 
                  onChange={e => setEmailBody(e.target.value)} 
                  required 
                  rows={6}
                />
              </div>

              {sendError && <div className="auth-error" style={{ marginBottom: 24 }}><span>⚠️</span> {sendError}</div>}
              {sendSuccess && <div style={{ color: 'var(--accent-primary)', padding: '16px', background: 'var(--accent-glow)', borderRadius: 16, marginBottom: 24, fontWeight: 700, textAlign: 'center' }}>✅ Email sent successfully!</div>}

              <button 
                type="submit" 
                disabled={isSending || sendSuccess} 
                style={{ width: '100%', padding: '18px', borderRadius: 16, background: 'var(--bubble-out)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: 'var(--shadow-glow)' }}
              >
                {isSending ? 'Sending...' : 'Send Now'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Welcome ──────────────────────────────────────────────────────────────────
function WelcomeScreen({ meUser, onNewChat }) {
  return (
    <div className="chat-area" style={{ background: 'radial-gradient(circle at center, var(--bg-hover) 0%, var(--bg-primary) 100%)' }}>
      <div className="welcome-screen" style={{ padding: '60px' }}>
        <div className="welcome-icon" style={{ width: 120, height: 120, border: '4px solid rgba(255,255,255,0.05)' }}>
          <MessageCircle size={54} color="white" />
        </div>
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>Welcome, {meUser.name.split(' ')[0]}!</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>Ready to connect with your world? Start a conversation now.</p>
        </div>
        
        <div className="welcome-dots" style={{ margin: '20px 0' }}>
          <div className="welcome-dot" /><div className="welcome-dot" /><div className="welcome-dot" />
        </div>

        <button
          onClick={onNewChat}
          style={{
            marginTop: 10, padding: '18px 42px', borderRadius: 20,
            background: 'var(--bubble-out)',
            border: 'none', color: '#fff', fontSize: 16, fontWeight: 800,
            fontFamily: "'Outfit', sans-serif", cursor: 'pointer', boxShadow: 'var(--shadow-glow)',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          className="welcome-primary-btn"
        >
          Start New Chat
        </button>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 30 }}>
          {[
            { icon: <Lock size={14} />, label: 'Secured Encryption' },
            { icon: <Zap size={14} />, label: 'Fast Delivery' },
            { icon: <Monitor size={14} />, label: 'Real-time Online' }
          ].map(f => (
            <span key={f.label} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '10px 18px',
              fontSize: 13, color: 'var(--text-muted)', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              {f.icon} {f.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [meUser, setMeUser] = useState(() => getSession());
  const [conversations, setConversations] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [activeConv, setActiveConv] = useState(null); // { id, contactId, contact }
  const [activeTab, setActiveTab] = useState('Chats');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!meUser) return;
    const unsubConvs = subscribeConversations(meUser.id, setConversations);
    const unsubStats = subscribeStatuses(setStatuses);
    return () => {
       unsubConvs();
       unsubStats();
    };
  }, [meUser]);

  // Handle unload hook manually (removed setOnlineStatus call as Firebase handles it differently or would need async unload)
  useEffect(() => {
     // ... omitting setOnlineStatus to keep simple
  }, []);

  const handleAuth = (user) => {
    setMeUser(user);
    saveSession(user);
  };

  const handleLogout = () => {
    logout(meUser.id);
    setMeUser(null);
    setActiveConv(null);
  };

  const handleSelectConv = (conv) => {
    setActiveConv(conv);
    setShowInfo(false);
    markConvRead(conv.id, meUser.id);
  };

  const handleStartChat = (contactUser) => {
    const convId = getOrCreateConv(meUser.id, contactUser.id);
    const conv = {
      id: convId,
      contactId: contactUser.id,
      contact: contactUser,
      messages: [],
      unread: 0,
    };
    setShowNewChat(false);
    setActiveConv(conv);
    setActiveTab('Chats');
  };
  
  const handleAddStatus = (text, bg) => {
     addStatus(meUser.id, text, bg);
  };

  // Not logged in → show auth
  if (!meUser) {
    return <AuthPage onAuth={handleAuth} />;
  }

  if ((window.location.hash === '#admin' || window.location.search.includes('admin=true')) && meUser?.email === 'aadilmax2023@gmail.com') {
    return <AdminExternalPanel currentUserId={meUser.id} onLogout={handleLogout} />;
  }

  return (
    <div className="app-container">
      <Sidebar
        meUser={meUser}
        conversations={conversations}
        activeConvId={activeConv?.id}
        onSelect={handleSelectConv}
        onNewChat={() => setShowNewChat(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenProfile={() => setShowProfileSettings(true)}
      />

      {activeTab === 'Status' ? (
        <StatusViewer 
          groupedStatuses={statuses} 
          meUser={meUser} 
          onClose={() => setActiveTab('Chats')} 
          onAddStatus={handleAddStatus}
        />
      ) : activeConv ? (
        <ChatArea
          key={activeConv.id}
          convId={activeConv.id}
          contactUser={activeConv.contact}
          meUser={meUser}
          showInfo={showInfo}
          setShowInfo={setShowInfo}
        />
      ) : (
        <WelcomeScreen meUser={meUser} onNewChat={() => setShowNewChat(true)} />
      )}

      {showInfo && activeConv && (
        <InfoPanel user={activeConv.contact} onClose={() => setShowInfo(false)} />
      )}

      {showNewChat && (
        <NewChatModal
          currentUserId={meUser.id}
          onStartChat={handleStartChat}
          onClose={() => setShowNewChat(false)}
        />
      )}

      {showProfileSettings && (
         <ProfileSettingsModal 
            user={meUser} 
            onClose={() => setShowProfileSettings(false)} 
            onUpdate={(u) => handleAuth(u)}
         />
      )}

      <Toast toast={toast} />
    </div>
  );
}
