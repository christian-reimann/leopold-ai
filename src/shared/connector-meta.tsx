import Image from 'next/image';
import type { ReactNode } from 'react';

export type ConnectorMeta = {
  label: string;
  logo: ReactNode;
};

const CONNECTOR_META: Record<string, ConnectorMeta> = {
  adzuna: {
    label: 'adzuna',
    logo: <Image src="/images/icons/adzuna.png" alt="" width={16} height={16} className="size-4 shrink-0 rounded-sm" />,
  },
  arbeitnow: {
    label: 'arbeitnow',
    logo: (
      <Image src="/images/icons/arbeitnow.png" alt="" width={16} height={16} className="size-4 shrink-0 rounded-sm" />
    ),
  },
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

export const ALL_CONNECTOR_IDS = Object.keys(CONNECTOR_META);
