import React from 'react';

const Card = ({ children, className = '', padding = true, ...props }) => {
    return (
        <div
            className={`
        bg-white rounded-2xl border border-gray-100 shadow-sm
        ${padding ? 'p-6' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
};

const CardHeader = ({ children, className = '' }) => (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
        {children}
    </div>
);

const CardTitle = ({ children, className = '' }) => (
    <h3 className={`text-lg font-bold text-gray-900 ${className}`}>
        {children}
    </h3>
);

const CardDescription = ({ children, className = '' }) => (
    <p className={`text-sm text-gray-500 ${className}`}>
        {children}
    </p>
);

const CardContent = ({ children, className = '' }) => (
    <div className={className}>
        {children}
    </div>
);

const CardFooter = ({ children, className = '' }) => (
    <div className={`mt-4 pt-4 border-t border-gray-100 ${className}`}>
        {children}
    </div>
);

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
