'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink, Loader2, CheckCircle, XCircle, FileText, FolderOpen } from 'lucide-react';

interface WorkflowDetails {
  status: string;
  currentStep: string;
  completedSteps: string[];
  failedSteps: string[];
  errorMessage?: string;
}

interface ContentGenerationStatus {
  flyer?: string;
  social?: string;
  whatsapp?: string;
  calendar?: string;
  clickup?: string;
}

interface EventStatusResponse {
  eventId: string;
  workflow: WorkflowDetails | null;
  driveFolderUrl?: string;
  contentGenerationStatus?: ContentGenerationStatus | null;
}

const POLLING_INTERVAL = 5000; // 5 seconds

export default function EventCreationSuccessPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const [statusResponse, setStatusResponse] = useState<EventStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!eventId) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/status`);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage;
          try {
            const errorPayload = JSON.parse(errorText);
            errorMessage = errorPayload.error || errorPayload.message || `Request failed: ${response.status}`;
          } catch (e) {
            errorMessage = `Request failed with status ${response.status}. See console for details.`;
          }
          throw new Error(errorMessage);
        }

        const apiResponse = await response.json();
        if (!apiResponse.success) {
          throw new Error(apiResponse.message || 'API request failed');
        }
        
        const eventStatus: EventStatusResponse = apiResponse.data;
        setStatusResponse(eventStatus);
        setError(null);

        // Clear previous timeout before setting a new one
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
        }

        if (eventStatus.workflow?.status === 'PENDING' || eventStatus.workflow?.status === 'IN_PROGRESS') {
          pollingTimeoutRef.current = setTimeout(fetchStatus, POLLING_INTERVAL);
        }

      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
        console.error("Polling error:", err);
      }
    };

    fetchStatus();

    // Cleanup function
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [eventId]);

  const renderProgress = () => {
    if (!statusResponse?.workflow) {
      return <Progress value={10} className="w-full" />;
    }
    const { status, completedSteps } = statusResponse.workflow;
    const totalSteps = 7; // Matching the backend

    if (status === 'COMPLETED') {
       return (
        <div className="space-y-2">
          <Progress value={100} className="w-full" />
          <p className="text-sm text-muted-foreground">
            Status: {status}
          </p>
        </div>
      );
    }

    const stepsDone = Array.isArray(completedSteps) ? completedSteps.length : 0;
    let progressValue = (stepsDone / totalSteps) * 100;

    if (status === 'IN_PROGRESS') {
      progressValue = Math.max(10, progressValue);
    } else if (status === 'FAILED') {
      progressValue = Math.max(10, progressValue);
    } else {
      progressValue = Math.max(5, progressValue); // Default small progress
    }

    return (
      <div className="space-y-2">
        <Progress value={progressValue} className="w-full" />
        <p className="text-sm text-muted-foreground">
          Status: {status || 'Initializing...'}
        </p>
      </div>
    );
  };

  const renderContentGenerationStatus = () => {
    const contentStatus = statusResponse?.contentGenerationStatus;
    if (!contentStatus) return null;
    
    const { flyer, social, whatsapp, calendar, clickup } = contentStatus;

    const statusMap: { [key: string]: { icon: React.ReactNode, text: string } } = {
        PENDING: { icon: <Loader2 className="h-4 w-4 animate-spin mr-1" />, text: "Pending" },
        IN_PROGRESS: { icon: <Loader2 className="h-4 w-4 animate-spin mr-1" />, text: "In Progress" },
        COMPLETED: { icon: <CheckCircle className="h-4 w-4 text-green-500 mr-1" />, text: "Completed" },
        FAILED: { icon: <XCircle className="h-4 w-4 text-red-500 mr-1" />, text: "Failed" },
        SKIPPED: { icon: <FileText className="h-4 w-4 text-gray-500 mr-1" />, text: "Skipped" },
    };

    return (
        <div className="mt-4 pt-4 border-t">
            <h4 className="font-semibold mb-2">Asset Generation:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
                {flyer && <li className="flex items-center">{statusMap[flyer]?.icon || statusMap.PENDING.icon} Flyer: {statusMap[flyer]?.text || "Pending"}</li>}
                {social && <li className="flex items-center">{statusMap[social]?.icon || statusMap.PENDING.icon} Social Media: {statusMap[social]?.text || "Pending"}</li>}
                {whatsapp && <li className="flex items-center">{statusMap[whatsapp]?.icon || statusMap.PENDING.icon} WhatsApp: {statusMap[whatsapp]?.text || "Pending"}</li>}
                {calendar && <li className="flex items-center">{statusMap[calendar]?.icon || statusMap.PENDING.icon} Calendar Event: {statusMap[calendar]?.text || "Pending"}</li>}
                {clickup && <li className="flex items-center">{statusMap[clickup]?.icon || statusMap.PENDING.icon} Task Management: {statusMap[clickup]?.text || "Pending"}</li>}
            </ul>
        </div>
    );
  }

  if (!eventId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Missing Event ID</AlertTitle>
              <AlertDescription>Event ID is missing. Cannot display status.</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/dashboard/events')} className="w-full">Go to Dashboard</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>There was a problem fetching the event status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Request Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/dashboard/events')} className="w-full">Go to Dashboard</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!statusResponse) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading event status...</p>
      </div>
    );
  }

  const isCompleted = statusResponse.workflow?.status === 'COMPLETED';
  const isFailed = statusResponse.workflow?.status === 'FAILED';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-background p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          {isCompleted && <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />}
          {isFailed && <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />}
          {!(isCompleted || isFailed) && <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />}
          
          <CardTitle className="text-3xl font-bold">
            {isCompleted ? 'Event Materials Ready!' :
             isFailed ? 'Event Creation Failed' :
             'Generating Your Event...'}
          </CardTitle>
          <CardDescription className="text-lg">
            {isCompleted ? 'All your event materials have been generated and saved.' :
             isFailed ? statusResponse.workflow?.errorMessage || 'An unexpected error occurred during event generation.' :
             'Our AI is working on creating your event assets. Please wait a moment.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isCompleted && !isFailed && renderProgress()}
          { (statusResponse.workflow?.status === 'IN_PROGRESS' || statusResponse.workflow?.status === 'COMPLETED' || statusResponse.workflow?.status === 'FAILED') && renderContentGenerationStatus() }

          {isCompleted && statusResponse.driveFolderUrl && (
            <Button 
              onClick={() => window.open(statusResponse.driveFolderUrl, '_blank')}
              className="w-full text-lg py-6 bg-green-600 hover:bg-green-700">
              <FolderOpen className="mr-2 h-6 w-6" /> View Event Materials in Drive
            </Button>
          )}
          {isCompleted && !statusResponse.driveFolderUrl && statusResponse.workflow?.status === 'COMPLETED' && (
             <Alert variant="default">
              <FileText className="h-4 w-4" />
              <AlertTitle>Materials Generated</AlertTitle>
              <AlertDescription>
                The event materials have been generated, but the Drive folder link is not available at the moment.
                You might find the materials in your designated Google Drive, or check back later.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t">
          <Button variant="outline" onClick={() => router.push('/dashboard/events')} className="w-full sm:w-auto mb-2 sm:mb-0">
            Go to My Events
          </Button>
          {isFailed && (
            <Button onClick={() => { /* Logic to retry or contact support */ }}
              className="w-full sm:w-auto">
              Try Again / Contact Support
            </Button>
          )}
           {isCompleted && statusResponse.driveFolderUrl && (
            <Button variant="ghost" onClick={() => router.push(`/dashboard/events/${eventId}`)} className="w-full sm:w-auto text-sm">
              View Event Details
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
} 