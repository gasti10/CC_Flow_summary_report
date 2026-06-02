export const toolboxTalkFormSchema = {
  template_key: 'toolbox_talk',
  template_label: 'Toolbox Talk',
  fields: [
    { id: 'topic', label: 'Toolbox talk topic?', type: 'text' as const, required: true },
    { id: 'presenter', label: 'Presenter?', type: 'text' as const, required: true },
    { id: 'start_time', label: 'Start time?', type: 'time' as const, required: true },
    { id: 'end_time', label: 'End time?', type: 'time' as const, required: true },
    { id: 'description', label: 'Description of topics?', type: 'textarea' as const, required: true }
  ]
} as const

export type ToolboxTalkFieldId = typeof toolboxTalkFormSchema.fields[number]['id']
