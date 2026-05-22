'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminLogin } from '../api';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(12, 'Minimum 12 caractères'),
});

type FormValues = z.infer<typeof schema>;

export function AdminLoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await adminLogin(values.email, values.password);
      router.replace('/admin');
    } catch (err) {
      setError('root', { message: (err as Error).message });
    }
  };

  return (
    <main className="min-h-dvh bg-background p-4">
      <div className="container max-w-md py-12">
        <h1 className="text-2xl font-extrabold">Console Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connexion avec ton email et ton mot de passe (8h de session).
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email ? (
              <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold">
              Mot de passe
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              aria-invalid={!!errors.password}
            />
            {errors.password ? (
              <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          {errors.root ? (
            <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-sm">
              {errors.root.message}
            </p>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </div>
    </main>
  );
}
