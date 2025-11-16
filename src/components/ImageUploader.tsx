import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageUploaderProps {
  onAnalysisComplete: (description: string, imageUrl: string) => void;
}

export const ImageUploader = ({ onAnalysisComplete }: ImageUploaderProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file (jpg, png, webp, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    await processImage(file);
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);

    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload image to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('journal-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('journal-images')
        .getPublicUrl(fileName);

      // Convert image to base64 for AI analysis
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
      });
      reader.readAsDataURL(file);
      const imageBase64 = await base64Promise;

      // Analyze image with AI
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { 
          imageBase64,
          imageType: file.type 
        }
      });

      if (error) throw error;

      if (data?.description) {
        toast({
          title: "Image analyzed",
          description: "AI analysis complete. Review and edit the entry.",
        });
        onAnalysisComplete(data.description, publicUrl);
      } else {
        throw new Error('No analysis returned');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Could not analyze image. Please try again.",
        variant: "destructive",
      });
      clearImage();
    } finally {
      setIsProcessing(false);
    }
  };

  const clearImage = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isProcessing}
      />
      
      {!previewUrl && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="gap-2"
        >
          <ImageIcon className="h-4 w-4" />
          Upload Image or Sketch
        </Button>
      )}

      {previewUrl && (
        <div className="relative rounded-lg border border-border overflow-hidden">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full h-48 object-cover"
          />
          {!isProcessing && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={clearImage}
              className="absolute top-2 right-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="flex items-center gap-2 text-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Analyzing image...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};