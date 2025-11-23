import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataImport } from "@/components/DataImport";
import { BookOpen, Upload, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface Props {
  currentEntries: number;
  deepEntries: number;
  analyzedEntries: number;
  needsAnalysis: boolean;
  minTotal?: number;
  minDeep?: number;
  showInlineImport?: boolean;
  onImportComplete?: () => void;
}

export const InsufficientDataPrompt = ({
  currentEntries,
  deepEntries,
  analyzedEntries,
  needsAnalysis,
  minTotal = 5,
  minDeep = 3,
  showInlineImport = false,
  onImportComplete,
}: Props) => {
  const navigate = useNavigate();

  if (needsAnalysis) {
    return (
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
            <div className="space-y-3 flex-1">
              <div>
                <h3 className="font-semibold text-lg">Analysis Needed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You have {currentEntries} entries, but they haven't been analyzed with our depth-based insights system yet.
                </p>
              </div>
              <Button onClick={() => navigate("/journal")} variant="outline">
                <BookOpen className="h-4 w-4 mr-2" />
                Go to Journal to Analyze Entries
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Upload className="h-12 w-12 text-muted-foreground" />
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Not Enough Data Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              You need at least <strong>{minTotal} total entries</strong> with{" "}
              <strong>{minDeep} deep reflections</strong> to generate meaningful insights.
            </p>
            <div className="flex gap-2 justify-center mt-2">
              <Badge variant="outline">
                {currentEntries}/{minTotal} entries
              </Badge>
              <Badge variant="outline">
                {deepEntries}/{minDeep} deep entries
              </Badge>
            </div>
          </div>

          {showInlineImport ? (
            <div className="w-full max-w-md space-y-3">
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Import Old Journals</p>
                <p className="text-xs text-muted-foreground mb-3">
                  💡 You can import multiple files at once!
                </p>
                <DataImport onImportComplete={onImportComplete || (() => {})} />
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/journal")}
                className="w-full"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Or Write New Entry
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button onClick={() => navigate("/journal")} variant="default">
                <Upload className="h-4 w-4 mr-2" />
                Import Old Journals
              </Button>
              <Button onClick={() => navigate("/journal")} variant="outline">
                <BookOpen className="h-4 w-4 mr-2" />
                Write New Entry
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
