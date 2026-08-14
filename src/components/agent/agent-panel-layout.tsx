'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { AgentPanel } from './agent-panel';

export const PANEL_COLLAPSED_COOKIE = 'leopold-panel-collapsed';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Corresponds to the previous fixed width (w-12 / w-96). The collapsed state is deliberately
// independent of the panel's internal constraint solver: at narrow (mobile) group widths,
// minSize (320px) can't be satisfied anyway, which would make the library collapse the panel
// on its own – but on mobile, AgentPanel renders its own fixed-positioned bottom
// sheet/FAB that has nothing to do with the panel width.
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

  // Reverse direction: toggle button (or initial cookie value) drives the panel width.
  useEffect(() => {
    if (collapsed) {
      panelRef.current?.collapse();
    } else {
      panelRef.current?.expand();
    }
    document.cookie = `${PANEL_COLLAPSED_COOKIE}=${collapsed}; path=/; max-age=${ONE_YEAR_SECONDS}`;
  }, [collapsed]);

  // Forward direction: if you drag the handle past minSize, the library collapses the
  // panel itself – that has to be mirrored back into our state, otherwise AgentPanel
  // keeps showing the full content in the narrow box.
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
