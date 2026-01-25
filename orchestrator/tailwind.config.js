/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/renderer/**/*.{js,jsx,ts,tsx,html}'
    ],
    theme: {
        extend: {
            colors: {
                'shell-bg': '#09090b', // Zinc 950
                'shell-sidebar': '#18181b', // Zinc 900
                'shell-active': '#27272a', // Zinc 800
                'shell-hover': '#27272a', // Zinc 800
                'accent': '#6366f1',
                'border-subtle': '#27272a'
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif']
            },
            transitionTimingFunction: {
                'snappy': 'cubic-bezier(0.2, 0, 0, 1)'
            }
        }
    },
    plugins: []
};
