'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { AgentPanel } from './agent-panel';

export const PANEL_COLLAPSED_COOKIE = 'leopold-panel-collapsed';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Entspricht der vorherigen fixen Breite (w-12 / w-96). Der Kollaps-Zustand ist bewusst
// unabhängig vom Panel-internen Constraint-Solver: Auf schmalen (Mobile-)Gruppenbreiten kann
// minSize (320px) ohnehin nicht erfüllt werden, wodurch die Bibliothek das Panel selbstständig
// kollabieren würde – das AgentPanel rendert auf Mobile aber ein eigenständiges, fixed
// positioniertes Bottom-Sheet/FAB, das mit der Panel-Breite nichts zu tun hat.
const AGENT_PANEL_COLLAPSED_SIZE = 48;
const AGENT_PANEL_DEFAULT_SIZE = 384;
const AGENT_PANEL_MIN_SIZE = 320;
const AGENT_PANEL_MAX_SIZE = 640;

export function AgentPanelLayout({
  children,
  initialCollapsed,
  activeProfileId,
}: {
  children: ReactNode;
  initialCollapsed: boolean;
  activeProfileId: string;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const panelRef = useRef<PanelImperativeHandle>(null);

  // Umgekehrte Richtung: Toggle-Button (bzw. initialer Cookie-Wert) treibt die Panel-Breite.
  useEffect(() => {
    if (collapsed) {
      panelRef.current?.collapse();
    } else {
      panelRef.current?.expand();
    }
    document.cookie = `${PANEL_COLLAPSED_COOKIE}=${collapsed}; path=/; max-age=${ONE_YEAR_SECONDS}`;
  }, [collapsed]);

  // Vorwärtsrichtung: Zieht man die Handle über minSize hinaus, kollabiert die Bibliothek das
  // Panel selbst – das muss in unseren State zurückgespiegelt werden, sonst zeigt AgentPanel
  // weiter den vollen Inhalt in der schmalen Box.
  function handlePanelResize() {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 639.98px)').matches) return;
    const nowCollapsed = panelRef.current?.isCollapsed() ?? false;
    setCollapsed((prev) => (prev === nowCollapsed ? prev : nowCollapsed));
  }

  function toggleCollapsed() {
    setCollapsed((prev) => !prev);
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
      <ResizablePanel id="main-content-slot" minSize={360}>
        <main className="@container mx-auto max-w-4xl px-6 py-8">{children}</main>
      </ResizablePanel>
      <ResizableHandle className="hidden sm:flex" />
      <ResizablePanel
        id="agent-panel-slot"
        panelRef={panelRef}
        collapsible
        collapsedSize={AGENT_PANEL_COLLAPSED_SIZE}
        defaultSize={initialCollapsed ? AGENT_PANEL_COLLAPSED_SIZE : AGENT_PANEL_DEFAULT_SIZE}
        minSize={AGENT_PANEL_MIN_SIZE}
        maxSize={AGENT_PANEL_MAX_SIZE}
        onResize={handlePanelResize}
        className="flex"
      >
        <AgentPanel key={activeProfileId} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
