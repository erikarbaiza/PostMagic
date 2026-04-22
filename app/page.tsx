"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Share2, Video, Copy, Check, Clock, Trash2, Zap, Star, Hash, Sparkles, AlertCircle, Crown, TrendingUp } from "lucide-react";
import { UserButton, SignInButton, useAuth } from "@clerk/nextjs";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: string;
  type: string;
  input: string;
  result: string;
  createdAt: number;
}

interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  isPro: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'postmagic_history';
const FAVORITES_KEY = 'postmagic_favorites';

const PLATFORMS = [
  { key: 'twitter', label: 'X / Twitter', tag: '280c' },
  { key: 'linkedin', label: 'LinkedIn', tag: 'Prof.' },
  { key: 'tiktok', label: 'TikTok', tag: '60s' },
];

const GOALS = [
  { key: 'engagement', label: 'Engagement' },
  { key: 'ventas', label: 'Ventas' },
  { key: 'autoridad', label: 'Autoridad' },
  { key: 'polemica', label: 'Polémica' },
];

const TYPE_LABELS: Record<string, string> = {
  twitter: 'Hilo de X',
  linkedin: 'Post LinkedIn',
  tiktok: 'Guion TikTok',
};

// ─── Previews ─────────────────────────────────────────────────────────────────

function LinkedInPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = !expanded && text.length > 220 ? text.slice(0, 220) + '...' : text;
  return (
    <div style={{ background: '#1b1f23', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #e88a3c, #c0622a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0 }}>E</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#e8e4dc' }}>Erik Arbaiza</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Founder · PostMagic AI</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>Hace 1 h · 🌐</div>
        </div>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(232,228,220,0.8)', whiteSpace: 'pre-wrap', margin: '0 0 12px' }}>{preview}</p>
      {text.length > 220 && (
        <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 12 }}>
          {expanded ? 'ver menos' : 'ver más'}
        </button>
      )}
      <div style={{ display: 'flex', gap: 20, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
        <span>👍 14</span><span>💬 3 comentarios</span><span style={{ marginLeft: 'auto' }}>↗ Compartir</span>
      </div>
    </div>
  );
}

function TwitterPreview({ text }: { text: string }) {
  const tweets = text.split('---').map(t => t.trim()).filter(Boolean);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {tweets.map((tweet, i) => (
        <div key={i} style={{ background: '#1b1f23', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #e88a3c, #c0622a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>E</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#e8e4dc' }}>Erik Arbaiza</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>@erikarbaiza · 1h</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(232,228,220,0.8)', margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{tweet}</p>
              <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
                <span>💬 4</span><span>🔁 12</span><span>❤️ 37</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TikTokPreview({ text }: { text: string }) {
  return (
    <div style={{ background: '#1b1f23', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>🎬</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Script Preview</span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(232,228,220,0.8)', whiteSpace: 'pre-wrap', margin: 0 }}>{text}</p>
    </div>
  );
}

// ─── Usage Bar ────────────────────────────────────────────────────────────────

function UsageBar({ usage, onUpgrade }: { usage: UsageData; onUpgrade: () => void }) {
  if (usage.isPro) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10 }}>
        <Crown size={14} color="#fbbf24" />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>Pro · Generaciones ilimitadas</span>
      </div>
    );
  }

  const pct = Math.min(usage.used / 30, 1);
  const isNearLimit = usage.remaining <= 5;
  const isAtLimit = usage.remaining === 0;
  const barColor = isAtLimit ? '#f87171' : isNearLimit ? '#fbbf24' : '#e88a3c';

  return (
    <div style={{ padding: '12px 16px', background: isAtLimit ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isAtLimit ? 'rgba(248,113,113,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={12} color="rgba(255,255,255,0.35)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Uso mensual
          </span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: barColor, fontFamily: "'JetBrains Mono', monospace" }}>
          {usage.used} / 30
        </span>
      </div>

      <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width 600ms ease' }} />
      </div>

      {isAtLimit ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertCircle size={12} /> Límite alcanzado
          </span>
          <button onClick={onUpgrade} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'linear-gradient(135deg, #f59e0b, #e88a3c)', border: 'none', color: '#09090a', padding: '5px 12px', borderRadius: 7, fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
            <Crown size={11} /> Upgrade a Pro
          </button>
        </div>
      ) : isNearLimit ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#fbbf24' }}>Solo te quedan {usage.remaining} generaciones</span>
          <button onClick={onUpgrade} style={{ background: 'none', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', padding: '4px 10px', borderRadius: 6, fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            Ver Pro →
          </button>
        </div>
      ) : (
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>{usage.remaining} generaciones restantes este mes</span>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PostMagic() {
  const { isSignedIn } = useAuth();

  const [input, setInput] = useState('');
  const [editableResult, setEditableResult] = useState('');
  const [activeType, setActiveType] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<HistoryItem[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState('twitter');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('engagement');
  const [activeTab, setActiveTab] = useState<'historial' | 'favoritos'>('historial');
  const [showPreview, setShowPreview] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const [usage, setUsage] = useState<UsageData>({ used: 0, limit: 30, remaining: 30, isPro: false });
  const [limitError, setLimitError] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);
  const editableResultRef = useRef(editableResult);
  const favoritesRef = useRef(favorites);

  useEffect(() => { editableResultRef.current = editableResult; }, [editableResult]);
  useEffect(() => { favoritesRef.current = favorites; }, [favorites]);

  // Cargar historial local
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
      const fav = localStorage.getItem(FAVORITES_KEY);
      if (fav) setFavorites(JSON.parse(fav));
    } catch {}
  }, []);

  // Cargar uso
  useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/usage')
      .then(r => r.json())
      .then(data => setUsage(data))
      .catch(() => {});
  }, [isSignedIn, editableResult]); // se refresca tras cada generación

  const refreshUsage = () => {
    fetch('/api/usage')
      .then(r => r.json())
      .then(data => setUsage(data))
      .catch(() => {});
  };

  const saveToHistory = (type: string, inputText: string, result: string) => {
    const item: HistoryItem = { id: Date.now().toString(), type, input: inputText, result, createdAt: Date.now() };
    const updated = [item, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const toggleFavorite = (item: HistoryItem) => {
    const exists = favorites.find(f => f.id === item.id);
    const updated = exists ? favorites.filter(f => f.id !== item.id) : [item, ...favorites].slice(0, 50);
    setFavorites(updated);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  };

  const isFavorite = (id: string) => favorites.some(f => f.id === id);

  const saveCurrent = () => {
    const current = editableResultRef.current;
    if (!current) return;
    const exists = favoritesRef.current.some(f => f.result === current);
    if (exists) { setActiveTab('favoritos'); return; }
    const item: HistoryItem = { id: Date.now().toString(), type: activeType || selectedPlatform, input, result: current, createdAt: Date.now() };
    const updated = [item, ...favoritesRef.current].slice(0, 50);
    setFavorites(updated);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    setActiveTab('favoritos');
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const deleteFromHistory = (id: string, list: 'history' | 'favorites') => {
    if (list === 'history') {
      const updated = history.filter(i => i.id !== id);
      setHistory(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } else {
      const updated = favorites.filter(i => i.id !== id);
      setFavorites(updated);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    }
  };

  // ── Upgrade a Pro ──────────────────────────────────────────────────────────
  const handleUpgrade = async () => {
    setCheckingOut(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert('Error al iniciar el checkout. Inténtalo de nuevo.');
    } finally {
      setCheckingOut(false);
    }
  };

  // ── Generar contenido ──────────────────────────────────────────────────────
  const generateContent = async (type: string, mode: 'full' | 'hooks' | 'rewrite' = 'full', rewriteStyle?: string) => {
    const textToSend = mode === 'rewrite' ? editableResultRef.current : input;
    if (!textToSend?.trim()) return;

    setLoading(true);
    setLoadingAction(mode === 'rewrite' ? rewriteStyle || 'rewrite' : mode);
    setActiveType(type);
    setHashtags([]);
    setLimitError(false);

    if (mode !== 'rewrite') {
      setEditableResult('');
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend, type, audience, goal, mode, rewriteStyle }),
      });

      const data = await res.json();

      if (res.status === 403 && data.error === 'LIMIT_REACHED') {
        setLimitError(true);
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Error');

      setEditableResult(data.result);
      if (mode === 'full') saveToHistory(type, input, data.result);
      refreshUsage();

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setEditableResult('❌ Error al generar. Comprueba tu configuración.');
    } finally {
      setLoading(false);
      setLoadingAction('');
    }
  };

  const generateHashtags = async () => {
    if (!editableResult.trim()) return;
    setLoading(true);
    setLoadingAction('hashtags');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editableResult,
          type: activeType || selectedPlatform,
          mode: 'rewrite',
          rewriteStyle: `Genera SOLO 5 hashtags virales para ${TYPE_LABELS[activeType || selectedPlatform]}, uno por línea, sin explicaciones, solo los hashtags con #`,
          audience, goal,
        }),
      });
      const data = await res.json();
      const tags = (data.result || '').split('\n').map((t: string) => t.trim()).filter((t: string) => t.startsWith('#'));
      setHashtags(tags.slice(0, 5));
    } catch {} finally {
      setLoading(false);
      setLoadingAction('');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.65)', padding: '8px 14px', borderRadius: 8,
    fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms ease',
  };

  const renderListItem = (item: HistoryItem, list: 'history' | 'favorites') => (
    <div key={item.id}
      onClick={() => { setEditableResult(item.result); setActiveType(item.type); setInput(item.input); setHashtags([]); }}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'all 150ms ease' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#e88a3c', textTransform: 'uppercase', background: 'rgba(232,138,60,0.1)', padding: '2px 8px', borderRadius: 4 }}>
            {TYPE_LABELS[item.type]}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>
            {new Date(item.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.input.length > 80 ? `${item.input.substring(0, 80)}…` : item.input}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 4, marginLeft: 12, flexShrink: 0 }}>
        <button onClick={e => { e.stopPropagation(); toggleFavorite(item); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: isFavorite(item.id) ? '#fbbf24' : 'rgba(255,255,255,0.15)', transition: 'color 150ms' }}>
          <Star size={13} fill={isFavorite(item.id) ? '#fbbf24' : 'none'} />
        </button>
        <button onClick={e => { e.stopPropagation(); deleteFromHistory(item.id, list); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'rgba(255,255,255,0.15)', transition: 'color 150ms' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#09090a', color: '#e8e4dc', fontFamily: "'Syne', sans-serif", overflowX: 'hidden' }}>
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.035, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '200px' }} />
      <div style={{ position: 'fixed', top: '-20%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(232,138,60,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 48px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#e88a3c', borderRadius: 6, padding: '5px 7px', display: 'flex', alignItems: 'center' }}>
            <Zap size={16} color="#09090a" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>PostMagic</span>
          {usage.isPro && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <Crown size={10} /> Pro
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {!usage.isPro && (
            <button onClick={handleUpgrade} disabled={checkingOut} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #f59e0b, #e88a3c)', border: 'none', color: '#09090a', padding: '8px 16px', borderRadius: 8, fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              <Crown size={13} /> {checkingOut ? 'Redirigiendo...' : 'Upgrade a Pro'}
            </button>
          )}
          {!isSignedIn ? (
            <SignInButton mode="modal">
              <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e8e4dc', padding: '8px 16px', borderRadius: 8, fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Login</button>
            </SignInButton>
          ) : (
            <UserButton />
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '64px 32px 0', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,138,60,0.1)', border: '1px solid rgba(232,138,60,0.2)', borderRadius: 100, padding: '5px 14px', marginBottom: 20 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#e88a3c' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#e88a3c', textTransform: 'uppercase' }}>IA · Contenido viral</span>
        </div>
        <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 62px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#f0ece4' }}>
          Turn ideas into viral posts<br />
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>in seconds.</span>
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0, letterSpacing: '0.04em' }}>LinkedIn · X / Twitter · TikTok</p>
      </div>

      {/* Main */}
      <main style={{ position: 'relative', zIndex: 10, maxWidth: 760, margin: '0 auto', padding: '48px 32px 120px' }}>

        {/* Usage bar */}
        {isSignedIn && (
          <div style={{ marginBottom: 20 }}>
            <UsageBar usage={usage} onUpgrade={handleUpgrade} />
          </div>
        )}

        {/* Limit error banner */}
        {limitError && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} color="#f87171" />
              <span style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>Has alcanzado el límite de 30 generaciones gratuitas este mes.</span>
            </div>
            <button onClick={handleUpgrade} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'linear-gradient(135deg, #f59e0b, #e88a3c)', border: 'none', color: '#09090a', padding: '7px 14px', borderRadius: 8, fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <Crown size={12} /> Upgrade a Pro
            </button>
          </div>
        )}

        {/* Platform selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {PLATFORMS.map(({ key, label, tag }) => (
            <button key={key} onClick={() => setSelectedPlatform(key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, border: selectedPlatform === key ? '1px solid rgba(232,138,60,0.5)' : '1px solid rgba(255,255,255,0.07)', background: selectedPlatform === key ? 'rgba(232,138,60,0.1)' : 'rgba(255,255,255,0.03)', color: selectedPlatform === key ? '#e88a3c' : 'rgba(255,255,255,0.4)', fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms ease' }}>
              {label}
              <span style={{ fontSize: 10, fontWeight: 600, background: selectedPlatform === key ? 'rgba(232,138,60,0.2)' : 'rgba(255,255,255,0.06)', color: selectedPlatform === key ? '#e88a3c' : 'rgba(255,255,255,0.25)', padding: '2px 7px', borderRadius: 4 }}>{tag}</span>
            </button>
          ))}
        </div>

        {/* Audience + Goal */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 8 }}>Audiencia</label>
            <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Ej: programadores, abogados..." style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#e8e4dc', fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }} />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 8 }}>Objetivo</label>
            <select value={goal} onChange={e => setGoal(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#e8e4dc', fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>
              {GOALS.map(g => <option key={g.key} value={g.key} style={{ background: '#111' }}>{g.label}</option>)}
            </select>
          </div>
        </div>

        {/* Textarea */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pega aquí el contenido, enlace o idea..."
            rows={5}
            style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none', padding: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, lineHeight: 1.7, color: '#e8e4dc', resize: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>{input.length} chars</span>
            <button
              onClick={() => generateContent(selectedPlatform)}
              disabled={!input.trim() || loading || (!usage.isPro && usage.remaining === 0)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: input.trim() && !loading && (usage.isPro || usage.remaining > 0) ? '#e88a3c' : 'rgba(255,255,255,0.06)', color: input.trim() && !loading && (usage.isPro || usage.remaining > 0) ? '#09090a' : 'rgba(255,255,255,0.2)', border: 'none', padding: '10px 24px', borderRadius: 10, fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800, cursor: input.trim() && !loading && (usage.isPro || usage.remaining > 0) ? 'pointer' : 'not-allowed', transition: 'all 200ms ease' }}
            >
              {loading && loadingAction === 'full' ? (
                <><span style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#09090a', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Generando...</>
              ) : (
                <><Zap size={14} strokeWidth={2.5} />Generar {TYPE_LABELS[selectedPlatform]}</>
              )}
            </button>
          </div>
        </div>

        {/* Result */}
        {editableResult && (
          <div ref={resultRef} style={{ background: 'rgba(232,138,60,0.05)', border: '1px solid rgba(232,138,60,0.2)', borderRadius: 16, padding: 28, marginBottom: 32, animation: 'fadeUp 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e88a3c' }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#e88a3c', textTransform: 'uppercase' }}>{TYPE_LABELS[activeType]}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setShowPreview(!showPreview)} style={{ ...btnBase, border: showPreview ? '1px solid rgba(232,138,60,0.4)' : btnBase.border as string, color: showPreview ? '#e88a3c' : btnBase.color }}>
                  👁 {showPreview ? 'Editor' : 'Preview'}
                </button>
                <button onClick={saveCurrent} style={{ ...btnBase, background: savedFlash ? 'rgba(251,191,36,0.15)' : btnBase.background as string, border: savedFlash ? '1px solid rgba(251,191,36,0.4)' : btnBase.border as string, color: savedFlash ? '#fbbf24' : btnBase.color }}>
                  <Star size={12} fill={savedFlash ? '#fbbf24' : 'none'} />{savedFlash ? '¡Guardado!' : 'Guardar'}
                </button>
                <button onClick={() => handleCopy(editableResult)} style={{ ...btnBase, background: copied ? 'rgba(34,197,94,0.1)' : btnBase.background as string, border: copied ? '1px solid rgba(34,197,94,0.3)' : btnBase.border as string, color: copied ? '#4ade80' : btnBase.color }}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {showPreview ? (
              <div style={{ marginBottom: 16 }}>
                {activeType === 'linkedin' && <LinkedInPreview text={editableResult} />}
                {activeType === 'twitter' && <TwitterPreview text={editableResult} />}
                {activeType === 'tiktok' && <TikTokPreview text={editableResult} />}
              </div>
            ) : (
              <textarea value={editableResult} onChange={e => setEditableResult(e.target.value)} rows={14}
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, fontSize: 14, lineHeight: 1.8, color: 'rgba(232,228,220,0.85)', margin: 0, fontFamily: "'JetBrains Mono', monospace", resize: 'vertical', outline: 'none', minHeight: 280 }}
              />
            )}

            {hashtags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {hashtags.map(tag => (
                  <button key={tag} onClick={() => navigator.clipboard.writeText(tag)} style={{ background: 'rgba(232,138,60,0.1)', border: '1px solid rgba(232,138,60,0.2)', color: '#e88a3c', padding: '5px 12px', borderRadius: 100, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, cursor: 'pointer' }}>{tag}</button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {['más viral', 'más corto', 'más profesional', 'más divertido'].map(styleLabel => (
                <button key={styleLabel} onClick={() => generateContent(activeType || selectedPlatform, 'rewrite', styleLabel)} disabled={loading} style={{ ...btnBase, opacity: loading && loadingAction === styleLabel ? 0.5 : 1 }}>
                  {loading && loadingAction === styleLabel ? <span style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.7)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> : null}
                  {styleLabel}
                </button>
              ))}
              <button onClick={() => generateContent(activeType || selectedPlatform, 'rewrite', 'Mejora este contenido haciéndolo más claro, viral y atractivo, manteniendo la idea original')} disabled={loading} style={{ ...btnBase, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: 'rgba(167,139,250,0.9)' }}>
                <Sparkles size={12} /> Mejorar post
              </button>
              <button onClick={generateHashtags} disabled={loading} style={{ ...btnBase, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: 'rgba(147,197,253,0.9)' }}>
                {loading && loadingAction === 'hashtags' ? <span style={{ width: 10, height: 10, border: '2px solid rgba(147,197,253,0.3)', borderTopColor: 'rgba(147,197,253,0.9)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> : <Hash size={12} />}
                Hashtags
              </button>
              <button onClick={() => generateContent(selectedPlatform, 'hooks')} disabled={!input.trim() || loading} style={{ ...btnBase, background: 'rgba(232,138,60,0.12)', border: '1px solid rgba(232,138,60,0.25)', color: '#e88a3c' }}>
                Hooks virales
              </button>
            </div>
          </div>
        )}

        {/* History / Favorites */}
        {(history.length > 0 || favorites.length > 0) && (
          <div>
            <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 4 }}>
              {[{ key: 'historial', label: 'Historial', Icon: Clock, count: history.length }, { key: 'favoritos', label: 'Favoritos', Icon: Star, count: favorites.length }].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as 'historial' | 'favoritos')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, borderRadius: 7, border: 'none', background: activeTab === tab.key ? 'rgba(255,255,255,0.07)' : 'transparent', color: activeTab === tab.key ? '#e8e4dc' : 'rgba(255,255,255,0.3)', fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms' }}>
                  <tab.Icon size={12} />{tab.label}
                  <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>{tab.count}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeTab === 'historial'
                ? history.map(item => renderListItem(item, 'history'))
                : favorites.length === 0
                  ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '24px 0' }}>Aún no tienes favoritos. Pulsa ⭐ en cualquier post.</p>
                  : favorites.map(item => renderListItem(item, 'favorites'))
              }
            </div>
          </div>
        )}
      </main>

      <footer style={{ position: 'relative', zIndex: 10, textAlign: 'center', paddingBottom: 40, fontSize: 12, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>
        © 2026 PostMagic — Powered by GPT-4o mini
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        textarea::placeholder, input::placeholder { color: rgba(255,255,255,0.18); }
        select option { background: #1a1a1b; color: #e8e4dc; }
      `}</style>
    </div>
  );
}