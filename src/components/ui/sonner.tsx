import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast } from "sonner"
import { CheckIcon, XIcon, InfoIcon, AlertTriangleIcon } from "lucide-react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-center"
      duration={4000}
      className="toaster group"
      style={{ '--width': '560px' } as React.CSSProperties}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "!flex !flex-row !items-center !gap-4 p-4 rounded-2xl bg-white w-[560px] transition-all duration-200 ease-in-out hover:scale-[1.03]",
          title: "text-lg font-medium text-slate-900 !ml-2",
          description: "text-slate-600 text-sm !ml-2",
          actionButton:
            "bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium",
          cancelButton:
            "bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium",
          icon: "!flex-shrink-0 !w-10 !min-w-[40px] !mr-2",
        },
        style: {
          boxShadow: '0 4px 12px rgba(0,0,0,.1), 0 20px 40px rgba(0,0,0,.1)',
          width: '560px',
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
