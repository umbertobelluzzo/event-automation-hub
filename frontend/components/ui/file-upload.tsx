import * as React from 'react';
import { Upload, X, File, Image, FileText, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// =============================================================================
// File Upload Types
// =============================================================================

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  progress?: number;
  error?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
}

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  onFilesChange?: (files: UploadedFile[]) => void;
  onUpload?: (files: File[]) => Promise<void>;
  children?: React.ReactNode;
  preview?: boolean;
  showProgress?: boolean;
}

// =============================================================================
// File Type Detection
// =============================================================================

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  if (type.includes('pdf') || type.includes('document')) return FileText;
  return File;
};

const isImageFile = (type: string) => type.startsWith('image/');

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// =============================================================================
// File Preview Component
// =============================================================================

interface FilePreviewProps {
  file: UploadedFile;
  onRemove: (id: string) => void;
  showProgress?: boolean;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  showProgress = true,
}) => {
  const FileIcon = getFileIcon(file.type);

  return (
    <div className="relative flex items-center space-x-3 rounded-lg border p-3 bg-background">
      {/* File Icon/Preview */}
      <div className="flex-shrink-0">
        {isImageFile(file.type) && file.preview ? (
          <img
            src={file.preview}
            alt={file.name}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
            <FileIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </p>

        {/* Progress Bar */}
        {showProgress && file.status === 'uploading' && file.progress !== undefined && (
          <div className="mt-2">
            <Progress value={file.progress} className="h-1" />
          </div>
        )}

        {/* Error Message */}
        {file.error && (
          <p className="text-xs text-destructive mt-1">{file.error}</p>
        )}
      </div>

      {/* Status Indicator */}
      <div className="flex-shrink-0">
        {file.status === 'uploading' && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {file.status === 'success' && (
          <div className="h-2 w-2 rounded-full bg-green-500" />
        )}
        {file.status === 'error' && (
          <div className="h-2 w-2 rounded-full bg-destructive" />
        )}
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
        onClick={() => onRemove(file.id)}
        disabled={file.status === 'uploading'}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

// =============================================================================
// Main File Upload Component
// =============================================================================

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  ({
    accept,
    multiple = false,
    maxSize = 10 * 1024 * 1024, // 10MB default
    maxFiles = 5,
    disabled = false,
    className,
    onFilesChange,
    onUpload,
    children,
    preview = true,
    showProgress = true,
    ...props
  }, ref) => {
    const [files, setFiles] = React.useState<UploadedFile[]>([]);
    const [isDragOver, setIsDragOver] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Generate unique ID for file
    const generateFileId = () => Math.random().toString(36).substr(2, 9);

    // Create file preview URL
    const createPreview = (file: File): string | undefined => {
      if (isImageFile(file.type)) {
        return URL.createObjectURL(file);
      }
      return undefined;
    };

    // Validate file
    const validateFile = (file: File): string | null => {
      if (maxSize && file.size > maxSize) {
        return `File size must be less than ${formatFileSize(maxSize)}`;
      }
      return null;
    };

    // Process files
    const processFiles = (fileList: FileList) => {
      const newFiles: UploadedFile[] = [];
      const currentFileCount = files.length;

      for (let i = 0; i < fileList.length; i++) {
        if (currentFileCount + newFiles.length >= maxFiles) {
          break;
        }

        const file = fileList[i];
        const error = validateFile(file);
        const preview = createPreview(file);

        newFiles.push({
          id: generateFileId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview,
          status: error ? 'error' : 'pending',
          error: error || undefined,
        });
      }

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);

      // Auto-upload if handler provided and no errors
      if (onUpload) {
        const validFiles = newFiles.filter(f => !f.error).map(f => f.file);
        if (validFiles.length > 0) {
          handleUpload(validFiles);
        }
      }
    };

    // Handle file upload
    const handleUpload = async (filesToUpload: File[]) => {
      if (!onUpload) return;

      // Update status to uploading
      setFiles(prev => prev.map(file => {
        if (filesToUpload.some(f => f.name === file.name)) {
          return { ...file, status: 'uploading' as const, progress: 0 };
        }
        return file;
      }));

      try {
        await onUpload(filesToUpload);
        
        // Update status to success
        setFiles(prev => prev.map(file => {
          if (filesToUpload.some(f => f.name === file.name)) {
            return { ...file, status: 'success' as const, progress: 100 };
          }
          return file;
        }));
      } catch (error) {
        // Update status to error
        setFiles(prev => prev.map(file => {
          if (filesToUpload.some(f => f.name === file.name)) {
            return { 
              ...file, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Upload failed' 
            };
          }
          return file;
        }));
      }
    };

    // Handle file removal
    const removeFile = (id: string) => {
      setFiles(prev => {
        const fileToRemove = prev.find(f => f.id === id);
        if (fileToRemove?.preview) {
          URL.revokeObjectURL(fileToRemove.preview);
        }
        const updated = prev.filter(f => f.id !== id);
        onFilesChange?.(updated);
        return updated;
      });
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files);
      }
    };

    // Handle drag events
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      if (e.dataTransfer.files) {
        processFiles(e.dataTransfer.files);
      }
    };

    // Handle click to open file dialog
    const handleClick = () => {
      if (!disabled && inputRef.current) {
        inputRef.current.click();
      }
    };

    // Cleanup previews on unmount
    React.useEffect(() => {
      return () => {
        files.forEach(file => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview);
          }
        });
      };
    }, []);

    return (
      <div ref={ref} className={cn('space-y-4', className)} {...props}>
        {/* Upload Area */}
        <div
          className={cn(
            'relative border-2 border-dashed border-muted-foreground/25 rounded-lg transition-colors',
            'hover:border-muted-foreground/50 focus-within:border-primary',
            isDragOver && 'border-primary bg-primary/5',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'cursor-pointer'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleInputChange}
            disabled={disabled}
            className="sr-only"
          />
          
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            {children ? (
              children
            ) : (
              <>
                <Upload className={cn(
                  'h-8 w-8 mb-4 text-muted-foreground',
                  isDragOver && 'text-primary'
                )} />
                <p className="text-sm font-medium text-foreground mb-1">
                  {isDragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {accept ? `Accepts: ${accept}` : 'All file types accepted'}
                  {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
                  {multiple && ` • Max files: ${maxFiles}`}
                </p>
              </>
            )}
          </div>
        </div>

        {/* File Previews */}
        {preview && files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">
              Files ({files.length}/{maxFiles})
            </h4>
            <div className="space-y-2">
              {files.map(file => (
                <FilePreview
                  key={file.id}
                  file={file}
                  onRemove={removeFile}
                  showProgress={showProgress}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = 'FileUpload';

export { FileUpload };