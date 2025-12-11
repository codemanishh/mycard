import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { OfflineProvider } from '@/contexts/OfflineContext';

createRoot(document.getElementById("root")!).render(
	<OfflineProvider>
		<App />
	</OfflineProvider>
);

// Register service worker for PWA/offline support
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').then(reg => {
			console.debug('Service worker registered:', reg);
		}).catch(err => {
			console.warn('Service worker registration failed:', err);
		});
	});
}
