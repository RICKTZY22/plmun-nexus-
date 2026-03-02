import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Mail, Lock, ArrowRight, Shield, Eye, EyeOff, AlertTriangle,
    ChevronDown, Package, ClipboardList, BarChart3, Users,
    GraduationCap, Building2, Heart, Code2, Target, Lightbulb,
    Award, BookOpen, MapPin, Phone, AtSign, ExternalLink,
    Facebook, Youtube, Linkedin, Twitter
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { AnimatedInput } from '../components/ui';

import universityBuilding from '../assets/images/university-building.jpg';
import plmunLogo from '../assets/images/logo.png';

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIERS = [30_000, 60_000, 300_000, 1_800_000, 3_600_000];
const SESSION_KEY = 'plmun_login_guard';

const readGuard = () => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}'); }
    catch { return {}; }
};
const writeGuard = (obj) => sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj));
const clearGuard = () => sessionStorage.removeItem(SESSION_KEY);

/* ─── Feature cards for "About the Inventory" ─── */
const FEATURES = [
    {
        icon: Package,
        title: 'Real-Time Tracking',
        desc: 'Monitor equipment availability, borrowing status, and item conditions in real time across all departments.',
    },
    {
        icon: ClipboardList,
        title: 'Request Management',
        desc: 'Streamlined borrow/return workflow with approval chains, automated overdue detection, and audit trails.',
    },
    {
        icon: BarChart3,
        title: 'Analytics & Reports',
        desc: 'Comprehensive dashboards with usage trends, department-level breakdowns, and exportable reports.',
    },
    {
        icon: Users,
        title: 'Role-Based Access',
        desc: 'Granular permissions for Students, Faculty, Staff, and Admins — everyone sees only what they need.',
    },
];

/* ─── Team / Creators ─── */
const CREATORS = [
    { name: 'Erick', role: 'Lead Developer', avatar: '👨‍💻' },
    { name: 'Member 2', role: 'Backend Developer', avatar: '🧑‍💻' },
    { name: 'Member 3', role: 'Frontend Developer', avatar: '👩‍💻' },
    { name: 'Member 4', role: 'UI/UX Designer', avatar: '🎨' },
    { name: 'Member 5', role: 'QA & Documentation', avatar: '📝' },
];

/* ─── Accreditation data ─── */
const ACCREDITATIONS = [
    {
        title: 'Commission on Higher Education (CHED)',
        desc: 'PLMun programs are duly recognized by Commission on Higher Education (CHED).',
        color: 'blue',
    },
    {
        title: 'Unified Financial Assistance (UniFAST)',
        desc: 'As recipient of the Free Higher Tertiary Education Program through UniFAST, PLMun students enjoy free tuition fee and other miscellaneous fees.',
        color: 'green',
    },
    {
        title: 'Association of Local Colleges & Universities (ALCUCOA)',
        desc: 'PLMun programs are duly recognized by the Association of Local Colleges and Universities (ALCUCOA).',
        color: 'red',
    },
];


// login page
const Login = () => {
    const navigate = useNavigate();
    const { login, isLoading } = useAuthStore();

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [attempts, setAttempts] = useState(() => readGuard().attempts || 0);
    const [lockedUntil, setLockedUntil] = useState(() => readGuard().lockedUntil || null);
    const [offenses, setOffenses] = useState(() => readGuard().offenses || 0);
    const [countdown, setCountdown] = useState(0);

    const [deactivatedNotice, setDeactivatedNotice] = useState(() => {
        const flag = localStorage.getItem('plmun-deactivated');
        if (flag) {
            localStorage.removeItem('plmun-deactivated');
            return true;
        }
        return false;
    });

    useEffect(() => {
        if (!deactivatedNotice) return;
        const t = setTimeout(() => setDeactivatedNotice(false), 15_000);
        return () => clearTimeout(t);
    }, [deactivatedNotice]);

    const timerRef = useRef(null);

    useEffect(() => {
        writeGuard({ attempts, lockedUntil, offenses });
    }, [attempts, lockedUntil, offenses]);

    useEffect(() => {
        if (!lockedUntil) { setCountdown(0); return; }
        const tick = () => {
            const left = Math.ceil((lockedUntil - Date.now()) / 1000);
            if (left <= 0) {
                setLockedUntil(null);
                setAttempts(0);
                setCountdown(0);
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

    /* ── Scroll-reveal observer ── */
    const sectionRefs = useRef([]);
    const [visibleSections, setVisibleSections] = useState(new Set());

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setVisibleSections((prev) => new Set([...prev, entry.target.dataset.section]));
                    }
                });
            },
            { threshold: 0.12 }
        );
        sectionRefs.current.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const addSectionRef = (idx) => (el) => { sectionRefs.current[idx] = el; };

    return (
        <div className="min-h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900 scroll-smooth">

            {/* ═══════════ SECTION 1: HERO — Login ═══════════ */}
            <section className="min-h-screen flex relative">

                {/* ── LEFT PANEL ── */}
                <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
                    <div
                        className="absolute inset-0 bg-cover bg-center scale-105 hover:scale-100 transition-transform duration-[20s]"
                        style={{ backgroundImage: `url(${universityBuilding})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-accent/30 to-gray-900/75" />

                    <div className="absolute top-24 left-16 w-48 h-48 bg-accent/15 rounded-full blur-3xl animate-float" />
                    <div className="absolute bottom-32 right-16 w-64 h-64 bg-accent-light/10 rounded-full blur-3xl animate-float-reverse" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-float-slow" />

                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

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

                {/* ── RIGHT PANEL — form ── */}
                <div className="flex-1 flex items-center justify-center relative bg-gray-50 dark:bg-gray-900 px-6 py-12">
                    <div className="absolute inset-0 bg-cover bg-center lg:hidden" style={{ backgroundImage: `url(${universityBuilding})` }} />
                    <div className="absolute inset-0 bg-gray-900/80 lg:hidden" />

                    <div className="relative z-10 w-full max-w-md animate-card-slide-in">
                        <div className="flex justify-center mb-8 lg:hidden">
                            <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center p-2 animate-logo-pop">
                                <img src={plmunLogo} alt="PLMun" className="w-full h-full object-contain" />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                            <div className="mb-7">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Welcome back</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sign in to your PLMun Nexus account</p>
                            </div>

                            {deactivatedNotice && (
                                <div className="mb-5 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3 animate-slide-in">
                                    <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Account Deactivated</p>
                                        <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                                            Your account has been deactivated by an administrator. Please contact a Staff member or Admin for assistance.
                                        </p>
                                    </div>
                                    <button onClick={() => setDeactivatedNotice(false)} className="ml-auto text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
                                </div>
                            )}

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
                    </div>
                </div>

                {/* Scroll indicator */}
                <button
                    onClick={() => document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-white/60 hover:text-white/90 transition-colors cursor-pointer group"
                    aria-label="Scroll down for more info"
                >
                    <span className="text-xs font-medium tracking-wider uppercase hidden lg:block">Learn More</span>
                    <ChevronDown size={22} className="animate-bounce" />
                </button>
            </section>


            {/* ═══════════ SECTION 2: ABOUT THE INVENTORY ═══════════ */}
            <section
                id="about-section"
                ref={addSectionRef(0)}
                data-section="about"
                className={`py-20 md:py-28 px-6 bg-white dark:bg-gray-800 transition-all duration-700 ${visibleSections.has('about') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-widest mb-4">
                            About the System
                        </span>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
                            PLMun Inventory <span className="text-accent">Nexus</span>
                        </h2>
                        <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                            A modern, web-based inventory management system built specifically for
                            Pamantasan ng Lungsod ng Muntinlupa. Designed to streamline equipment tracking,
                            borrowing workflows, and resource management across all university departments.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {FEATURES.map((f, i) => (
                            <div
                                key={f.title}
                                className="group p-6 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 hover:border-accent/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                                style={{ transitionDelay: `${i * 80}ms` }}
                            >
                                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                                    <f.icon size={22} className="text-accent" />
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { label: 'User Roles', value: '4', sub: 'Student · Faculty · Staff · Admin' },
                            { label: 'Security', value: 'JWT', sub: 'Token-based authentication' },
                            { label: 'Frameworks', value: '2', sub: 'React + Django REST' },
                            { label: 'Database', value: 'PostgreSQL', sub: 'Production-grade RDBMS' },
                        ].map((s) => (
                            <div key={s.label} className="text-center p-5 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-600">
                                <p className="text-2xl font-black text-accent">{s.value}</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{s.label}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════ SECTION 3: EDUCATIONAL PHILOSOPHY ═══════════ */}
            <section
                ref={addSectionRef(1)}
                data-section="philosophy"
                className={`relative py-20 md:py-28 px-6 overflow-hidden transition-all duration-700 ${visibleSections.has('philosophy') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ background: 'linear-gradient(135deg, #d4a017 0%, #c8960f 35%, #b8860b 65%, #a67c00 100%)' }}
            >
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-[0.06]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

                <div className="relative max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-widest mb-4 border border-white/30">
                            <BookOpen size={14} />
                            Educational Philosophy
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white">
                            Mission · Vision · Values
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Mission */}
                        <div className="group bg-white/15 backdrop-blur-md rounded-2xl p-7 border border-white/25 hover:bg-white/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Target size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-3">Mission</h3>
                            <p className="text-white/85 text-sm leading-relaxed">
                                To provide quality, affordable and relevant education responsive to the changing needs of
                                the local and global communities through effective and efficient integration of instruction,
                                research and extension; to develop productive and God-loving individuals in society.
                            </p>
                        </div>

                        {/* Vision */}
                        <div className="group bg-white/15 backdrop-blur-md rounded-2xl p-7 border border-white/25 hover:bg-white/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Lightbulb size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-3">Vision</h3>
                            <p className="text-white/85 text-sm leading-relaxed">
                                A dynamic and highly competitive Higher Education Institution (HEI) committed to people
                                empowerment towards building a humane society.
                            </p>
                        </div>

                        {/* Quality Policy */}
                        <div className="group bg-white/15 backdrop-blur-md rounded-2xl p-7 border border-white/25 hover:bg-white/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Award size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-3">Quality Policy</h3>
                            <p className="text-white/85 text-sm leading-relaxed">
                                "We, in the Pamantasan ng Lungsod ng Muntinlupa, commit to meet and even exceed our clients'
                                needs and expectations by adhering to good governance, productivity and continually improving
                                the effectiveness of our Quality Management System in compliance to ethical standards and
                                applicable statutory and regulatory requirements."
                            </p>
                        </div>
                    </div>

                    {/* Motto */}
                    <div className="mt-10 text-center">
                        <p className="text-white/60 text-xs uppercase tracking-widest mb-2">University Motto</p>
                        <p className="text-2xl font-black text-white italic">"Lakas, Talino, at Buhay"</p>
                        <p className="text-white/70 text-sm mt-1">Strength, Wisdom, and Life</p>
                    </div>
                </div>
            </section>


            {/* ═══════════ SECTION 4: ABOUT PLMUN + ACCREDITATION ═══════════ */}
            <section
                ref={addSectionRef(2)}
                data-section="school"
                className={`py-20 md:py-28 px-6 bg-gray-50 dark:bg-gray-900 transition-all duration-700 ${visibleSections.has('school') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">

                        {/* Image + overlay */}
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
                            <img
                                src={universityBuilding}
                                alt="PLMun Campus"
                                className="w-full h-[360px] object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg">
                                        <img src={plmunLogo} alt="PLMun" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">Pamantasan ng Lungsod ng Muntinlupa</p>
                                        <p className="text-white/60 text-xs">Public university · Muntinlupa City</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="space-y-6">
                            <div>
                                <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-widest mb-4">
                                    Our University
                                </span>
                                <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight">
                                    Pamantasan ng Lungsod ng <span className="text-accent">Muntinlupa</span>
                                </h2>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                                PLMun is a public university in Muntinlupa City, Philippines, committed to providing
                                quality and accessible education. The university empowers students with knowledge and skills
                                to contribute meaningfully to the community through effective integration of instruction,
                                research, and extension.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { icon: GraduationCap, label: 'Quality Education', desc: 'CHED-recognized programs' },
                                    { icon: Building2, label: 'Modern Facilities', desc: 'Updated campus resources' },
                                    { icon: Heart, label: 'Free Tuition', desc: 'UniFAST recipient' },
                                    { icon: Users, label: 'Community-Centered', desc: 'Service & outreach' },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                            <item.icon size={17} className="text-accent" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{item.label}</p>
                                            <p className="text-xs text-gray-400">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Accreditation ── */}
                    <div className="mt-16">
                        <div className="text-center mb-10">
                            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-widest mb-3">
                                Accreditation
                            </span>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                Recognized & <span className="text-accent">Accredited</span>
                            </h3>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {ACCREDITATIONS.map((a, i) => {
                                const colorMap = {
                                    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' },
                                    green: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' },
                                    red: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' },
                                };
                                const c = colorMap[a.color];
                                return (
                                    <div
                                        key={a.title}
                                        className={`${c.bg} ${c.border} border rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}
                                        style={{ transitionDelay: `${i * 100}ms` }}
                                    >
                                        <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center mb-4`}>
                                            <Award size={20} />
                                        </div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-2">{a.title}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{a.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>


            {/* ═══════════ SECTION 5: CREATORS / TEAM ═══════════ */}
            <section
                ref={addSectionRef(3)}
                data-section="team"
                className={`py-20 md:py-28 px-6 bg-white dark:bg-gray-800 transition-all duration-700 ${visibleSections.has('team') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
                <div className="max-w-4xl mx-auto text-center">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-widest mb-4">
                        The Team
                    </span>
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                        Meet the <span className="text-accent">Creators</span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-12 leading-relaxed">
                        Built with passion by PLMun students as part of their academic project — turning ideas into a real-world application.
                    </p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
                        {CREATORS.map((member, i) => (
                            <div
                                key={member.name}
                                className="group p-5 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 hover:border-accent/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                                style={{ transitionDelay: `${i * 60}ms` }}
                            >
                                <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center text-3xl mb-3 group-hover:scale-110 group-hover:bg-accent/20 transition-all duration-300">
                                    {member.avatar}
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm">{member.name}</h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{member.role}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tech stack badges */}
                    <div className="mt-14 flex flex-wrap justify-center gap-3">
                        {[
                            { icon: Code2, label: 'React 18' },
                            { icon: ExternalLink, label: 'Django REST' },
                            { icon: Shield, label: 'JWT Auth' },
                            { icon: Package, label: 'PostgreSQL' },
                        ].map((tech) => (
                            <span key={tech.label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium border border-gray-200 dark:border-gray-600 hover:border-accent/40 transition-colors">
                                <tech.icon size={14} className="text-accent" />
                                {tech.label}
                            </span>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════ FOOTER — PLMun style ═══════════ */}
            <footer className="relative overflow-hidden">
                {/* Green gradient wave top */}
                <div
                    className="h-24 w-full"
                    style={{
                        background: 'linear-gradient(135deg, #006B3F 0%, #008751 40%, #00A86B 70%, #d4a017 100%)',
                        clipPath: 'ellipse(80% 100% at 50% 100%)',
                    }}
                />

                {/* Main footer */}
                <div className="bg-[#00553A] text-white px-6 py-12">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">

                            {/* Logo + Contact */}
                            <div className="space-y-4 lg:col-span-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg">
                                        <img src={plmunLogo} alt="PLMun" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-white">PLMUN</p>
                                        <p className="text-white/60 text-[10px] leading-tight">Pamantasan ng Lungsod<br />ng Muntinlupa</p>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm text-white/70">
                                    <div className="flex items-start gap-2">
                                        <MapPin size={14} className="mt-0.5 flex-shrink-0 text-white/50" />
                                        <span>University Road NBP Reservation Brgy. Poblacion, City of Muntinlupa, Philippines, 1776</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="flex-shrink-0 text-white/50" />
                                        <span>02-8248-9161</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AtSign size={14} className="flex-shrink-0 text-white/50" />
                                        <span>plmuncomm@plmun.edu.ph</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div>
                                <h4 className="font-bold text-sm text-white mb-4 uppercase tracking-wider">Quick Links</h4>
                                <ul className="space-y-2 text-sm text-white/70">
                                    {[
                                        { label: 'PLMun Official Website', href: 'https://www.plmun.edu.ph/' },
                                        { label: 'Academic Calendar', href: 'https://www.plmun.edu.ph/' },
                                        { label: 'News & Events', href: 'https://www.plmun.edu.ph/events.php' },
                                        { label: 'Contact Us', href: 'https://www.plmun.edu.ph/contact-us.php' },
                                    ].map((link) => (
                                        <li key={link.label}>
                                            <a href={link.href} target="_blank" rel="noopener noreferrer"
                                                className="hover:text-white transition-colors flex items-center gap-1.5 group">
                                                <span className="w-1 h-1 rounded-full bg-white/40 group-hover:bg-accent transition-colors" />
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Other Links */}
                            <div>
                                <h4 className="font-bold text-sm text-white mb-4 uppercase tracking-wider">Other Links</h4>
                                <ul className="space-y-2 text-sm text-white/70">
                                    {[
                                        { label: 'Muntinlupa City', href: 'http://www.muntinlupacity.gov.ph' },
                                        { label: 'CHED', href: 'http://www.ched.gov.ph' },
                                        { label: 'TESDA', href: 'http://www.tesda.gov.ph' },
                                    ].map((link) => (
                                        <li key={link.label}>
                                            <a href={link.href} target="_blank" rel="noopener noreferrer"
                                                className="hover:text-white transition-colors flex items-center gap-1.5 group">
                                                <span className="w-1 h-1 rounded-full bg-white/40 group-hover:bg-accent transition-colors" />
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Find Us On + Support */}
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-bold text-sm text-white mb-4 uppercase tracking-wider">Find Us On</h4>
                                    <div className="flex gap-3">
                                        {[
                                            { icon: Facebook, href: 'https://facebook.com' },
                                            { icon: Youtube, href: 'https://youtube.com' },
                                            { icon: Linkedin, href: 'https://linkedin.com' },
                                            { icon: Twitter, href: 'https://twitter.com' },
                                        ].map((social, i) => (
                                            <a
                                                key={i}
                                                href={social.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all duration-200"
                                            >
                                                <social.icon size={16} className="text-white/80" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-white mb-3 uppercase tracking-wider">Support</h4>
                                    <ul className="space-y-1.5 text-xs text-white/60">
                                        <li>ict@plmun.edu.ph</li>
                                        <li>support@plmun.edu.ph</li>
                                        <li>universityregistrar@plmun.edu.ph</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="bg-[#004430] text-center py-4 px-6">
                    <p className="text-white/50 text-xs">
                        © 2025 Pamantasan ng Lungsod ng Muntinlupa · PLMun Inventory Nexus · All rights reserved.
                    </p>
                    <p className="text-white/35 text-[10px] mt-1 italic">
                        "Lakas, Talino, at Buhay"
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Login;
