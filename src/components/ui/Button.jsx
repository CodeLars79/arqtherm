import { forwardRef } from 'react';

/**
 * Botón con variantes. Si solo lleva icono, `label` se usa como nombre accesible.
 */
const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconOnly = false, label, children, className = '', type = 'button', ...rest },
  ref
) {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`, iconOnly ? 'btn--icon' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : rest.title}
      {...rest}
    >
      {Icon && <Icon aria-hidden="true" size={size === 'sm' ? 15 : 17} strokeWidth={1.75} />}
      {!iconOnly && <span>{children ?? label}</span>}
    </button>
  );
});

export default Button;
