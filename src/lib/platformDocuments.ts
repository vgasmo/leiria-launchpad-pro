import type { Template, TemplateInstance } from '@/hooks/useTemplates';

export interface PlatformDocumentOption {
  id: string;
  name: string;
  type: 'template_instance' | 'template';
  templateId: string;
  deeplink: string;
  isReadyToAttach: boolean;
}

function buildTemplateDeepLink(workspaceId: string, templateId: string) {
  return `/workspace/${workspaceId}?tab=documents&sub=tools&openTemplate=${encodeURIComponent(templateId)}`;
}

export function buildPlatformDocumentOptions(
  workspaceId: string,
  templateInstances: TemplateInstance[] = [],
  templates: Template[] = [],
): PlatformDocumentOption[] {
  const docs: PlatformDocumentOption[] = [];

  templateInstances.forEach((instance) => {
    docs.push({
      id: instance.id,
      name: instance.template?.name || instance.template_id,
      type: 'template_instance',
      templateId: instance.template_id,
      deeplink: buildTemplateDeepLink(workspaceId, instance.template_id),
      isReadyToAttach: instance.status === 'completed' || instance.review_status === 'approved',
    });
  });

  const instantiatedTemplateIds = new Set(templateInstances.map((instance) => instance.template_id));
  templates.forEach((template) => {
    if (instantiatedTemplateIds.has(template.id)) return;

    docs.push({
      id: `template:${template.id}`,
      name: template.name,
      type: 'template',
      templateId: template.id,
      deeplink: buildTemplateDeepLink(workspaceId, template.id),
      isReadyToAttach: false,
    });
  });

  return docs;
}