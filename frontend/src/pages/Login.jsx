import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { AnimatedInput } from '../components/ui';

import universityBuilding from '../assets/images/university-building.jpg';
import plmunLogo from '../assets/images/logo.png';

const MAX_ATTEMPTS = 5;
// Escalating lockout durations (ms): 30s → 1m → 5m → 30m → 1hr
const LOCKOUT_TIERS = [30_000, 60_000, 300_000, 1_800_000, 3_600_000];
const SESSION_KEY = 'plmun_login_guard';

// ── Persist lockout across StrictMode remounts via sessionStorage ──
const readGuard = () => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}'); }
    catch { return {}; }
};
const writeGuard = (obj) => sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj));
const clearGuard = () => sessionStorage.removeItem(SESSION_KEY);


// ── Login page ──────────────────────────────────────────────────
const Login = () => {
    const navigate = useNavigate();
    const { login, isLoading } = useAuthStore();

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // ── Lockout state lives in sessionStorage → survives StrictMode remounts ──
    const [attempts, setAttempts] = useState(() => readGuard().attempts || 0);
    const [lockedUntil, setLockedUntil] = useState(() => readGuard().lockedUntil || null);
    const [offenses, setOffenses] = useState(() => readGuard().offenses || 0);
    const [countdown, setCountdown] = useState(0);

    const timerRef = useRef(null);

    // Stay in sync with sessionStorage
    useEffect(() => {
        writeGuard({ attempts, lockedUntil, offenses });
    }, [attempts, lockedUntil, offenses]);

    // Countdown tick
    useEffect(() => {
        if (!lockedUntil) { setCountdown(0); return; }
        const tick = () => {
            const left = Math.ceil((lockedUntil - Date.now()) / 1000);
            if (left <= 0) {
                setLockedUntil(null);
                setAttempts(0);
                setCountdown(0);
                // Keep offenses in sessionStorage so next lockout escalates
                writeGuard({ attempts: 0, lockedUntil: null, offenses });
            } else {
                setCountdown(left);
            }
        };
        tick();
        timerRef.current = setInterval(tick, 500);
        return () => clearInterval(timerRef.current);
    }, [lockedUntil]);

    const isLocked = Boolean(lockedUntil && Date.now() < lockedUntil);
    const attemptsLeft = MAX_ATTEMPTS - attempts;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLocked) return;

        setErrorMsg('');
        const result = await login({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
        });

        if (result.success) {
            clearGuard();
            navigate('/dashboard');
        } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);

            if (newAttempts >= MAX_ATTEMPTS) {
                // Escalate: each lockout offense uses a longer duration
                const newOffenses = offenses + 1;
                const durationMs = LOCKOUT_TIERS[Math.min(newOffenses - 1, LOCKOUT_TIERS.length - 1)];
                const until = Date.now() + durationMs;
                setOffenses(newOffenses);
                setLockedUntil(until);
                writeGuard({ attempts: newAttempts, lockedUntil: until, offenses: newOffenses });
                setErrorMsg('');
            } else {
                setErrorMsg(result.error || 'Invalid email or password. Please try again.');
            }
        }
    };

    return (
        <div className="min-h-screen flex overflow-hidden">

            {/* ── LEFT PANEL ──────────────────────────────── */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center scale-105 hover:scale-100 transition-transform duration-[20s]"
                    style={{ backgroundImage: `url(${universityBuilding})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-accent/30 to-gray-900/75" />

                {/* Floating orbs */}
                <div className="absolute top-24 left-16 w-48 h-48 bg-accent/15 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-32 right-16 w-64 h-64 bg-accent-light/10 rounded-full blur-3xl animate-float-reverse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-float-slow" />

                {/* Grid */}
                <div className="absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

                {/* Branding — uses CSS animation not React state, so StrictMode remounts are invisible */}
                <div className="relative z-10 flex flex-col justify-between p-12 w-full animate-panel-slide-in">
                    <div className="flex items-center gap-4 animate-fade-in-up animate-fill-both animate-delay-100">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center p-1.5 ring-2 ring-white/40 hover:scale-110 transition-transform duration-300">
                            <img src={plmunLogo} alt="PLMun Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm leading-tight">PLMun Inventory Nexus</p>
                            <p className="text-white/60 text-xs">Pamantasan ng Lungsod ng Muntinlupa</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h1 className="text-5xl font-black text-white leading-tight animate-fade-in-up animate-fill-both animate-delay-200">
                            Smarter<br />
                            <span className="text-accent-light">Inventory</span><br />
                            Management.
                        </h1>
                        <p className="text-white/70 text-lg leading-relaxed max-w-sm animate-fade-in-up animate-fill-both animate-delay-300">
                            Track. Manage. Optimize. Your all-in-one platform for PLMun's equipment and resource control.
                        </p>
                        <div className="flex gap-3 flex-wrap animate-fade-in-up animate-fill-both animate-delay-400">
                            {['JWT Secured', 'Role-Based Access', 'Audit Logs'].map((badge) => (
                                <span key={badge} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-xs font-medium border border-white/20 hover:bg-white/20 transition-all duration-200 hover:scale-105 cursor-default">
                                    <Shield size={11} />{badge}
                                </span>
                            ))}
                        </div>
                    </div>

                    <p className="text-white/40 text-xs animate-fade-in animate-fill-both animate-delay-500">
                        © 2025 Pamantasan ng Lungsod ng Muntinlupa · "Lakas, Talino, at Buhay"
                    </p>
                </div>
            </div>

            {/* ── RIGHT PANEL — form ──────────────────────── */}
            <div className="flex-1 flex items-center justify-center relative bg-gray-50 dark:bg-gray-900 px-6 py-12">
                <div className="absolute inset-0 bg-cover bg-center lg:hidden" style={{ backgroundImage: `url(${universityBuilding})` }} />
                <div className="absolute inset-0 bg-gray-900/80 lg:hidden" />

                <div className="relative z-10 w-full max-w-md animate-card-slide-in">
                    {/* Mobile logo */}
                    <div className="flex justify-center mb-8 lg:hidden">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center p-2 animate-logo-pop">
                            <img src={plmunLogo} alt="PLMun" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    {/* Card — plain white, no entrance animation so remounts don't flash */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">

                        <div className="mb-7">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Welcome back</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sign in to your PLMun Nexus account</p>
                        </div>

                        {/* ── LOCKOUT BANNER ── */}
                        {isLocked && (
                            <div className="mb-5 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3 animate-slide-in">
                                <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">Account temporarily locked</p>
                                    <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                                        Too many failed attempts. Try again in{' '}
                                        <span className="font-black tabular-nums text-sm">{countdown}s</span>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ── ATTEMPTS WARNING ── */}
                        {!isLocked && attempts >= 3 && attempts < MAX_ATTEMPTS && (() => {
                            const nextTierMs = LOCKOUT_TIERS[Math.min(offenses, LOCKOUT_TIERS.length - 1)];
                            const nextTierLabel = nextTierMs >= 3_600_000 ? `${nextTierMs / 3_600_000}-hour`
                                : nextTierMs >= 60_000 ? `${nextTierMs / 60_000}-minute`
                                    : `${nextTierMs / 1_000}-second`;
                            return (
                                <div className="mb-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 flex items-center gap-2 animate-slide-in">
                                    <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                        {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining before {nextTierLabel} lockout
                                    </p>
                                </div>
                            );
                        })()}

                        {/* ── ERROR BANNER — local state, renders independently of store ── */}
                        {errorMsg && !isLocked && (
                            <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-slide-in">
                                <p className="text-sm font-medium text-red-700 dark:text-red-300 flex items-start gap-2">
                                    <span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                                    {errorMsg}
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-0.5">Email Address</label>
                                <AnimatedInput
                                    icon={Mail} type="email" placeholder="your@plmun.edu.ph"
                                    value={formData.email} disabled={isLocked}
                                    onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-0.5">Password</label>
                                <AnimatedInput
                                    icon={Lock} type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                                    value={formData.password} disabled={isLocked}
                                    onChange={(e) => setFormData(f => ({ ...f, password: e.target.value }))}
                                    rightSlot={
                                        <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    }
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading || isLocked}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-lg shadow-sm hover:bg-accent-dark hover:shadow-md transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed text-sm group"
                                >
                                    {isLoading ? (
                                        <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Signing in...</>
                                    ) : isLocked ? (
                                        `Locked — wait ${countdown}s`
                                    ) : (
                                        <>Sign In <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" /></>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Don't have an account?{' '}
                                <Link to="/register" className="text-accent font-semibold hover:underline underline-offset-2 hover:text-accent-dark transition-colors">
                                    Create one now
                                </Link>
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-center gap-2 text-gray-400 text-xs">
                        <Shield size={13} />
                        <span>JWT-secured · Role-based access control · Audit logging</span>
                    </div>
                    <p className="text-center text-gray-400 text-xs mt-2">
                        © 2025 Pamantasan ng Lungsod ng Muntinlupa · All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
