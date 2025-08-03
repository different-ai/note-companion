import { ReactNode } from 'react'

interface Integration {
  name: string;
  status: 'active' | 'coming-soon';
  description: string;
  icon?: string | React.ComponentType<{ className?: string }>;
}

// Type-safe enterprise integrations
export const enterpriseIntegrations: readonly Integration[] = [
  {
    name: 'Obsidian Plugin',
    status: 'active',
    description: 'Seamlessly organize your notes and files within Obsidian.',
  },
  {
    name: 'AI-Powered Classification',
    status: 'active',
    description: 'Automatically classify and organize your documents using advanced AI.',
  },
  {
    name: 'Smart Tagging',
    status: 'active',
    description: 'Intelligent tag suggestions based on content analysis.',
  },
  {
    name: 'Meeting Notes Enhancement',
    status: 'active',
    description: 'Automatically enhance and structure your meeting notes.',
  },
  {
    name: 'File Formatting',
    status: 'active',
    description: 'Consistent formatting across your documents.',
  },
  {
    name: 'Custom Templates',
    status: 'active',
    description: 'Create and apply custom templates for different document types.',
  },
  {
    name: 'Automated File Movement',
    status: 'active',
    description: 'Smart file organization based on content and context.',
  },

] as const;

// Export type for use in other components
export type IntegrationType = typeof enterpriseIntegrations[number];    