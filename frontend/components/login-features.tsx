"use client"

import { useState, useEffect, useCallback } from "react"

const features = [
    {
        id: 1,
        title: "Seguimiento de Pacientes",
        description: "Monitoriza el progreso de tus pacientes de manera continua y visual a través de gráficos interactivos.",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
        Graphic: () => (
            <svg viewBox="0 0 220 160" className="w-full h-full">
                <defs>
                    <linearGradient id="grad-track" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#14B8A6" />
                        <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                    <linearGradient id="area-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
                    </linearGradient>
                    <filter id="line-glow1">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Grid lines */}
                {[40, 65, 90, 115, 140].map(y => (
                    <line key={y} x1="30" y1={y} x2="195" y2={y} stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="4 3" />
                ))}

                {/* Area fill */}
                <path
                    d="M 30 135 L 70 100 L 110 115 L 150 70 L 190 45 L 190 140 L 30 140 Z"
                    fill="url(#area-fill)"
                    style={{ animation: "fadeIn 1s ease-out 0.5s forwards", opacity: 0 }}
                />

                {/* Line */}
                <path
                    d="M 30 135 L 70 100 L 110 115 L 150 70 L 190 45"
                    stroke="url(#grad-track)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    filter="url(#line-glow1)"
                    strokeDasharray="100"
                    strokeDashoffset="100"
                    pathLength="100"
                    style={{ animation: "drawPath 1.8s ease-out forwards" }}
                />

                {/* Data dots */}
                {[
                    { cx: 30, cy: 135, delay: "0.2s" },
                    { cx: 70, cy: 100, delay: "0.6s" },
                    { cx: 110, cy: 115, delay: "1.0s" },
                    { cx: 150, cy: 70, delay: "1.4s" },
                    { cx: 190, cy: 45, delay: "1.7s" },
                ].map((dot, i) => (
                    <g key={i}>
                        <circle cx={dot.cx} cy={dot.cy} r="9" fill="#14B8A6" opacity="0.1"
                            style={{ animation: `fadeIn 0.4s ease-out ${dot.delay} forwards`, opacity: 0 }} />
                        <circle cx={dot.cx} cy={dot.cy} r="4.5" fill="#FFFFFF" stroke="#14B8A6" strokeWidth="2"
                            style={{ animation: `fadeIn 0.4s ease-out ${dot.delay} forwards`, opacity: 0 }} />
                    </g>
                ))}
            </svg>
        )
    },
    {
        id: 2,
        title: "EMAs Programables",
        description: "Crea y programa evaluaciones momentáneas ecológicas personalizadas según las necesidades del paciente.",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
                <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />
                <path d="M8 18h.01" /><path d="M12 18h.01" />
            </svg>
        ),
        Graphic: () => (
            <svg viewBox="0 0 220 160" className="w-full h-full">
                <defs>
                    <linearGradient id="phone-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#818CF8" />
                    </linearGradient>
                </defs>

                {/* Phone body */}
                <rect x="65" y="8" width="90" height="145" rx="16" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
                {/* Notch */}
                <rect x="95" y="12" width="30" height="4" rx="2" fill="#CBD5E1" />

                {/* Status bar dots */}
                <circle cx="78" cy="26" r="2" fill="#CBD5E1" />
                <circle cx="84" cy="26" r="2" fill="#CBD5E1" />
                <circle cx="90" cy="26" r="2" fill="#CBD5E1" />

                {/* Notification card sliding in */}
                <g style={{ animation: "slideDown 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s forwards", opacity: 0 }}>
                    <rect x="73" y="34" width="74" height="32" rx="8" fill="url(#phone-grad)" />
                    <rect x="81" y="42" width="40" height="3.5" rx="1.75" fill="#FFFFFF" opacity="0.9" />
                    <rect x="81" y="49" width="24" height="3" rx="1.5" fill="#FFFFFF" opacity="0.5" />
                    <circle cx="136" cy="47" r="6" fill="#FFFFFF" opacity="0.2" />
                    <text x="136" y="50" textAnchor="middle" fontSize="8" fill="#FFFFFF">🔔</text>
                </g>

                {/* Checklist items */}
                {[
                    { y: 78, w: 44, delay: "0.8s" },
                    { y: 96, w: 36, delay: "1.0s" },
                    { y: 114, w: 50, delay: "1.2s" },
                ].map((item, i) => (
                    <g key={i} style={{ animation: `fadeIn 0.4s ease-out ${item.delay} forwards`, opacity: 0 }}>
                        <rect x="78" y={item.y} width="11" height="11" rx="3" fill="none" stroke="#14B8A6" strokeWidth="1.5" />
                        {i < 2 && <path d={`M ${80} ${item.y + 6} l 2.5 3 l 4.5 -5.5`} stroke="#14B8A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
                        <rect x="95" y={item.y + 3} width={item.w} height="3.5" rx="1.75" fill="#E2E8F0" />
                    </g>
                ))}

                {/* Clock overlay */}
                <g style={{ animation: "popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.4s forwards", transformOrigin: "170px 40px", opacity: 0, transform: "scale(0)" }}>
                    <circle cx="170" cy="40" r="24" fill="white" stroke="#14B8A6" strokeWidth="2" filter="drop-shadow(0 2px 8px rgba(20,184,166,0.2))" />
                    <circle cx="170" cy="40" r="2.5" fill="#14B8A6" />
                    <line x1="170" y1="40" x2="170" y2="24" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round"
                        style={{ transformOrigin: "170px 40px", animation: "spin 4s linear infinite" }} />
                    <line x1="170" y1="40" x2="182" y2="40" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" opacity="0.6"
                        style={{ transformOrigin: "170px 40px", animation: "spin 16s linear infinite" }} />
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                        <line key={angle} x1="170" y1="19" x2="170" y2={angle % 90 === 0 ? "22" : "20.5"}
                            stroke="#14B8A6" strokeWidth={angle % 90 === 0 ? "1.5" : "0.7"} strokeLinecap="round"
                            transform={`rotate(${angle} 170 40)`} />
                    ))}
                </g>
            </svg>
        )
    },
    {
        id: 3,
        title: "Recomendaciones de IA",
        description: "Obtén sugerencias inteligentes y análisis de sentimiento automáticos en el chat con tus pacientes.",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M8 10h.01" /><path d="M12 10h.01" /><path d="M16 10h.01" />
            </svg>
        ),
        Graphic: () => (
            <svg viewBox="-5 -15 230 185" className="w-full h-full">
                <defs>
                    <linearGradient id="sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FDE047" />
                        <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                    <linearGradient id="ai-bubble-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#14B8A6" />
                        <stop offset="100%" stopColor="#0D9488" />
                    </linearGradient>
                    <filter id="sparkle-glow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="bubble-shadow">
                        <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.06" />
                    </filter>
                </defs>

                {/* User avatar */}
                <g style={{ animation: "fadeIn 0.4s ease-out forwards", opacity: 0 }}>
                    <circle cx="20" cy="30" r="11" fill="#E2E8F0" />
                    <circle cx="20" cy="26" r="3.5" fill="#94A3B8" />
                    <path d="M 13 37 Q 20 32 27 37" fill="#94A3B8" />
                </g>

                {/* User bubble */}
                <g style={{ animation: "bubbleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards", transformOrigin: "35px 30px", opacity: 0 }} filter="url(#bubble-shadow)">
                    <rect x="35" y="10" width="115" height="42" rx="12" fill="#F1F5F9" />
                    <polygon points="37,44 34,54 52,44" fill="#F1F5F9" />
                    <rect x="48" y="20" width="85" height="4" rx="2" fill="#94A3B8" style={{ animation: "fadeIn 0.3s ease-out 0.6s forwards", opacity: 0 }} />
                    <rect x="48" y="29" width="60" height="4" rx="2" fill="#CBD5E1" style={{ animation: "fadeIn 0.3s ease-out 0.7s forwards", opacity: 0 }} />
                    <rect x="48" y="38" width="38" height="4" rx="2" fill="#CBD5E1" style={{ animation: "fadeIn 0.3s ease-out 0.75s forwards", opacity: 0 }} />
                </g>




                {/* AI answer bubble */}
                <g style={{ animation: "bubbleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.5s forwards", transformOrigin: "185px 105px", opacity: 0 }} filter="url(#bubble-shadow)">
                    <rect x="55" y="80" width="140" height="52" rx="12" fill="url(#ai-bubble-grad)" />
                    <polygon points="188,132 195,142 175,132" fill="#0D9488" />
                    {/* Accent line */}
                    <rect x="68" y="88" width="3" height="36" rx="1.5" fill="#FFFFFF" opacity="0.35" />
                    <rect x="78" y="91" width="100" height="4" rx="2" fill="#FFFFFF" opacity="0.9" style={{ animation: "fadeIn 0.3s ease-out 1.9s forwards", opacity: 0 }} />
                    <rect x="78" y="101" width="76" height="4" rx="2" fill="#FFFFFF" opacity="0.7" style={{ animation: "fadeIn 0.3s ease-out 2.0s forwards", opacity: 0 }} />
                    <rect x="78" y="111" width="52" height="4" rx="2" fill="#FFFFFF" opacity="0.5" style={{ animation: "fadeIn 0.3s ease-out 2.1s forwards", opacity: 0 }} />
                </g>

                {/* AI avatar */}
                <g style={{ animation: "popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 1.5s forwards", transformOrigin: "205px 100px", opacity: 0, transform: "scale(0)" }}>
                    <circle cx="205" cy="100" r="11" fill="#14B8A6" filter="drop-shadow(0 1px 3px rgba(20,184,166,0.3))" />
                    <text x="205" y="104" textAnchor="middle" fontSize="10" fill="#FFFFFF" fontFamily="system-ui" fontWeight="bold">AI</text>
                </g>




                {/* Sentiment indicator */}
                <g style={{ animation: "popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 2.3s forwards", transformOrigin: "30px 150px", opacity: 0, transform: "scale(0)" }}>
                    <rect x="8" y="140" width="50" height="22" rx="11" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.06))" />
                    <text x="25" y="155" textAnchor="middle" fontSize="11">😊</text>
                    <rect x="36" y="148" width="16" height="4.5" rx="2.25" fill="#22C55E" opacity="0.6" />
                </g>
            </svg>
        )
    }
]

export function LoginFeatures() {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [progress, setProgress] = useState(0)

    const SLIDE_DURATION = 5000

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % features.length)
        setProgress(0)
    }, [])

    useEffect(() => {
        const timer = setInterval(nextSlide, SLIDE_DURATION)
        return () => clearInterval(timer)
    }, [nextSlide])

    // Progress bar animation
    useEffect(() => {
        setProgress(0)
        const startTime = Date.now()
        let animFrame: number

        const tick = () => {
            const elapsed = Date.now() - startTime
            const pct = Math.min(elapsed / SLIDE_DURATION, 1)
            setProgress(pct)
            if (pct < 1) animFrame = requestAnimationFrame(tick)
        }
        animFrame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(animFrame)
    }, [currentIndex])

    const goTo = (idx: number) => {
        setCurrentIndex(idx)
        setProgress(0)
    }

    return (
        <div className="hidden lg:flex flex-col w-1/2 bg-white rounded-2xl border border-soft-gray shadow-soft overflow-hidden relative h-[500px] justify-center">

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes drawPath {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
        @keyframes slideDown {
          0% { transform: translateY(-30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bubbleIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sparkleTwinkle {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes typingDot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}} />

            {/* Content area */}
            <div className="flex-1 relative w-full flex flex-col items-center justify-center px-4 py-4">
                {features.map((feature, index) => (
                    <div
                        key={feature.id}
                        className={`absolute inset-0 flex flex-col items-center justify-center px-4 transition-all duration-700 ease-in-out ${index === currentIndex ? "opacity-100 translate-y-0 z-10" : "opacity-0 translate-y-3 z-0"}`}
                        style={{ pointerEvents: index === currentIndex ? 'auto' : 'none' }}
                    >
                        {/* Graphic area — matching the app's muted bg */}
                        <div className="w-full max-w-[380px] h-[240px] mb-1 flex items-center justify-center">
                            <div className="w-full h-full">
                                {index === currentIndex && <feature.Graphic />}
                            </div>
                        </div>

                        {/* Feature text block */}
                        <div className="flex flex-col items-center text-center">
                            {/* Icon + Title row */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-calm-teal/10 text-calm-teal shrink-0">
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-neutral-charcoal tracking-tight leading-tight">
                                    {feature.title}
                                </h3>
                            </div>

                            {/* Divider */}
                            <div className="w-8 h-[2px] rounded-full bg-calm-teal/30 mb-3" />

                            {/* Description */}
                            <p className="text-muted-foreground text-sm leading-relaxed max-w-[320px]">
                                {feature.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation dots with progress */}
            <div className="flex justify-center items-center gap-2.5 pb-8 z-10">
                {features.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goTo(index)}
                        className={`relative rounded-full overflow-hidden transition-all duration-500 focus:outline-none ${index === currentIndex ? "w-10 h-1.5" : "w-2 h-1.5"}`}
                        style={{
                            backgroundColor: index === currentIndex ? "rgba(20,184,166,0.15)" : "rgba(20,184,166,0.2)",
                        }}
                        aria-label={`Go to slide ${index + 1}`}
                    >
                        {index === currentIndex && (
                            <span
                                className="absolute inset-y-0 left-0 rounded-full bg-calm-teal"
                                style={{
                                    width: `${progress * 100}%`,
                                    transition: "width 80ms linear",
                                }}
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}
