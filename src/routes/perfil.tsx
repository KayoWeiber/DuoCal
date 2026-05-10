import { createFileRoute } from '@tanstack/react-router'
import { ProfilePlaceholderPage } from '../pages/AppTabPlaceholderPage'

export const Route = createFileRoute('/perfil')({
  component: ProfilePlaceholderPage,
})
