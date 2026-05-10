import { createFileRoute } from '@tanstack/react-router'
import { ConnectPage } from '../pages/ConnectPage'

export const Route = createFileRoute('/conectar')({
  component: ConnectPage,
})
