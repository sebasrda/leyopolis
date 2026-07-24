'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function AutoLoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setError('No se proporcionó ningún token de acceso.')
      return
    }

    const performLogin = async () => {
      try {
        const result = await signIn('sso', {
          token,
          redirect: false,
        })

        if (result?.error) {
          setError(result.error)
        } else if (result?.ok) {
          router.push('/dashboard')
        }
      } catch (err: any) {
        setError(err.message || 'Error desconocido al iniciar sesión')
      }
    }

    performLogin()
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg border border-gray-100">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Iniciando sesión</h1>
        
        {error ? (
          <div className="mt-6 flex flex-col items-center">
            <div className="rounded-full bg-red-100 p-3 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="mb-6 text-sm text-gray-600">{error}</p>
            <Link 
              href="/login"
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Volver al inicio de sesión manual
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">
              Validando credenciales seguras con EduNomad...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AutoLoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>}>
      <AutoLoginContent />
    </Suspense>
  )
}
