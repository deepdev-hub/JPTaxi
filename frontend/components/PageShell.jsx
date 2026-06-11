import Footer from './Footer.jsx';

export default function PageShell({ children, withFooter = true }) {
  if (!withFooter) {
    return <div className="plain-shell">{children}</div>;
  }

  return (
    <div className="page-shell has-footer">
      {children}
      <Footer />
    </div>
  );
}
