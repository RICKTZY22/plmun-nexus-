import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = ({
    label,
    error,
    icon: Icon,
    className = '',
    type = 'text',
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
        <div className="space-y-1.5">
            {label && (
                <label
                    className={`
                        block text-xs font-bold uppercase tracking-wider ml-1
                        transition-colors duration-200
                        ${isFocused ? 'text-primary' : 'text-gray-500'}
                    `}
                >
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div
                        className={`
                            absolute left-3.5 top-1/2 -translate-y-1/2 
                            transition-all duration-200
                            ${isFocused ? 'text-primary scale-110' : 'text-gray-400'}
                        `}
                    >
                        <Icon size={18} />
                    </div>
                )}
                <input
                    type={inputType}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className={`
                        w-full px-4 py-3.5
                        ${Icon ? 'pl-11' : ''}
                        ${isPassword ? 'pr-11' : ''}
                        bg-gray-50/80 border-2 border-gray-200 rounded-xl
                        text-gray-900 text-sm font-medium
                        placeholder:text-gray-400 placeholder:font-normal
                        transition-all duration-300 ease-out
                        focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10
                        hover:border-gray-300 hover:bg-white
                        outline-none
                        ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}
                        ${className}
                    `}
                    {...props}
                />

                {/* Password toggle button */}
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`
                            absolute right-3.5 top-1/2 -translate-y-1/2
                            p-1 rounded-lg
                            transition-all duration-200
                            hover:bg-gray-100 active:scale-95
                            ${isFocused ? 'text-primary' : 'text-gray-400'}
                        `}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}

                {/* Focus indicator line */}
                <div
                    className={`
                        absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 
                        bg-gradient-to-r from-primary to-primary-light rounded-full
                        transition-all duration-300 ease-out
                        ${isFocused ? 'w-[calc(100%-1rem)]' : 'w-0'}
                    `}
                />
            </div>

            {error && (
                <p className="text-xs text-red-500 ml-1 animate-slide-in flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-red-500 rounded-full" />
                    {error}
                </p>
            )}
        </div>
    );
};

export default Input;
