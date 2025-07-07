'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sheet } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Skeleton } from '@/components/ui/skeleton';

interface Worksheet {
    id: string;
    gradeLevel: string;
    worksheetContent: string;
    authorName: string;
    createdAt: any;
}

const WorksheetSkeleton = () => (
    <div className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
            <Skeleton className="h-9 w-24 mb-4 -ml-4" />
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                        <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2 mt-1 w-full">
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-5 w-1/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="pt-4 space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
);


export default function WorksheetViewerPage() {
    const params = useParams();
    const worksheetId = params.id as string;
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading || !user || !db) return;
        
        if (!worksheetId) {
            setLoading(false);
            return;
        }

        const fetchWorksheet = async () => {
            setLoading(true);
            try {
                const worksheetRef = doc(db, 'worksheets', worksheetId);
                const worksheetSnap = await getDoc(worksheetRef);

                if (worksheetSnap.exists()) {
                    setWorksheet({ id: worksheetSnap.id, ...worksheetSnap.data() } as Worksheet);
                } else {
                    console.log('No such document!');
                }
            } catch (error) {
                console.error("Error fetching worksheet:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWorksheet();
    }, [worksheetId, user, authLoading]);

    if (authLoading || loading) {
        return <WorksheetSkeleton />;
    }
    
    if (!worksheet) {
        return (
             <div className="flex-1 p-4 md:p-8 overflow-auto">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-xl text-muted-foreground mt-20">Worksheet not found.</p>
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
                                 <Sheet className="h-6 w-6 text-primary" />
                             </div>
                             <div className="flex-1">
                                <CardTitle className="font-headline text-3xl">Differentiated Worksheet</CardTitle>
                                <CardDescription className="text-md mt-1">
                                    Grade: {worksheet.gradeLevel}
                                </CardDescription>
                                <CardDescription className="text-xs mt-2">
                                    Shared by {worksheet.authorName} on {new Date(worksheet.createdAt?.toDate()).toLocaleDateString()}
                                </CardDescription>
                             </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{worksheet.worksheetContent}</ReactMarkdown>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
