import React from 'react';
import { motion } from 'framer-motion';
import './Card.css';

/**
 * Card component
 * @param {('default'|'elevated'|'bordered'|'glass')} variant
 * @param {('sm'|'md'|'lg'|'none')} padding
 * @param {boolean} hover - enable hover lift effect
 * @param {boolean} animate - enable entry animation
 * @param {number} delay - delay for entry animation
 */
const Card = ({
    children,
    variant = 'default',
    padding = 'md',
    hover = false,
    animate = false,
    delay = 0,
    className = '',
    style,
    ...props
}) => {
    const Component = animate ? motion.div : 'div';

    const animationProps = animate ? {
        initial: { opacity: 0, y: 8 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-20px" },
        transition: { duration: 0.3, delay }
    } : {};

    return (
        <Component
            className={`card card--${variant} card--pad-${padding} ${hover ? 'card--hover' : ''} ${className}`}
            style={style}
            {...animationProps}
            {...props}
        >
            {children}
        </Component>
    );
};

Card.Header = ({ children, className = '', ...props }) => (
    <div className={`card__header ${className}`} {...props}>{children}</div>
);

Card.Body = ({ children, className = '', ...props }) => (
    <div className={`card__body ${className}`} {...props}>{children}</div>
);

Card.Footer = ({ children, className = '', ...props }) => (
    <div className={`card__footer ${className}`} {...props}>{children}</div>
);

export default Card;
