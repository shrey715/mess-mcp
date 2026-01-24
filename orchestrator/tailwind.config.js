/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './src/renderer/**/*.{js,jsx,ts,tsx,html}'
    ],
    theme: {
        extend: {
            colors: {
                'shell-bg': '#0f0f0f',
                'shell-sidebar': '#1a1a1a',
                'shell-active': '#2d2d2d',
                'shell-hover': '#252525',
                'accent': '#6366f1',
                'accent-hover': '#818cf8'
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif']
            }
        }
    },
    plugins: []
};
