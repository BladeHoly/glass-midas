import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The templates' art is served from the root, as an app serving the templates would: /art/….
export default defineConfig({ plugins: [react()], publicDir: '../../templates/dist/shared' });
