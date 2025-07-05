
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, addDoc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const postSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty.'),
});

interface Member {
  uid: string;
  name: string;
  role: 'teacher' | 'student';
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: any; // Firestore timestamp
}

export default function ClassroomDetailPage({ params }: { params: { id: string } }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [classroom, setClassroom] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const feedRef = useRef<HTMLDivElement>(null);

  const form = useForm({
    resolver: zodResolver(postSchema),
    defaultValues: { message: '' },
  });

  const fetchClassroomData = useCallback(async () => {
    if (!db || !user) return;
    setLoading(true);
    try {
      const classroomRef = doc(db, 'classrooms', params.id);
      const classroomSnap = await getDoc(classroomRef);

      if (!classroomSnap.exists()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Classroom not found.' });
        return;
      }
      const classroomData = classroomSnap.data();
      setClassroom(classroomData);

      const teacherIds: string[] = classroomData.teacherIds || [];
      const studentIds: string[] = classroomData.studentIds || [];
      
      const memberPromises = [
        ...teacherIds.map(id => getDoc(doc(db, 'teachers', id)).then(d => d.exists() ? ({ ...(d.data() as object), role: 'teacher' } as Member) : null)),
        ...studentIds.map(id => getDoc(doc(db, 'students', id)).then(d => d.exists() ? ({ ...(d.data() as object), role: 'student' } as Member) : null))
      ];

      const resolvedMembers = await Promise.all(memberPromises);
      setMembers(resolvedMembers.filter((m): m is Member => m !== null));

    } catch (error: any) {
      console.error("Error fetching classroom data:", error);
      let description = 'Could not load classroom data.';
      if (error.code === 'permission-denied') {
          description = "You don't have permission to view classroom members. This is often fixed by updating Firestore security rules in your Firebase Console.";
      }
      toast({ variant: 'destructive', title: 'Data Loading Error', description, duration: 9000 });
    } finally {
      setLoading(false);
    }
  }, [params.id, toast, user]);

  useEffect(() => {
      if(!authLoading && user){
          fetchClassroomData();
      }
  }, [authLoading, user, fetchClassroomData]);
  
  useEffect(() => {
    if(!db) return;
    const postsQuery = query(collection(db, 'classrooms', params.id, 'posts'), orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => {
      const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(postsData);
    }, (error) => {
        console.error("Error fetching posts:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load classroom posts in real-time.' });
    });

    return () => unsubscribe();
  }, [params.id, toast]);

  useEffect(() => {
    feedRef.current?.scrollTo(0, feedRef.current.scrollHeight);
  }, [posts]);

  const handlePostMessage = async (values: { message: string }) => {
    if (!user || !profile || profile.role !== 'teacher' || !db) return;

    try {
      await addDoc(collection(db, 'classrooms', params.id, 'posts'), {
        authorId: user.uid,
        authorName: profile.name,
        content: values.message,
        createdAt: serverTimestamp(),
      });
      form.reset();
    } catch (error) {
      console.error("Error posting message:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not post message.' });
    }
  };
  
  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-full"><LoadingSpinner className="h-12 w-12" /></div>;
  }
  
  if (!classroom) {
     return <div className="flex items-center justify-center h-full"><p>Classroom not found.</p></div>;
  }

  const teachers = members.filter(m => m.role === 'teacher');
  const students = members.filter(m => m.role === 'student');

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-4 border-b md:hidden">
        <h1 className="font-headline text-xl font-bold text-primary truncate">Grade {classroom.grade} - Section {classroom.section}</h1>
        <SidebarTrigger />
      </header>
      <div className="flex-1 p-4 md:p-8 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          <div className="lg:col-span-2 flex flex-col h-full">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Classroom Feed</CardTitle>
                <CardDescription>Updates and messages from your teachers.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pr-4" ref={feedRef}>
                <div className="space-y-6">
                  {posts.map(post => (
                    <div key={post.id} className="flex items-start gap-4">
                      <Avatar>
                        <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <p className="font-semibold">{post.authorName}</p>
                           <p className="text-xs text-muted-foreground">
                                {post.createdAt ? new Date(post.createdAt?.toDate()).toLocaleString() : 'sending...'}
                           </p>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                      </div>
                    </div>
                  ))}
                  {posts.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">No posts in this classroom yet.</div>
                  )}
                </div>
              </CardContent>
              {profile?.role === 'teacher' && (
                <CardFooter className="pt-4 border-t">
                  <form onSubmit={form.handleSubmit(handlePostMessage)} className="w-full flex items-center gap-2">
                      <Textarea {...form.register('message')} placeholder="Type your message..." className="flex-1" rows={1}/>
                      <Button type="submit" size="icon" disabled={form.formState.isSubmitting}>
                        <Send className="h-4 w-4"/>
                      </Button>
                  </form>
                </CardFooter>
              )}
            </Card>
          </div>
          <div className="lg:col-span-1 h-full flex flex-col">
             <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader>
                    <CardTitle className="font-headline">Members</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                    <Accordion type="multiple" defaultValue={['teachers', 'students']} className="w-full">
                      <AccordionItem value="teachers">
                        <AccordionTrigger className="font-semibold">Teachers ({teachers.length})</AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-2 pt-2">
                            {teachers.map(t => <li key={t.uid} className="text-sm pl-2">{t.name}</li>)}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="students" className="border-b-0">
                        <AccordionTrigger className="font-semibold">Students ({students.length})</AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-2 pt-2 max-h-96 overflow-y-auto">
                            {students.map(s => <li key={s.uid} className="text-sm pl-2">{s.name}</li>)}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
