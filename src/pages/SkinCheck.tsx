import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const SkinCheck = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");

  const handleSubmit = () => {
    // Dummy result (you can replace with ML/API later)
    if (file) {
      setResult("Acne");
    } else {
      alert("Please upload a file first");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Navbar / Logo (Same as Welcome) ── */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg">
          <Heart className="w-5 h-5 text-white fill-white" />
        </div>
        <span className="text-xl font-bold text-foreground">
          Medi<span className="text-primary">Mate</span>
        </span>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground mb-6">
            Check Your Skin Type
          </h1>

          {/* File Upload */}
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mb-4 w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white hover:file:bg-primary/90"
          />

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            className="w-full mb-6 bg-primary text-white hover:bg-primary/90"
          >
            Submit
          </Button>

          {/* Result */}
          {result && (
            <div className="mt-4">
              <h2 className="text-lg text-muted-foreground">
                Your Result Is Here:
              </h2>
              <p className="text-2xl font-semibold text-primary mt-2">
                {result}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkinCheck;
