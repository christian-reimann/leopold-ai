import type { ApplicationLayoutId } from '@/shared/schemas/application';
import type { LayoutTemplate } from './layout-template';

export class LayoutTemplateRegistry {
  private readonly templates = new Map<ApplicationLayoutId, LayoutTemplate>();

  register(template: LayoutTemplate): void {
    if (this.templates.has(template.id)) {
      throw new Error(`Layout-Vorlage mit id "${template.id}" ist bereits registriert.`);
    }
    this.templates.set(template.id, template);
  }

  getAll(): LayoutTemplate[] {
    return [...this.templates.values()];
  }

  getById(id: ApplicationLayoutId): LayoutTemplate {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Layout-Vorlage nicht gefunden: ${id}`);
    }
    return template;
  }
}
