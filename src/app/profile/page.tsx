
"use client";

import { useEffect, useState, Suspense } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getProfile, ProfileOutput } from "@/ai/flows/profile-flow";
import { updateUser, updatePassword } from "@/ai/flows/user-flow";
import { Upload, KeyRound, User, Briefcase, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// In a real app, this would come from the user's session
// For demo purposes, we map roles to mock IDs
const MOCK_USER_IDS: Record<string, string> = {
    student: "663d2740984534f369d7a87e", 
    teacher: "663d2740984534f369d7a87d",
    admin: "663d2740984534f369d7a87c"
};

const profileFormSchema = z.object({
  username: z.string().min(2, "Username is required"),
  email: z.string().email("Please enter a valid email."),
  profile_pic_url: z.string().url("Please enter a valid URL.").or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;


function ProfilePageContent() {
  const [user, setUser] = useState<ProfileOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') as keyof typeof MOCK_USER_IDS || 'student';
  const userId = MOCK_USER_IDS[role];

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      email: "",
      profile_pic_url: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    async function fetchUser() {
      if (!userId) {
          setLoading(false);
          toast({ variant: "destructive", title: "Error", description: "Invalid user role specified." });
          return;
      }
      try {
        setLoading(true);
        const fetchedUser = await getProfile(userId); 
        if (!fetchedUser) throw new Error("User not found");
        
        setUser(fetchedUser);
        profileForm.reset({
          username: fetchedUser.username,
          email: fetchedUser.email,
          profile_pic_url: fetchedUser.profile_pic_url || "",
        });
      } catch (error) {
        console.error("Failed to fetch user:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch user profile." });
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [profileForm, toast, userId]);

  const onProfileSubmit: SubmitHandler<ProfileFormValues> = async (values) => {
    if (!user) return;
    try {
      await updateUser({ id: user.id, ...values });
      toast({
        title: "Profile Updated",
        description: "Your information has been successfully updated.",
      });
      const updatedUser = await getProfile(userId);
      if (!updatedUser) throw new Error("User not found after update");
      setUser(updatedUser);
      profileForm.reset({
          username: updatedUser.username,
          email: updatedUser.email,
          profile_pic_url: updatedUser.profile_pic_url || "",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "An unexpected error occurred.",
      });
    }
  };

  const onPasswordSubmit: SubmitHandler<PasswordFormValues> = async (values) => {
    if (!user) return;
    try {
      await updatePassword({
        userId: user.id,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "An unexpected error occurred.",
      });
    }
  };

  if (loading) {
    return <div>Loading profile...</div>;
  }

  if (!user) {
    return <div>User not found.</div>;
  }

  const profilePicUrl = profileForm.watch("profile_pic_url");

  const renderRoleSpecificInfo = () => {
    switch (user.role) {
      case 'student':
        return (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                <span>Class {user.class}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Section {user.section}</span>
              </div>
          </div>
        );
      case 'teacher':
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span>Teacher Account</span>
            </div>
        );
       case 'admin':
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Administrator Account</span>
            </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="grid gap-8 max-w-4xl mx-auto md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your name, email, and profile picture.</CardDescription>
            </div>
            <Badge variant="outline" className="capitalize">{user.role}</Badge>
          </div>
        </CardHeader>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profilePicUrl} alt={user.username} data-ai-hint="profile picture" />
                  <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                   {renderRoleSpecificInfo()}
                  <FormField
                    control={profileForm.control}
                    name="profile_pic_url"
                    render={({ field }) => (
                      <FormItem className="mt-2">
                        <FormLabel className="sr-only">Profile Picture URL</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="https://example.com/image.png" {...field} className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={profileForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input {...field} disabled={user.role !== 'admin'} />
                        </FormControl>
                        {user.role !== 'admin' && <p className="text-xs text-muted-foreground">Email address cannot be changed.</p>}
                        <FormMessage />
                    </FormItem>
                )}
                />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your login password.</CardDescription>
        </CardHeader>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                  {passwordForm.formState.isSubmitting ? "Updating..." : "Update Password"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}


export default function ProfilePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProfilePageContent />
        </Suspense>
    )
}
