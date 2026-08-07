import Image from 'next/image';
import type { ReactNode } from 'react';

export type ConnectorMeta = {
  label: string;
  logo: ReactNode;
};

const CONNECTOR_META: Record<string, ConnectorMeta> = {
  arbeitsagentur: {
    label: 'Arbeitsagentur',
    logo: (
      <Image
        src="/images/icons/arbeitsagentur.png"
        alt=""
        width={16}
        height={16}
        className="size-4 shrink-0 rounded-sm"
      />
    ),
  },
  kimeta: {
    label: 'Kimeta',
    logo: <Image src="/images/icons/kimeta.png" alt="" width={16} height={16} className="size-4 shrink-0 rounded-sm" />,
  },
  arbeitnow: {
    label: 'arbeitnow',
    logo: (
      <Image src="/images/icons/arbeitnow.png" alt="" width={16} height={16} className="size-4 shrink-0 rounded-sm" />
    ),
  },
  'get-in-it': {
    label: 'get in IT',
    logo: (
      <Image src="/images/icons/get-in-it.png" alt="" width={16} height={16} className="size-4 shrink-0 rounded-sm" />
    ),
  },
};

export function connectorMetaFor(connectorId: string): ConnectorMeta {
  return CONNECTOR_META[connectorId] ?? { label: connectorId, logo: null };
}
