'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/app/_lib/api';
import { Button, Card, ErrorNote, inputClass, labelClass } from '@/app/_ui/kit';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const { status } = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (status === 200) {
        router.replace('/');
        return;
      }
      setError(status === 401 ? 'Неверный логин или пароль' : `Не удалось войти (код ${status})`);
    } catch {
      setError('Не удалось связаться с сервером');
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-neutral-900">
          Личные финансы
        </h1>
        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <label className="block">
              <span className={labelClass}>Логин</span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                disabled={pending}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Пароль</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                disabled={pending}
              />
            </label>
            <ErrorNote>{error}</ErrorNote>
            <Button type="submit" variant="primary" className="w-full" disabled={pending}>
              {pending ? 'Входим…' : 'Войти'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
