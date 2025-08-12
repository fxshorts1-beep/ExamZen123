
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import React, { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExamZenLogo } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { loginUser } from "@/ai/flows/user-flow";
import { ThemeToggle } from "@/components/theme-toggle";

const formSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof formSchema>;

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const defaultTab = searchParams.get("role") || "student";
  const [currentTab, setCurrentTab] = React.useState(defaultTab);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const role = currentTab as 'student' | 'teacher' | 'admin';

    try {
      const user = await loginUser({ email: values.email, password: values.password });

      if (user && user.role === role) {
        toast({
          title: "Login Successful!",
          description: `Welcome back, ${user.username}!`,
        });
        
        // Redirect on success
        if (role === 'teacher') {
            router.push("/teacher/dashboard");
        } else if (role === 'admin') {
            router.push("/admin/dashboard");
        } else {
            router.push("/student/dashboard");
        }

      } else {
        throw new Error("Invalid credentials or role mismatch.");
      }
    } catch (error: any) {
        form.reset();
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: error.message || "An unexpected error occurred.",
        });
    }
  };

  const renderForm = (role: "student" | "teacher" | "admin") => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder={
                    role === 'student' ? "m@example.com"
                    : role === 'teacher' ? "prof@example.com"
                    : "admin@example.com"
                } {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </Form>
  )

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 relative">
       <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Tabs defaultValue={defaultTab} onValueChange={setCurrentTab} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="student">Student</TabsTrigger>
          <TabsTrigger value="teacher">Teacher</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>
        
        <TabsContent value="student">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2">
                <ExamZenLogo className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-headline">Student Login</CardTitle>
              <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderForm('student')}
              <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="underline">Sign up</Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teacher">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2">
                <ExamZenLogo className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-headline">Teacher Login</CardTitle>
              <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
            </CardHeader>
            <CardContent>{renderForm('teacher')}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2">
                <ExamZenLogo className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-headline">Admin Login</CardTitle>
              <CardDescription>Enter your credentials to access the admin panel.</CardDescription>
            </CardHeader>
            <CardContent>{renderForm('admin')}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
