import { LayoutTemplateRegistry } from './layout-registry';
import { standardLayoutTemplate } from './standard-layout';

export const layoutTemplateRegistry = new LayoutTemplateRegistry();
layoutTemplateRegistry.register(standardLayoutTemplate);
