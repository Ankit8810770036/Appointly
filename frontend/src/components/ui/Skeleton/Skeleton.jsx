import './Skeleton.css';

const Skeleton = ({ variant = 'text', width, height, className = '', style = {} }) => {
    const skeletonClass = `skeleton skeleton--${variant} ${className}`;

    const skeletonStyle = {
        width: width || (variant === 'circle' ? '50px' : '100%'),
        height: height || (variant === 'circle' ? '50px' : variant === 'text' ? '1rem' : '150px'),
        ...style
    };

    return <div className={skeletonClass} style={skeletonStyle} aria-hidden="true" />;
};

export default Skeleton;
