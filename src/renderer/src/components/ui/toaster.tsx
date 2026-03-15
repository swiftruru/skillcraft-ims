import { useToastStore } from './use-toast'
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction
} from './toast'

export function Toaster() {
  const { toasts } = useToastStore()

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map((t) => (
        <Toast key={t.id} variant={t.variant} open>
          <div className="flex-1 min-w-0">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
          {t.action && (
            <ToastAction altText={t.action.label} onClick={t.action.onClick}>
              {t.action.label}
            </ToastAction>
          )}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
