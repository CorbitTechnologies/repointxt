// Load PDF.js from CDN dynamically to avoid import.meta issues
let pdfjsLib = null;
let pdfjsLoadPromise = null;

const loadPdfJs = () => {
    if (pdfjsLoadPromise) return pdfjsLoadPromise;

    pdfjsLoadPromise = new Promise((resolve, reject) => {
        // Check if already loaded globally
        if (typeof window !== 'undefined' && window.pdfjsLib) {
            pdfjsLib = window.pdfjsLib;
            resolve(pdfjsLib);
            return;
        }

        // Load from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            if (window.pdfjsLib) {
                pdfjsLib = window.pdfjsLib;
                pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(pdfjsLib);
            } else {
                reject(new Error('PDF.js failed to load'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
        document.head.appendChild(script);
    });

    return pdfjsLoadPromise;
};

export const extractTextFromPdf = async (arrayBuffer) => {
    try {
        // Ensure PDF.js is loaded
        const pdfjs = await loadPdfJs();

        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }

        return fullText;
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return `[Error extracting text from PDF: ${error.message}]`;
    }
};
