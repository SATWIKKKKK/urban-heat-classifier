'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    'OAuthSignin': 'Error starting Google sign-in.',
    'OAuthCallback': 'Error during Google authentication.',
    'OAuthCreateAccount': 'Could not create account with Google.',
    'EmailCreateAccount': 'Could not create account.',
    'Callback': 'Authentication callback error.',
    'OAuthAccountNotLinked': 'This email is already registered. Please sign in with your password.',
    'SessionRequired': 'Please sign in to continue.',
    'default': 'An authentication error occurred.',
  };
  
  const message = errorMessages[error ?? 'default'] ?? errorMessages['default'];
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
      <div className="max-w-sm w-full mx-4 p-8 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl text-center shadow-xl">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-lg font-bold text-white mb-2">
          Sign In Failed
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {message}
        </p>
        {error === 'OAuthAccountNotLinked' && (
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
            An account with this email already exists.
            Sign in with your email and password instead.
          </p>
        )}
        
        <Link
          href="/login"
          className="block w-full py-2.5 text-sm font-semibold bg-[var(--green-500)] text-white rounded-lg hover:bg-[var(--green-400)] transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-base)]" />}>
      <AuthErrorContent />
    </Suspense>
  );
}
