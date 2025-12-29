
import './global.css';
import { Sidebar } from '../components/Sidebar';
import { ClientProviders } from '../components/ClientProviders';

export const metadata = {
  title: 'Jainsight DB Hub',
  description: 'Enterprise Database Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{
        display: 'flex',
        height: '100vh',
        margin: 0,
        padding: 0,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}>
        <Sidebar />
        <main style={{
          flex: 1,
          overflow: 'auto',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.9) 100%)',
        }}>
          <ClientProviders>
            {children}
          </ClientProviders>
        </main>
      </body>
    </html>
  );
}
