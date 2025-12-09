import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast } from "sonner"
import { CheckIcon, XIcon, InfoIcon, AlertTriangleIcon } from "lucide-react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      duration={4000}
      closeButton={true}
      gap={12}
      visibleToasts={4}
      className="toaster group"
      style={{ '--width': '400px' } as React.CSSProperties}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "!flex !flex-row !items-center !gap-3 p-4 pr-10 rounded-2xl bg-white w-[400px] max-w-[calc(100vw-2rem)] relative pointer-events-auto overflow-hidden",
          title: "text-base font-medium text-slate-900 break-words overflow-hidden",
          description: "text-slate-600 text-sm break-words overflow-hidden",
          actionButton:
            "bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium",
          cancelButton:
            "bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium",
          icon: "!flex-shrink-0 !w-10 !min-w-[40px]",
          closeButton:
            "!absolute !right-3 !top-1/2 !-translate-y-1/2 !left-auto !bg-slate-200 hover:!bg-slate-300 !border-0 !rounded-full !p-1 !transition-colors !w-6 !h-6 !flex !items-center !justify-center [&>svg]:!text-slate-600 [&>svg]:!w-4 [&>svg]:!h-4 hover:[&>svg]:!text-slate-800 !z-10",
        },
        style: {
          boxShadow: '0 4px 12px rgba(0,0,0,.1), 0 20px 40px rgba(0,0,0,.1)',
          width: '400px',
          maxWidth: 'calc(100vw - 2rem)',
        },
      }}
      icons={{
        success: (
          <div className="flex-shrink-0 size-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#00C9A7' }}>
            <CheckIcon className="size-5 text-white" strokeWidth={3} />
          </div>
        ),
        error: (
          <div className="flex-shrink-0 size-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#FF3D71' }}>
            <XIcon className="size-5 text-white" strokeWidth={3} />
          </div>
        ),
        info: (
          <div className="flex-shrink-0 size-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#1E86FF' }}>
            <InfoIcon className="size-5 text-white" strokeWidth={2.5} />
          </div>
        ),
        warning: (
          <div className="flex-shrink-0 size-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#FFB800' }}>
            <AlertTriangleIcon className="size-5 text-white" strokeWidth={2.5} />
          </div>
        ),
      }}
      {...props}
    />
  )
}

export { Toaster }
