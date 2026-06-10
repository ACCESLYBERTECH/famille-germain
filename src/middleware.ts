import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const { pathname } = request.nextUrl

  // Routes publiques — accessibles sans connexion
  const publicRoutes = ['/connexion', '/inscription', '/mot-de-passe-oublie', '/reinitialiser-mot-de-passe', '/api/auth', '/api/public', '/conditions']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Si pas connecté et route protégée → rediriger vers connexion
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/connexion', request.url))
  }

  // Si connecté et tente d'accéder à connexion/inscription → rediriger
  // Mais laisser passer mot-de-passe-oublie et reinitialiser même si connecté
  const redirectSiConnecte = ['/connexion', '/inscription']
  if (user && redirectSiConnecte.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}