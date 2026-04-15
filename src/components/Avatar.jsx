// ==============================
//  Avatar Component
// ==============================
export default function Avatar({ contact, size = 42, className = '' }) {
  const style = {
    width: size,
    height: size,
    fontSize: size * 0.36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid transparent',
  };

  return (
    <div
      className={`avatar ${contact.color} ${className}`}
      style={style}
      title={contact.name}
    >
      {contact.initials}
    </div>
  );
}
