import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'AI Site Search Agent',
  description: 'Multi-modal site search engine with AI reranking, domain-level crawling, operator delegation, and native search detection.',
  openGraph: {
    title: 'AI Site Search Agent',
    description: 'Multi-modal site search engine with AI reranking, domain-level crawling, operator delegation, and native search detection.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Site Search Agent',
    description: 'Multi-modal site search engine with AI reranking, domain-level crawling, operator delegation, and native search detection.',
  },
  // إضافة وسم التحقق المخصص هنا
  verification: {
    other: {
      'site-agent-verify': ['site-agent-verify-38159b049ba9e97a'],
    },
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
