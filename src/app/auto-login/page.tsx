'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

function AutoLoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setError('No se proporcionó ningún token de acceso seguro.')
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 p-4">
      {/* Elementos de fondo decorativos */}
      <div className="absolute top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-purple-600/20 blur-[120px]" />
      
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-900/80 p-10 text-center shadow-2xl backdrop-blur-xl border border-slate-800">
        
        {error ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="rounded-full bg-red-500/10 p-4 mb-6 ring-1 ring-red-500/20">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-white tracking-tight">Acceso Denegado</h1>
            <p className="mb-8 text-slate-400 leading-relaxed max-w-xs">{error}</p>
            <Link 
              href="/login"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-500 focus:ring-4 focus:ring-blue-600/20"
            >
              Volver al portal principal
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-6 py-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-blue-500 blur-xl opacity-20 animate-pulse" />
              <div className="relative rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-4 text-white shadow-xl">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Conectando mundos</h1>
              <p className="text-sm text-slate-400">
                Sincronizando de forma segura tu perfil con Leyopolis...
              </p>
            </div>
            
            <div className="pt-4 flex w-full items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-sm font-medium text-blue-400 animate-pulse">Autenticando...</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-8 text-center text-xs font-medium text-slate-600">
        Plataforma Segura • Leyopolis
      </div>
    </div>
  )
}

export default function AutoLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    }>
      <AutoLoginContent />
    </Suspense>
  )
}
