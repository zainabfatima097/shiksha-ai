
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { ArrowLeft, BookText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LessonPlan {
    id: string;
    topic: string;
    subject: string;
    gradeLevel: string;
    weeklyPlan: string;
    authorName: string;
    createdAt: any;
}

export default function LessonPlanViewerPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading || !user || !db) return;
        
        const lessonPlanId = params.id as string;
        if (!lessonPlanId) {
            setLoading(false);
            return;
        }

        const fetchLessonPlan = async () => {
            setLoading(true);
            try {
                const lessonPlanRef = doc(db, 'lessonPlans', lessonPlanId);
                const lessonPlanSnap = await getDoc(lessonPlanRef);

                if (lessonPlanSnap.exists()) {
                    setLessonPlan({ id: lessonPlanSnap.id, ...lessonPlanSnap.data() } as LessonPlan);
                } else {
                    console.log('No such document!');
                }
            } catch (error) {
                console.error("Error fetching lesson plan:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLessonPlan();
    }, [params.id, user, authLoading]);

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <LoadingSpinner className="h-12 w-12" />
            </div>
        );
    }
    
    if (!lessonPlan) {
        return (
             <div className="flex-1 p-4 md:p-8 overflow-auto">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-xl text-muted-foreground mt-20">Lesson Plan not found.</p>
                    <Button variant="outline" onClick={() => router.back()} className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 md:p-8 overflow-auto">
            <div className="max-w-4xl mx-auto">
                 <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                             <div className="p-3 bg-primary/10 rounded-lg mb-4 sm:mb-0 w-min">
                                 <BookText className="h-6 w-6 text-primary" />
                             </div>
                             <div className="flex-1">
                                <CardTitle className="font-headline text-3xl">{lessonPlan.topic}</CardTitle>
                                <CardDescription className="text-md mt-1">
                                    Subject: {lessonPlan.subject} | Grade: {lessonPlan.gradeLevel}
                                </CardDescription>
                                <CardDescription className="text-xs mt-2">
                                    Shared by {lessonPlan.authorName} on {new Date(lessonPlan.createdAt?.toDate()).toLocaleDateString()}
                                </CardDescription>
                             </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>{lessonPlan.weeklyPlan}</ReactMarkdown>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
