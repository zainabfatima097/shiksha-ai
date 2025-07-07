
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateLessonPlan, LessonPlanHistoryItem, LessonPlanInput } from '@/ai/flows/ai-lesson-planner';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SidebarTrigger } from '@/components/ui/sidebar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Download, BookText, Share2, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";


const lessonPlannerSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().min(1, 'Topic is required'),
  gradeLevel: z.string().min(1, 'Grade level is required'),
  learningObjectives: z.string().min(1, 'Learning objectives are required'),
  localLanguage: z.string().min(1, 'Language is required'),
  additionalDetails: z.string().optional(),
});

type LessonPlannerFormValues = z.infer<typeof lessonPlannerSchema>;

export default function LessonPlannerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [lessonPlan, setLessonPlan] = useState('');
  const [editedLessonPlan, setEditedLessonPlan] = useState('');
  const [history, setHistory] = useState<LessonPlanHistoryItem[]>([]);
  const { toast } = useToast();
  const { user, profile, loading: authLoading, classrooms } = useAuth();
  const lessonPlanRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const [isSharing, setIsSharing] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState('');


  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'teacher') {
        router.replace('/profile');
    }
  }, [authLoading, profile, router]);

  const form = useForm<LessonPlannerFormValues>({
    resolver: zodResolver(lessonPlannerSchema),
    defaultValues: {
      subject: '',
      topic: '',
      gradeLevel: '',
      learningObjectives: '',
      localLanguage: 'English',
      additionalDetails: '',
    },
  });

  const fetchHistory = useCallback(async (uid: string) => {
    if (!db) {
        console.error("Firestore is not initialized. Cannot fetch history.");
        return;
    }
    setIsHistoryLoading(true);
    try {
        const historyRef = collection(db, 'teachers', uid, 'lessonHistory');
        const q = query(historyRef, orderBy('createdAt', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);

        const historyData: LessonPlanHistoryItem[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.subject && data.topic && data.gradeLevel && data.learningObjectives && data.localLanguage) {
                historyData.push({
                    subject: data.subject,
                    topic: data.topic,
                    gradeLevel: data.gradeLevel,
                    learningObjectives: data.learningObjectives,
                    localLanguage: data.localLanguage,
                    additionalDetails: data.additionalDetails || '',
                    weeklyPlan: data.weeklyPlan || '',
                });
            }
        });
        setHistory(historyData);
    } catch (error: any) {
        console.error("Failed to fetch history from database", error);
        let description = 'Could not load your recent plans. An unknown error occurred.';
         if (error.code === 'failed-precondition') {
            description = `A Firestore index is required. Please create it in your Firebase console. The error was: "${error.message}"`;
        } else if (error.code === 'permission-denied') {
            description = 'Permission denied. Please check your Firestore security rules to ensure you can read from the "lessonHistory" collection.';
        }
        toast({ 
            variant: 'destructive', 
            title: 'Error Loading History', 
            description: description,
            duration: 9000,
        });
    } finally {
        setIsHistoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user && profile?.role === 'teacher') {
      fetchHistory(user.uid);
    } else if (!authLoading) {
      setIsHistoryLoading(false);
    }
  }, [user, profile, authLoading, fetchHistory]);


  async function onSubmit(values: LessonPlannerFormValues) {
    if (!user || !db) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be signed in to generate a lesson plan."
      });
      return;
    }

    setIsLoading(true);
    setLessonPlan('');
    setIsEditing(false);
    try {
      const result = await generateLessonPlan(values);
      setLessonPlan(result.weeklyPlan);

      try {
        const historyRef = collection(db, 'teachers', user.uid, 'lessonHistory');
        await addDoc(historyRef, {
            ...values,
            weeklyPlan: result.weeklyPlan,
            createdAt: serverTimestamp()
        });
        await fetchHistory(user.uid);
      } catch (historyError: any) {
        console.error("Failed to save lesson plan history:", historyError);
        toast({
            variant: 'destructive',
            title: 'Could Not Save History',
            description: `An error occurred while saving: ${historyError.message}. Please check your Firestore security rules.`,
            duration: 9000,
        });
      }

    } catch (error) {
      console.error('Error generating lesson plan:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate lesson plan. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleHistoryClick = (item: LessonPlanHistoryItem) => {
    form.reset(item);
    setLessonPlan(item.weeklyPlan || '');
    setIsEditing(false);
  };
  
  const handleSaveEdit = async () => {
    if (!user || !db) return;
    setIsLoading(true);
    try {
        const values = form.getValues();
        const historyData = {
            ...values,
            weeklyPlan: editedLessonPlan,
            createdAt: serverTimestamp()
        };
        const historyRef = collection(db, 'teachers', user.uid, 'lessonHistory');
        await addDoc(historyRef, historyData);
        
        setLessonPlan(editedLessonPlan);
        await fetchHistory(user.uid);
        toast({ title: "Success", description: "Lesson plan updated and saved to history." });
    } catch (error) {
        console.error("Error saving edited lesson plan:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save your changes.' });
    } finally {
        setIsLoading(false);
        setIsEditing(false);
    }
  }

  const handleExportToPdf = () => {
    const input = lessonPlanRef.current;
    if (!input) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not find the lesson plan content to export.',
      });
      return;
    }

    setIsPdfLoading(true);
    html2canvas(input, { scale: 2, useCORS: true })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;
        
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        
        pdf.addImage(
          imgData,
          'PNG',
          imgX,
          0,
          imgWidth * ratio,
          imgHeight * ratio
        );
        pdf.save('lesson-plan.pdf');
      })
      .catch((error) => {
        console.error('Error generating PDF:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to export lesson plan as PDF. Please try again.',
        });
      })
      .finally(() => {
        setIsPdfLoading(false);
      });
  };

  const handleShare = async () => {
    if (!user || !profile || !selectedClassroom || !lessonPlan) {
      toast({
        variant: "destructive",
        title: "Sharing Error",
        description: "Missing user, classroom, or lesson plan information."
      });
      return;
    }

    setIsSharing(true);
    try {
      const lessonPlanData = {
        authorId: user.uid,
        authorName: profile.name,
        createdAt: serverTimestamp(),
        subject: form.getValues('subject'),
        topic: form.getValues('topic'),
        gradeLevel: form.getValues('gradeLevel'),
        weeklyPlan: lessonPlan,
      };
      const lessonPlanRef = await addDoc(collection(db, 'lessonPlans'), lessonPlanData);

      const postData = {
        authorId: user.uid,
        authorName: profile.name,
        createdAt: serverTimestamp(),
        type: 'lessonPlan',
        lessonPlanId: lessonPlanRef.id,
        topic: form.getValues('topic'),
        subject: form.getValues('subject'),
      };

      await addDoc(collection(db, 'classrooms', selectedClassroom, 'posts'), postData);
      
      const classroom = classrooms.find(c => c.id === selectedClassroom);
      toast({
        title: 'Success',
        description: `Lesson plan shared with Grade ${classroom?.grade} - Section ${classroom?.section}.`,
      });
      setIsShareDialogOpen(false);
      setSelectedClassroom('');

    } catch (error) {
      console.error("Error sharing lesson plan:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not share the lesson plan. Please try again.',
      });
    } finally {
      setIsSharing(false);
    }
  };

  if (authLoading || !profile || profile.role !== 'teacher') {
    return (
        <div className="flex items-center justify-center h-full">
            <LoadingSpinner className="h-12 w-12" />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
       <header className="flex items-center justify-between p-4 border-b md:hidden">
            <h1 className="font-headline text-xl font-bold text-primary">Lesson Planner</h1>
            <SidebarTrigger />
        </header>
      <div className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-headline mb-4 text-primary">Recent Plans</h2>
                {isHistoryLoading ? (
                    <div className="flex space-x-4">
                    <Skeleton className="h-28 flex-1 rounded-lg" />
                    <Skeleton className="h-28 flex-1 rounded-lg md:block hidden" />
                    <Skeleton className="h-28 flex-1 rounded-lg lg:block hidden" />
                    </div>
                ) : history.length > 0 ? (
                <Carousel opts={{ align: "start", loop: false, dragFree: true }} className="w-full">
                    <CarouselContent className="-ml-2">
                    {history.map((item, index) => (
                        <CarouselItem key={index} className="pl-2 md:basis-1/2 lg:basis-1/3">
                        <div className="p-1">
                            <Card
                            className="bg-primary/10 hover:bg-primary/20 cursor-pointer transition-colors h-full"
                            onClick={() => handleHistoryClick(item)}
                            >
                            <CardHeader>
                                <CardTitle className="text-lg font-bold truncate" title={item.topic}>{item.topic}</CardTitle>
                                <CardDescription>{item.gradeLevel} &middot; {item.subject}</CardDescription>
                            </CardHeader>
                            </Card>
                        </div>
                        </CarouselItem>
                    ))}
                    </CarouselContent>
                </Carousel>
                ) : (
                    <Card className="bg-secondary/50 border-dashed">
                        <CardContent className="p-6">
                            <p className="text-center text-muted-foreground">You have no recent lesson plans. Generate one below to get started!</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8 items-start">
              <Card className="lg:col-span-1">
                  <CardHeader>
                  <CardTitle className="font-headline text-2xl">AI Lesson Planner</CardTitle>
                  <CardDescription>Generate a detailed weekly lesson plan for your class.</CardDescription>
                  </CardHeader>
                  <CardContent>
                  <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                          control={form.control}
                          name="subject"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Subject</FormLabel>
                              <FormControl>
                                  <Input placeholder="e.g., Science" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                          <FormField
                          control={form.control}
                          name="topic"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Topic</FormLabel>
                              <FormControl>
                                  <Input placeholder="e.g., The Water Cycle" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                          <FormField
                          control={form.control}
                          name="gradeLevel"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Grade Level</FormLabel>
                              <FormControl>
                                  <Input placeholder="e.g., 4th Grade" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                          <FormField
                          control={form.control}
                          name="localLanguage"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Language</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Select a language" />
                                  </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                  <SelectItem value="English">English</SelectItem>
                                  <SelectItem value="Hindi">Hindi</SelectItem>
                                  <SelectItem value="Marathi">Marathi</SelectItem>
                                  <SelectItem value="Bengali">Bengali</SelectItem>
                                  <SelectItem value="Tamil">Tamil</SelectItem>
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                      </div>
                      <FormField
                          control={form.control}
                          name="learningObjectives"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Learning Objectives</FormLabel>
                              <FormControl>
                              <Textarea placeholder="e.g., Students will be able to describe the stages of the water cycle." {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="additionalDetails"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Additional Details (Optional)</FormLabel>
                              <FormControl>
                              <Textarea placeholder="e.g., Focus on local examples of water sources." {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <Button type="submit" disabled={isLoading}>
                          {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
                          Generate Plan
                      </Button>
                      </form>
                  </Form>
                  </CardContent>
              </Card>

              <div className="lg:col-span-1 lg:sticky lg:top-8 self-start mt-8 lg:mt-0">
                  {isLoading && !lessonPlan && (
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                              <Skeleton className="h-6 w-1/2" />
                              <Skeleton className="h-8 w-8 rounded-full" />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-full mt-4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </CardContent>
                      </Card>
                  )}
                  {!isLoading && lessonPlan && (
                      <div ref={lessonPlanRef}>
                        <Card className="w-full bg-secondary/50 max-h-[calc(100vh-8rem)] overflow-y-auto">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="font-headline text-xl">Your Weekly Lesson Plan</CardTitle>
                                    <div className="flex items-center gap-1">
                                    {isEditing ? (
                                        <>
                                            <Button variant="default" size="sm" onClick={handleSaveEdit} disabled={isLoading}>
                                                {isLoading && <LoadingSpinner className="mr-2 h-4 w-4" />}
                                                Save
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isLoading}>Cancel</Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button variant="ghost" size="icon" onClick={() => { setIsEditing(true); setEditedLessonPlan(lessonPlan); }} aria-label="Edit Plan" title="Edit Plan">
                                                <Edit className="h-5 w-5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={handleExportToPdf}
                                                disabled={isPdfLoading}
                                                aria-label="Export to PDF"
                                                title="Export to PDF"
                                            >
                                                {isPdfLoading ? <LoadingSpinner className="h-5 w-5"/> : <Download className="h-5 w-5" />}
                                            </Button>

                                            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        disabled={!lessonPlan || classrooms.length === 0} 
                                                        aria-label="Share to classroom" 
                                                        title="Share to classroom"
                                                    >
                                                        <Share2 className="h-5 w-5" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Share Lesson Plan</DialogTitle>
                                                        <DialogDescription>
                                                            Select a classroom to post this lesson plan to their feed.
                                                            {classrooms.length === 0 && <span className="text-destructive block mt-2">You have not joined any classrooms.</span>}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-4">
                                                        <Select onValueChange={setSelectedClassroom} defaultValue={selectedClassroom}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a classroom..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {classrooms.map(c => (
                                                                    <SelectItem key={c.id} value={c.id}>
                                                                        Grade {c.grade} - Section {c.section}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>Cancel</Button>
                                                        <Button onClick={handleShare} disabled={!selectedClassroom || isSharing}>
                                                            {isSharing && <LoadingSpinner className="mr-2 h-4 w-4" />}
                                                            Share
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </>
                                    )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isEditing ? (
                                    <Textarea 
                                        value={editedLessonPlan}
                                        onChange={(e) => setEditedLessonPlan(e.target.value)}
                                        rows={25}
                                        className="font-mono text-sm"
                                        disabled={isLoading}
                                    />
                                ) : (
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{lessonPlan}</ReactMarkdown>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                      </div>
                  )}
                  {!isLoading && !lessonPlan && (
                      <Card className="flex items-center justify-center h-96 border-dashed bg-secondary/20">
                          <CardContent className="text-center text-muted-foreground p-6">
                              <BookText className="mx-auto h-12 w-12" />
                              <p className="mt-4 font-medium">Your generated lesson plan will appear here.</p>
                              <p className="text-sm">Fill out the form to the left to get started.</p>
                          </CardContent>
                      </Card>
                  )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
