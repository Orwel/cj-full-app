import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-app-bg">
      <div className="relative hidden w-1/2 flex-col justify-between bg-brand-800 p-10 lg:flex">
        <div className="relative z-10">
          <Image
            src="/Logo-Los-Libertadores.png"
            alt="Los Libertadores"
            width={280}
            height={80}
            className="h-14 w-auto"
            priority
          />
        </div>
        <div className="relative z-10 max-w-md text-brand-50">
          <p className="text-lg font-light italic">
            Las Leyes, el Derecho y la Libertad
          </p>
          <p className="mt-4 text-sm text-brand-100/90">
            Consultorio jurídico — monitoreo Rama Judicial Colombia
          </p>
        </div>
        <p className="relative z-10 text-xs text-brand-200/70">
          Fundación Universitaria Los Libertadores
        </p>
      </div>
      <div className="flex w-full flex-1 items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="surface-card w-full max-w-md rounded-xl p-8">{children}</div>
      </div>
    </div>
  )
}
