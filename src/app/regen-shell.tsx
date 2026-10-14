'use client';

import dynamic from 'next/dynamic';

const RegenApp = dynamic(() => import('../regen-ui/App'), { ssr: false });

export default function RegenShell() {
  return <RegenApp />;
}
