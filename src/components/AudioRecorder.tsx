import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLoading } from "@/contexts/LoadingContext";

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string, audioUrl?: string) => void;
}

export const AudioRecorder = ({ onTranscriptionComplete }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { startLoading, updateProgress, stopLoading } = useLoading();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak your journal entry...",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    startLoading("transcribe-audio", "Uploading audio...");
    
    try {
      updateProgress(20, "Converting audio...");
      // Convert audio blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
      });
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await base64Promise;

      updateProgress(40, "Uploading to server...");
      // Upload audio to storage (optional but recommended)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading audio:', uploadError);
      }

      const audioUrl = uploadData ? 
        supabase.storage.from('audio-recordings').getPublicUrl(fileName).data.publicUrl : 
        undefined;

      updateProgress(60, "Transcribing audio...");
      // Transcribe audio
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: audioBase64 }
      });

      if (error) throw error;

      updateProgress(90, "Finalizing...");
      if (data?.text) {
        updateProgress(100, "Transcription complete!");
        toast({
          title: "Transcription complete",
          description: "Your audio has been transcribed successfully.",
        });
        onTranscriptionComplete(data.text, audioUrl);
      } else {
        throw new Error('No transcription returned');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Transcription failed",
        description: error instanceof Error ? error.message : "Could not transcribe audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      stopLoading();
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex gap-2">
      {!isRecording && !isProcessing && (
        <Button
          type="button"
          variant="outline"
          onClick={startRecording}
          className="gap-2"
        >
          <Mic className="h-4 w-4" />
          Record Voice Entry
        </Button>
      )}
      
      {isRecording && (
        <Button
          type="button"
          variant="destructive"
          onClick={stopRecording}
          className="gap-2"
        >
          <Square className="h-4 w-4" />
          Stop Recording
        </Button>
      )}
      
      {isProcessing && (
        <Button
          type="button"
          variant="outline"
          disabled
          className="gap-2"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Transcribing...
        </Button>
      )}
    </div>
  );
};