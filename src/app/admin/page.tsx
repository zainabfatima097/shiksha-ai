
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db, firebaseConfig } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Users, UserPlus, ArrowLeft, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const studentGenerationSchema = z.object({
  grade: z.string().min(1, 'Grade is required.'),
  section: z.string().min(1, 'Section is required.'),
  count: z.coerce.number().min(1, 'Must generate at least 1 student.').max(100, 'Cannot generate more than 100 students at a time.'),
});

const teacherGenerationSchema = z.object({
  count: z.coerce.number().min(1, 'Must generate at least 1 teacher.').max(100, 'Cannot generate more than 100 teachers at a time.'),
});

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

  useEffect(() => {
    if (!isDevMode) {
      router.replace('/login');
    }
  }, [isDevMode, router]);

  const studentForm = useForm<z.infer<typeof studentGenerationSchema>>({
    resolver: zodResolver(studentGenerationSchema),
    defaultValues: {
      grade: '5',
      section: 'A',
      count: 10,
    },
  });

  const teacherForm = useForm<z.infer<typeof teacherGenerationSchema>>({
    resolver: zodResolver(teacherGenerationSchema),
    defaultValues: {
      count: 5,
    },
  });

  const startGeneration = () => {
    setIsGenerating(true);
    setProgress(0);
    setGenerationLog([]);
  }

  const endGeneration = (createdCount: number, totalCount: number, userType: string) => {
    toast({
      title: 'Generation Complete',
      description: `Successfully created ${createdCount} out of ${totalCount} ${userType} accounts.`,
    });
    setIsGenerating(false);
  }

  const handleGenerationError = (error: any, index: number, email: string) => {
    console.error(`Failed to create user ${index}:`, error);
    setGenerationLog(prev => [...prev, `Error creating ${email}: ${error.message}`]);
    toast({
      variant: 'destructive',
      title: `Generation Failed at User ${index}`,
      description: `Error: ${error.message}. Check logs for details.`,
      duration: 9000
    });
    setIsGenerating(false);
  }

  async function onStudentSubmit(values: z.infer<typeof studentGenerationSchema>) {
    startGeneration();
    let createdCount = 0;

    for (let i = 1; i <= values.count; i++) {
      const email = `student${i + Date.now()}@example.com`;
      const password = `student${i}`;
      const log = (message: string) => setGenerationLog(prev => [...prev, message]);

      try {
        log(`Creating student ${i}/${values.count}: ${email}...`);
        
        const tempAppName = `student-creator-${Date.now()}-${i}`;
        const tempApp = initializeApp(firebaseConfig, tempAppName);
        const tempAuth = getAuth(tempApp);

        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
        const user = userCredential.user;

        const studentData = {
          uid: user.uid,
          email,
          name: `Student ${i}`,
          role: 'student',
          class: values.grade,
          section: values.section,
          rollNumber: String(i),
          dev_generated: true,
        };

        await setDoc(doc(db, 'students', user.uid), studentData);
        await deleteApp(tempApp);
        
        log(`Successfully created ${email} with roll number ${i}.`);
        createdCount++;
      } catch (error: any) {
        handleGenerationError(error, i, email);
        return;
      } finally {
        setProgress(((i) / values.count) * 100);
      }
    }
    endGeneration(createdCount, values.count, 'student');
  }

  async function onTeacherSubmit(values: z.infer<typeof teacherGenerationSchema>) {
    startGeneration();
    let createdCount = 0;

    for (let i = 1; i <= values.count; i++) {
      const email = `teacher${i + Date.now()}@example.com`;
      const password = `teacher${i}`;
      const log = (message: string) => setGenerationLog(prev => [...prev, message]);

      try {
        log(`Creating teacher ${i}/${values.count}: ${email}...`);
        
        const tempAppName = `teacher-creator-${Date.now()}-${i}`;
        const tempApp = initializeApp(firebaseConfig, tempAppName);
        const tempAuth = getAuth(tempApp);

        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
        const user = userCredential.user;

        const teacherData = {
          uid: user.uid,
          email,
          name: `Teacher ${i}`,
          role: 'teacher',
          dev_generated: true,
        };

        await setDoc(doc(db, 'teachers', user.uid), teacherData);
        await deleteApp(tempApp);
        
        log(`Successfully created ${email}.`);
        createdCount++;
      } catch (error: any) {
        handleGenerationError(error, i, email);
        return;
      } finally {
        setProgress(((i) / values.count) * 100);
      }
    }
    endGeneration(createdCount, values.count, 'teacher');
  }

  async function handleMassDelete() {
    setIsDeleting(true);
    try {
        const studentsQuery = query(collection(db, 'students'), where('dev_generated', '==', true));
        const teachersQuery = query(collection(db, 'teachers'), where('dev_generated', '==', true));

        const [studentSnap, teacherSnap] = await Promise.all([
            getDocs(studentsQuery),
            getDocs(teachersQuery)
        ]);

        if (studentSnap.empty && teacherSnap.empty) {
            toast({
                title: 'No Users to Delete',
                description: 'No developer-generated users were found in Firestore.',
            });
            setIsDeleting(false);
            return;
        }

        const batch = writeBatch(db);
        studentSnap.forEach(doc => batch.delete(doc.ref));
        teacherSnap.forEach(doc => batch.delete(doc.ref));

        await batch.commit();

        toast({
            title: 'Deletion Complete',
            description: `Deleted ${studentSnap.size} student and ${teacherSnap.size} teacher profiles from Firestore.`
        });
    } catch (error: any) {
        console.error("Mass delete error:", error);
        let description = 'An unknown error occurred during deletion.';
        if (error.code === 'failed-precondition') {
            description = 'Firestore needs an index for this query. Please check the browser console for a link to create it, then try again.';
        } else if (error.code === 'permission-denied') {
            description = 'Permission denied. Please check your Firestore security rules.';
        } else {
            description = error.message;
        }
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description,
            duration: 9000,
        });
    } finally {
        setIsDeleting(false);
    }
  }

  if (!isDevMode) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Card className="m-4">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>This page is only available in development mode.</CardDescription>
          </CardHeader>
            <CardContent>
                <Link href="/login" passHref>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                    </Button>
                </Link>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
        <header className="flex items-center justify-between p-4 border-b">
            <h1 className="font-headline text-xl font-bold text-primary">Admin Panel</h1>
             <Link href="/login" passHref>
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                </Button>
            </Link>
        </header>
        <div className="flex-1 p-4 md:p-8 overflow-auto">
            <Alert variant="destructive" className="mb-8">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Development Mode Active</AlertTitle>
                <AlertDescription>
                This admin panel is for development and testing only. Do not use in a production environment.
                </AlertDescription>
            </Alert>

            <div className="grid gap-8 lg:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Users className="h-8 w-8 text-primary" />
                            <div>
                                <CardTitle className="font-headline text-2xl">Generate Student Accounts</CardTitle>
                                <CardDescription>Bulk-create student users for a specific grade and section.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Form {...studentForm}>
                        <form onSubmit={studentForm.handleSubmit(onStudentSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={studentForm.control} name="grade" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Grade</FormLabel>
                                        <FormControl><Input placeholder="e.g., 5" {...field} disabled={isGenerating} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={studentForm.control} name="section" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Section</FormLabel>
                                        <FormControl><Input placeholder="e.g., B" {...field} disabled={isGenerating} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <FormField control={studentForm.control} name="count" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Students</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 20" {...field} disabled={isGenerating} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <Button type="submit" disabled={isGenerating}>
                                {isGenerating ? <LoadingSpinner className="mr-2" /> : null}
                                Generate Students
                            </Button>
                        </form>
                        </Form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                         <div className="flex items-center gap-4">
                            <UserPlus className="h-8 w-8 text-primary" />
                            <div>
                                <CardTitle className="font-headline text-2xl">Generate Teacher Accounts</CardTitle>
                                <CardDescription>Bulk-create teacher users.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                      <Form {...teacherForm}>
                        <form onSubmit={teacherForm.handleSubmit(onTeacherSubmit)} className="space-y-6">
                          <FormField control={teacherForm.control} name="count" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Teachers</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 5" {...field} disabled={isGenerating} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <Button type="submit" disabled={isGenerating}>
                                {isGenerating ? <LoadingSpinner className="mr-2" /> : null}
                                Generate Teachers
                            </Button>
                        </form>
                      </Form>
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-8">
                <CardHeader>
                     <div className="flex items-center gap-4">
                        <Trash2 className="h-8 w-8 text-destructive" />
                        <div>
                            <CardTitle className="font-headline text-2xl">Mass Delete Users</CardTitle>
                            <CardDescription>Delete all developer-generated users from Firestore.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Heads up!</AlertTitle>
                        <AlertDescription>
                          This action only deletes user profiles from the Firestore database. It does not delete the user accounts from Firebase Authentication, which must be done manually in the Firebase Console.
                        </AlertDescription>
                    </Alert>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="mt-4" disabled={isDeleting}>
                            {isDeleting ? <LoadingSpinner className="mr-2" /> : <Trash2 />}
                            Mass Delete Generated Users
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all Firestore documents for users with the 'dev_generated' flag.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleMassDelete} className="bg-destructive hover:bg-destructive/90">
                            Yes, delete them
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
           
            {isGenerating || generationLog.length > 0 ? (
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Generation Log</CardTitle>
                        {isGenerating && <Progress value={progress} className="mt-2" />}
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 overflow-y-auto rounded-md bg-muted p-4 font-mono text-xs">
                            {generationLog.map((log, index) => (
                                <p key={index}>{log}</p>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    </div>
  );
}
