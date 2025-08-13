
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getStudents, updateUserStatus, adminUpdatePassword, UserOutput } from "@/ai/flows/user-flow";
import { MoreHorizontal, Ban, MicOff, Lock, KeyRound, ShieldCheck, UserCheck, Mic, LockOpen, CheckCircle } from "lucide-react";

type Student = UserOutput;

const passwordFormSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function ManageStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const { toast } = useToast();

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function fetchStudents() {
    try {
      setLoading(true);
      const fetchedStudents = await getStudents();
      setStudents(fetchedStudents);
    } catch (error) {
      console.error("Failed to fetch students:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch students." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleStatusChange = async (userId: string, status: Student['status']) => {
    try {
      await updateUserStatus({ userId, status: status! });
      toast({ title: "Status Updated", description: `User status has been changed to ${status}.` });
      fetchStudents(); // Refresh list
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    }
  };

  const handlePasswordUpdate = async (values: PasswordFormValues) => {
    if (!selectedStudent) return;
    try {
      await adminUpdatePassword({ userId: selectedStudent.id, newPassword: values.newPassword });
      toast({ title: "Password Changed", description: `Password for ${selectedStudent.username} has been updated.` });
      setIsPasswordDialogOpen(false);
      passwordForm.reset();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    }
  };
  
  const getStatusBadge = (status: Student['status']) => {
    switch (status) {
      case 'banned': return <Badge variant="destructive">Banned</Badge>;
      case 'muted': return <Badge variant="secondary" className="bg-yellow-500 text-black hover:bg-yellow-600">Muted</Badge>;
      case 'locked': return <Badge className="bg-orange-500 hover:bg-orange-600">Locked</Badge>;
      default: return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Students</CardTitle>
        <CardDescription>View all registered students and manage their accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading students...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={student.profile_pic_url} alt={student.username} />
                        <AvatarFallback>{student.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {student.username}
                    </div>
                  </TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{getStatusBadge(student.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                         {student.status === 'banned' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'active')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                <span>Unban</span>
                            </DropdownMenuItem>
                        )}
                         {student.status === 'muted' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'active')}>
                                <Mic className="mr-2 h-4 w-4" />
                                <span>Unmute</span>
                            </DropdownMenuItem>
                        )}
                         {student.status === 'locked' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'active')}>
                                <LockOpen className="mr-2 h-4 w-4" />
                                <span>Unlock</span>
                            </DropdownMenuItem>
                        )}
                        
                        {student.status === 'active' && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Restrict</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'muted')}>
                                  <MicOff className="mr-2 h-4 w-4" />
                                  <span>Mute</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'locked')}>
                                  <Lock className="mr-2 h-4 w-4" />
                                  <span>Lock</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'banned')} className="text-destructive focus:text-destructive">
                                  <Ban className="mr-2 h-4 w-4" />
                                  <span>Ban</span>
                                </DropdownMenuItem>
                            </>
                        )}

                        <DropdownMenuSeparator />
                         <DropdownMenuItem onClick={() => {
                          setSelectedStudent(student);
                          passwordForm.reset();
                          setIsPasswordDialogOpen(true);
                        }}>
                          <KeyRound className="mr-2 h-4 w-4" />
                          <span>Change Password</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password for {selectedStudent?.username}</DialogTitle>
            <DialogDescription>
              Enter a new password for the user. They will not be notified of this change.
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)} className="space-y-4 py-4">
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
              <DialogFooter>
                <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                  {passwordForm.formState.isSubmitting ? "Updating..." : "Update Password"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
