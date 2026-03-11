
import React, { useState, useCallback, useEffect, ChangeEvent } from 'react';
import { jsPDF } from 'jspdf';

// --- TYPES ---
interface Notification {
  type: 'success' | 'error';
  message: string;
}

interface ImagePreviewCardProps {
  file: File;
  onRemove: (fileName: string) => void;
}

interface NotificationToastProps {
    notification: Notification | null;
    onClose: () => void;
}

// --- ICONS (defined outside main component) ---
const FileTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

// --- HELPER COMPONENTS (defined outside main component) ---

const ImagePreviewCard: React.FC<ImagePreviewCardProps> = ({ file, onRemove }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    return (
        <div className="relative group aspect-square bg-gray-800 rounded-lg overflow-hidden shadow-md">
            {previewUrl ? (
                 <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <p className="text-gray-400 text-sm">Loading...</p>
                </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                <button
                    onClick={() => onRemove(file.name)}
                    className="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-500"
                    aria-label="Remove image"
                >
                    <XCircleIcon className="w-6 h-6" />
                </button>
                <p className="text-white text-xs text-center p-2 truncate absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {file.name}
                </p>
            </div>
        </div>
    );
};

const LoadingSpinner: React.FC = () => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex flex-col items-center justify-center z-50">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-teal-400"></div>
        <p className="text-white text-xl mt-4">Generating PDF...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait, this may take a moment.</p>
    </div>
);

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification, onClose]);

    if (!notification) return null;

    const bgColor = notification.type === 'success' ? 'bg-green-600' : 'bg-red-600';

    return (
        <div className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white ${bgColor} flex items-center z-50 animate-pulse`}>
            <p>{notification.message}</p>
            <button onClick={onClose} className="ml-4 text-xl font-bold">&times;</button>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

function App() {
    const [description, setDescription] = useState<string>('');
    const [images, setImages] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [notification, setNotification] = useState<Notification | null>(null);

    const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(e.target.value);
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            // FIX: Explicitly type `newFile` as `File` to resolve a type inference issue where it was being inferred as `unknown`.
            const uniqueNewFiles = newFiles.filter(
                (newFile: File) => !images.some(existingFile => existingFile.name === newFile.name)
            );
            setImages(prevImages => [...prevImages, ...uniqueNewFiles]);
        }
    };

    const handleRemoveImage = (fileName: string) => {
        setImages(prevImages => prevImages.filter(file => file.name !== fileName));
    };

    const fileToDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const generatePdf = useCallback(async () => {
        if (!description.trim() || images.length === 0) {
            setNotification({ type: 'error', message: 'Please provide a description and at least one image.' });
            return;
        }

        setIsLoading(true);
        setNotification(null);

        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - margin * 2;
            let yOffset = margin;

            // Add description
            doc.setFontSize(12);
            const textLines = doc.splitTextToSize(description, contentWidth);
            doc.text(textLines, margin, yOffset);
            yOffset += (textLines.length * 7) + 10; // Approximate height of text block

            // Add images
            for (let i = 0; i < images.length; i++) {
                const imageFile = images[i];
                if (i > 0 || yOffset > margin) { // Add new page for each image except maybe the first if text is short
                    doc.addPage();
                    yOffset = margin;
                }

                const imageDataUrl = await fileToDataUrl(imageFile);
                const imgProps = doc.getImageProperties(imageDataUrl);

                const aspectRatio = imgProps.width / imgProps.height;
                let imgWidth = contentWidth;
                let imgHeight = imgWidth / aspectRatio;
                
                if (imgHeight > pageHeight - margin * 2) {
                    imgHeight = pageHeight - margin * 2;
                    imgWidth = imgHeight * aspectRatio;
                }
                
                const x = (pageWidth - imgWidth) / 2;
                
                doc.addImage(imageDataUrl, 'JPEG', x, yOffset, imgWidth, imgHeight);
            }

            doc.save('generated-document.pdf');
            setNotification({ type: 'success', message: 'PDF generated successfully!' });
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            setNotification({ type: 'error', message: 'Failed to generate PDF. See console for details.' });
        } finally {
            setIsLoading(false);
        }
    }, [description, images]);

    const isGenerateDisabled = !description.trim() || images.length === 0;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
            {isLoading && <LoadingSpinner />}
            <NotificationToast notification={notification} onClose={() => setNotification(null)} />

            <div className="max-w-4xl mx-auto">
                <header className="flex items-center space-x-3 mb-8">
                    <FileTextIcon className="w-8 h-8 text-teal-400"/>
                    <h1 className="text-3xl font-bold tracking-tight text-white">PDF Generator</h1>
                </header>

                <main className="space-y-8">
                    <section>
                        <label htmlFor="description" className="block text-lg font-medium text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            id="description"
                            rows={6}
                            value={description}
                            onChange={handleDescriptionChange}
                            placeholder="Enter a multi-line description that will be placed at the beginning of your PDF..."
                            className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-200"
                        />
                    </section>
                    
                    <section>
                        <h2 className="text-lg font-medium text-gray-300 mb-2">Images</h2>
                        <div className="p-6 border-2 border-dashed border-gray-700 rounded-lg text-center">
                            <label htmlFor="image-upload" className="cursor-pointer inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700">
                                <UploadIcon className="w-5 h-5 mr-2"/>
                                Select Images
                            </label>
                            <input
                                id="image-upload"
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                            />
                            <p className="mt-3 text-sm text-gray-500">You can select multiple images.</p>
                        </div>
                    </section>

                    {images.length > 0 && (
                        <section>
                            <h3 className="text-lg font-medium text-gray-300 mb-4">Image Previews ({images.length})</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {images.map((file, index) => (
                                    <ImagePreviewCard key={`${file.name}-${index}`} file={file} onRemove={handleRemoveImage} />
                                ))}
                            </div>
                        </section>
                    )}

                    <footer className="pt-6">
                        <button
                            onClick={generatePdf}
                            disabled={isGenerateDisabled}
                            className="w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-teal-600 text-white font-bold rounded-lg shadow-lg hover:bg-teal-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-600"
                        >
                            Generate PDF
                        </button>
                    </footer>
                </main>
            </div>
        </div>
    );
}

export default App;