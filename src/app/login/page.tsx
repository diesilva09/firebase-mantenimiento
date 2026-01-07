"use client";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase/auth/use-user"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signInWithEmail } from '@/firebase/auth/auth-service'


// Demo accounts for local testing
const DEMO_ADMIN_EMAIL = 'admin@demo.local'
const DEMO_USER_EMAIL = 'user@demo.local'

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/icons";

const emailSchema = z.object({
  email: z.string().email("Correo electrónico inválido."),
  password: z.string().min(1, "La contraseña es requerida."),
});

type EmailFormValues = z.infer<typeof emailSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  
  // Sesión válida solo si Firebase tiene usuario cargado
  const hasSession = !!user;

  useEffect(() => {
    if (!userLoading && hasSession) {
      router.replace("/dashboard/tasks");
    }
  }, [userLoading, hasSession, router]);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  });
  
  if (!userLoading && hasSession) {
    return null;
  }

  const handleEmailSignIn = async (data: EmailFormValues) => {
  setLoading(true);
  try {
    // Siempre autenticar con Firebase
    await signInWithEmail(data.email, data.password);

    // Determinar si es admin según la variable de entorno
    try {
      const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const isAdmin = adminEnv.includes(data.email);
      localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
      localStorage.setItem('userEmail', data.email);
    } catch (e) {
      localStorage.setItem('isAdmin', 'false');
      localStorage.setItem('userEmail', data.email);
    }

    router.push('/dashboard/tasks');
  } catch (err: any) {
  console.error("Login error", err);

  let msg = "No se pudo iniciar sesión. Verifica tu correo y contraseña.";
  if (err?.code === "auth/invalid-credential") {
    msg = "Correo o contraseña incorrectos.";
  }

  toast({
    title: "Error de inicio de sesión",
    description: msg,
    variant: "destructive",
  });
} finally {
  setLoading(false);
}
};

  const fillAdmin = () => {
    form.setValue('email', process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',')[0]?.trim() || DEMO_ADMIN_EMAIL)
    form.setValue('password', 'any-password')
  }

  const fillUser = () => {
    form.setValue('email', process.env.NEXT_PUBLIC_DEMO_USER_EMAIL || DEMO_USER_EMAIL)
    form.setValue('password', 'any-password')
  }

  const doDemoLogin = (email: string) => {
    setLoading(true)
    try {
      const isAdmin = email === DEMO_ADMIN_EMAIL
      localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false')
      localStorage.setItem('userEmail', email)
      router.push('/dashboard/tasks')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo width={200} height={100} className="mb-4" />
        <h1 className="text-3xl font-bold">Area de Mantenimiento</h1>
        <p className="text-muted-foreground">Inicia sesión para gestionar las tareas</p>
      </div>
      <Card className="w-[400px]">
        <form onSubmit={form.handleSubmit(handleEmailSignIn)}>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa tu correo y contraseña para acceder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" placeholder="" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" {...form.register("password")} />
               {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

