
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Users, UserPlus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';

const studentGenerationSchema = z.object({
  grade: z.string().min(1, 'Grade is required.'),
  section: z.string().min(1, 'Section is required.'),
  count: z.coerce.number().min(1, 'Must generate at least 1 student.').max(100, 'Cannot generate more than 100 students at a time.'),
});

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

  useEffect(() => {
    if (!isDevMode || (profile && profile.role !== 'teacher')) {
      router.replace('/lesson-planner');
    }
  }, [isDevMode, router, profile]);

  const studentForm = useForm<z.infer<typeof studentGenerationSchema>>({
    resolver: zodResolver(studentGenerationSchema),
    defaultValues: {
      grade: '5',
      section: 'A',
      count: 10,
    },
  });

  async function onStudentSubmit(values: z.infer<typeof studentGenerationSchema>) {
    setIsGenerating(true);
    setProgress(0);
    setGenerationLog([]);
    let createdCount = 0;

    for (let i = 1; i <= values.count; i++) {
      const email = `student${i}@example.com`;
      const password = `student${i}`;
      const log = (message: string) => setGenerationLog(prev => [...prev, message]);

      try {
        log(`Creating user ${i}/${values.count}: ${email}...`);
        
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
        };

        await setDoc(doc(db, 'students', user.uid), studentData);

        await deleteApp(tempApp);
        
        log(`Successfully created ${email} with roll number ${i}.`);
        createdCount++;
      } catch (error: any) {
        console.error(`Failed to create student ${i}:`, error);
        log(`Error creating ${email}: ${error.message}`);
        toast({
          variant: 'destructive',
          title: `Generation Failed at Student ${i}`,
          description: `Error: ${error.message}. Check logs for details.`,
          duration: 9000
        });
        setIsGenerating(false);
        return;
      } finally {
        setProgress(((i) / values.count) * 100);
      }
    }

    toast({
      title: 'Generation Complete',
      description: `Successfully created ${createdCount} out of ${values.count} student accounts.`,
    });
    setIsGenerating(false);
  }

  if (!isDevMode || (profile && profile.role !== 'teacher')) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="m-4">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to view this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
        <header className="flex items-center justify-between p-4 border-b md:hidden">
            <h1 className="font-headline text-xl font-bold text-primary">Admin Panel</h1>
            <SidebarTrigger />
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
                                        <FormControl><Input placeholder="e.g., 5" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={studentForm.control} name="section" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Section</FormLabel>
                                        <FormControl><Input placeholder="e.g., B" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <FormField control={studentForm.control} name="count" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Students</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 20" {...field} /></FormControl>
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

                <Card className="opacity-50 pointer-events-none">
                    <CardHeader>
                         <div className="flex items-center gap-4">
                            <UserPlus className="h-8 w-8 text-muted-foreground" />
                            <div>
                                <CardTitle className="font-headline text-2xl">Generate Teacher Accounts</CardTitle>
                                <CardDescription>Bulk-create teacher users. (Coming soon)</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground text-center py-8">This feature is not yet implemented.</p>
                    </CardContent>
                </Card>
            </div>
           
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
