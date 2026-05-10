import { createFileRoute } from '@tanstack/react-router'
import { AgendaPlaceholderPage } from '../pages/AppTabPlaceholderPage'

export const Route = createFileRoute('/agenda')({
  component: AgendaPlaceholderPage,
})
