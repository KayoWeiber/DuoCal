import { createFileRoute } from '@tanstack/react-router'
import { KanbanPlaceholderPage } from '../pages/AppTabPlaceholderPage'

export const Route = createFileRoute('/kanban')({
  component: KanbanPlaceholderPage,
})
