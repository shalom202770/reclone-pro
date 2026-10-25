import React, { useEffect, useRef } from 'react';
import { Cloud, Zap, Palette, Server, ArrowRight, ArrowLeft, Plus } from 'lucide-react';
import { useTranslation } from '../i18n/context';

interface WelcomeModalProps {
  onDismiss: () => void;
  onConnectRemote?: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onDismiss, onConnectRemote }) => {
  const { t, isRtl, dir } = useTranslation();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDismiss]);

  const features = [
    {
      icon: <Zap size={20} className="text-amber-400" />,
      title: t('welcome.feat1Title', 'סנכרון ענן מהיר'),
      desc: t('welcome.feat1Desc', '8 העברות מקבילות, 16 בודקים, חיבור מיידי'),
    },
    {
      icon: <Palette size={20} className="text-amber-400" />,
      title: t('welcome.feat2Title', 'עיצוב מותאם אישית'),
      desc: t('welcome.feat2Desc', 'ערכות Warm, Light, Dark ו-macOS מקוריות'),
    },
    {
      icon: <Server size={20} className="text-amber-400" />,
      title: t('welcome.feat3Title', 'ניהול ריפוטים מתקדם'),
      desc: t('welcome.feat3Desc', 'Google Drive, S3, Dropbox, OneDrive ועוד 50+'),
    },
  ];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center select-none"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(18px)' }}
      dir={dir}
    >
      <div
        className="relative flex flex-col items-center rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        style={{
          width: 480,
          maxWidth: '92vw',
          background: 'linear-gradient(160deg, #1e1813 0%, #14110f 100%)',
          border: '1px solid rgba(217,119,6,0.25)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(217,119,6,0.12)',
        }}
      >
        {/* Top glow accent */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-1 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, #d97706, transparent)' }}
        />

        {/* Header */}
        <div className="flex flex-col items-center pt-10 pb-5 px-8 w-full">
          <div
            className="flex items-center justify-center rounded-2xl mb-5"
            style={{
              width: 80,
              height: 80,
              background: 'linear-gradient(135deg, #e8541a 0%, #c2410c 100%)',
              boxShadow: '0 8px 32px rgba(232,84,26,0.45)',
            }}
          >
            <Cloud size={42} strokeWidth={2} className="text-white" />
          </div>

          <h1
            className="text-2xl font-bold tracking-tight mb-1 text-center"
            style={{ color: '#f5ede6' }}
          >
            {t('welcome.title', 'ברוכים הבאים ל-Reclone Pro')}
          </h1>
          <p className="text-sm text-center" style={{ color: '#9a847a' }}>
            {t('welcome.subtitle', 'מנהל קבצים ענן מתקדם — מהיר, חזק ויפה')}
          </p>
        </div>

        <div className="w-full h-px" style={{ background: 'rgba(217,119,6,0.15)' }} />

        {/* Features */}
        <div className="flex flex-col gap-2.5 w-full px-8 py-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl p-3"
              style={{
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="flex items-center justify-center rounded-lg flex-shrink-0"
                style={{ width: 38, height: 38, background: 'rgba(217,119,6,0.15)' }}
              >
                {f.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold" style={{ color: '#f0e4db' }}>{f.title}</span>
                <span className="text-xs mt-0.5" style={{ color: '#7a6860' }}>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="w-full px-8 pb-7 flex flex-col gap-2.5">
          <button
            onClick={onDismiss}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-base transition-all duration-200 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #e8541a 0%, #c2410c 100%)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(232,84,26,0.4)',
              border: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            <span>{t('welcome.startNow', 'התחל עכשיו')}</span>
            {isRtl ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
          </button>

          {onConnectRemote && (
            <button
              onClick={() => { onDismiss(); onConnectRemote(); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 font-medium text-sm transition-all duration-200 cursor-pointer"
              style={{
                background: 'rgba(217,119,6,0.12)',
                color: '#d97706',
                border: '1px solid rgba(217,119,6,0.2)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,119,6,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(217,119,6,0.12)')}
            >
              <Plus size={16} />
              <span>{t('welcome.connectFirst', 'חבר כונן ענן ראשון')}</span>
            </button>
          )}

          <p className="text-center text-xs mt-1" style={{ color: '#4a3e38' }}>
            {t('welcome.footer', 'Reclone Pro v1.0 • powered by rclone')}
          </p>
        </div>
      </div>
    </div>
  );
};
