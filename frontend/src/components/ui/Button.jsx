import React from 'react';

const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20 hover:shadow-primary/40',
    secondary: 'bg-secondary text-white hover:bg-secondary-dark shadow-lg shadow-secondary/20 hover:shadow-secondary/40',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
    gradient: 'bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/30',
};

const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
    xl: 'px-8 py-4 text-lg',
};

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    disabled = false,
    loading = false,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    ...props
}) => {
    return (
        <button
            disabled={disabled || loading}
            className={`
                inline-flex items-center justify-center gap-2
                font-semibold rounded-xl
                transition-all duration-300 ease-out
                transform hover:scale-[1.02] active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
                relative overflow-hidden
                ${variants[variant]}
                ${sizes[size]}
                ${fullWidth ? 'w-full' : ''}
                ${className}
            `}
            {...props}
        >
            {/* Shine effect overlay */}
            <span className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                <span className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </span>

            {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                </svg>
            ) : Icon && iconPosition === 'left' ? (
                <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : size === 'xl' ? 22 : 16} className="transition-transform group-hover:scale-110" />
            ) : null}

            <span className="relative z-10">{children}</span>

            {!loading && Icon && iconPosition === 'right' && (
                <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : size === 'xl' ? 22 : 16} className="transition-transform group-hover:scale-110" />
            )}
        </button>
    );
};

export default Button;
