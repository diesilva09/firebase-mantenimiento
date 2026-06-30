"use client";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase/auth/use-user"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signInWithEmail, logOut } from '@/firebase/auth/auth-service'
import { Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  
  // Sesión válida solo si Firebase tiene usuario cargado
  const hasSession = !!user;

  useEffect(() => {
    if (!userLoading && hasSession && !isProcessingLogin) {
      router.replace("/dashboard/tasks");
    }
  }, [userLoading, hasSession, router, isProcessingLogin]);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  });
  
  if (!userLoading && hasSession) {
    return null;
  }

  const handleEmailSignIn = async (data: EmailFormValues) => {
  setLoading(true);
  setIsProcessingLogin(true);
  let firebaseAuthenticated = false;

  try {
    // 1. Autenticar con Firebase
    const userCredential = await signInWithEmail(data.email, data.password);
    firebaseAuthenticated = true;

    // Intentamos obtener el usuario del objeto retornado (algunos wrappers devuelven el User directamente)
    const firebaseUser = userCredential;
    const uid = firebaseUser?.uid;
    const userEmail = firebaseUser?.email || data.email;

    if (!uid) {
      throw new Error("No se pudo obtener el identificador único del usuario (UID).");
    }

    // 2. Validar contra nuestra base de datos SQL
    const roleRes = await fetch('/api/auth/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, uid: uid }),
    });
    
    const roleData = await roleRes.json();

    if (!roleRes.ok || roleData.role === 'NONE') {
      // Si no tiene rol asignado o la cuenta no es válida, cerramos sesión inmediatamente
      await logOut();
      setIsProcessingLogin(false); // Liberamos aquí para permitir reintento
      toast({
        title: "Acceso restringido",
        description: "No tienes permisos para acceder a este sistema o tu cuenta está inactiva.",
        variant: "destructive",
      });
      return;
    }

    // Si todo está bien, redirigimos nosotros mismos
    router.push('/dashboard/tasks');
  } catch (err: any) {
    console.error("Login error", err);
    
    // Si logramos autenticar en Firebase pero algo falló después (SQL o datos),
    // cerramos la sesión e introducimos una pequeña espera para que el estado
    // global de Firebase se actualice antes de liberar `isProcessingLogin`.
    if (firebaseAuthenticated) {
      await logOut();
      // Pequeño delay para asegurar que useUser() detecte el logout antes que el useEffect corra
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setIsProcessingLogin(false);

    let msg = "No se pudo iniciar sesión. Verifica tu correo y contraseña.";
    if (err?.code === "auth/invalid-credential" || err?.code === "auth/user-not-found" || err?.code === "auth/wrong-password") {
      msg = "Correo o contraseña incorrectos.";
    } else if (err?.message) {
      msg = err.message;
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


  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <div className="mb-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 slide-in-from-top-8 duration-500">
        <Logo width={220} height={220} className="mb-4" />
        <h1 className="text-3xl font-bold">Area de Mantenimiento</h1>
        <p className="text-muted-foreground">Inicia sesión para gestionar labores</p>
      </div>
      <Card className="w-[400px] animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-500">
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...form.register("password")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
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
