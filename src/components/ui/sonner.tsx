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
      duration={2000}
      closeButton={true}
      gap={10}
      visibleToasts={2}
      expand={false}
      className="toaster group"
      style={{ '--width': '340px' } as React.CSSProperties}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "!flex !flex-row !items-center !gap-3 p-3 pr-9 rounded-xl bg-white w-[340px] max-w-[calc(100vw-2rem)] relative pointer-events-auto overflow-hidden",
          title: "text-sm font-medium text-gray-900 break-words overflow-hidden",
          description: "text-gray-600 text-xs break-words overflow-hidden",
          actionButton:
            "bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium",
          cancelButton:
            "bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium",
          icon: "!flex-shrink-0 !w-8 !min-w-[32px]",
          closeButton:
            "!absolute !right-2 !top-1/2 !-translate-y-1/2 !left-auto !bg-gray-200 hover:!bg-gray-300 !border-0 !rounded-full !p-1 !transition-colors !w-5 !h-5 !flex !items-center !justify-center [&>svg]:!text-gray-600 [&>svg]:!w-3 [&>svg]:!h-3 hover:[&>svg]:!text-gray-800 !z-10",
        },
        style: {
          boxShadow: '0 4px 12px rgba(0,0,0,.1), 0 10px 24px rgba(0,0,0,.08)',
          width: '340px',
          maxWidth: 'calc(100vw - 2rem)',
        },
      }}
      icons={{
        success: (
          <div className="flex-shrink-0 size-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00C9A7' }}>
            <CheckIcon className="size-4 text-white" strokeWidth={3} />
          </div>
        ),
        error: (
          <div className="flex-shrink-0 size-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF3D71' }}>
            <XIcon className="size-4 text-white" strokeWidth={3} />
          </div>
        ),
        info: (
          <div className="flex-shrink-0 size-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1E86FF' }}>
            <InfoIcon className="size-4 text-white" strokeWidth={2.5} />
          </div>
        ),
        warning: (
          <div className="flex-shrink-0 size-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFB800' }}>
            <AlertTriangleIcon className="size-4 text-white" strokeWidth={2.5} />
          </div>
        ),
      }}
      {...props}
    />
  )
}

export { Toaster }
