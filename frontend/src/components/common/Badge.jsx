export default function Badge({ children, variant = 'default', className = '' }) {
  const getStyles = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: 'var(--theme-accent)', opacity: 0.15, color: 'var(--theme-accent)' };
      case 'success':
        return { backgroundColor: '#22c55e', opacity: 0.15, color: '#22c55e' };
      case 'warning':
        return { backgroundColor: '#f59e0b', opacity: 0.15, color: '#f59e0b' };
      case 'error':
        return { backgroundColor: '#ef4444', opacity: 0.15, color: '#ef4444' };
      default:
        return { backgroundColor: 'rgba(128,128,128,0.2)', color: 'var(--theme-text)' };
    }
  };

  const styles = getStyles();

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`} style={styles}>
      {children}
    </span>
  );
}
