import { useState, useRef } from "react";
import { Upload, Image, X, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  onRemoveFile: () => void;
  uploadedFile?: File;
  className?: string;
}

export function FileUpload({ onFileUpload, onRemoveFile, uploadedFile, className }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Check file type (images and text files)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/pdf'];
    if (allowedTypes.includes(file.type) || file.name.endsWith('.txt')) {
      onFileUpload(file);
    } else {
      alert('Please upload an image, text file, or PDF.');
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      {!uploadedFile ? (
        <Card
          className={cn(
            "border-2 border-dashed p-6 transition-all duration-200 cursor-pointer hover:border-primary/50",
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            "hover:bg-primary/5"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Upload Screenshot or Document</p>
              <p className="text-xs text-muted-foreground mt-1">
                Drop files here or click to browse
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports: Images (JPG, PNG, WebP), Text files, PDFs
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.txt,.pdf"
            onChange={handleChange}
            className="hidden"
          />
        </Card>
      ) : (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon(uploadedFile)}
              <div className="flex-1">
                <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemoveFile}
              className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}