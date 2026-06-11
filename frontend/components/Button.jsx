export default function Button({ children, className = 'submit-button', type = 'button', ...props }) {
  return (
    <button className={className} type={type} {...props}>
      {children}
    </button>
  );
}
