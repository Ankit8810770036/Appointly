import React from 'react';
import './Skeleton.css';

const Skeleton = ({ variant = 'text', width, height, count = 1, className = '', style = {} }) => {
    const skeletonClass = `skeleton skeleton--${variant} ${className}`;

    const skeletonStyle = {
        width: width || (variant === 'circle' ? '50px' : '100%'),
        height: height || (variant === 'circle' ? '50px' : variant === 'text' ? '1rem' : '150px'),
        ...style
    };

    if (count > 1) {
        return (
            <div className="skeleton-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                {Array.from({ length: count }).map((_, idx) => (
                    <div key={idx} className={skeletonClass} style={skeletonStyle} aria-hidden="true" />
                ))}
            </div>
        );
    }

    return <div className={skeletonClass} style={skeletonStyle} aria-hidden="true" />;
};

export default Skeleton;
