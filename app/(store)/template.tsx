/** Re-mounts on every navigation, so each page eases in. */
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
