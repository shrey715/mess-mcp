/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                // Softened Dark Theme
                background: '#09090b', // Zinc 950 - Standard Neutral Dark
                foreground: '#e2e8f0', // Slate 200

                card: {
                    DEFAULT: '#09090b',
                    foreground: '#e2e8f0',
                },
                popover: {
                    DEFAULT: '#09090b',
                    foreground: '#e2e8f0',
                },
                primary: {
                    DEFAULT: '#EA2264', // Keep the Pink for primary actions
                    foreground: '#FFFFFF',
                },
                secondary: {
                    DEFAULT: '#27272a', // Zinc 800 for secondary backgrounds
                    foreground: '#FFFFFF',
                },
                muted: {
                    DEFAULT: '#27272a',
                    foreground: '#a1a1aa',
                },
                accent: {
                    DEFAULT: '#F78D60', // Orange Accent
                    foreground: '#09090b',
                },
                destructive: {
                    DEFAULT: '#ef4444',
                    foreground: '#FFFFFF',
                },
                border: '#27272a', // Zinc 800 - Subtle borders
                input: '#27272a',
                ring: '#EA2264',

                // Brand colors reserved for specific highlights
                brand: {
                    blue: '#0D1164',
                    purple: '#640D5F',
                }
            },
            borderRadius: {
                lg: "0.5rem",
                md: "calc(0.5rem - 2px)",
                sm: "calc(0.5rem - 4px)",
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"],
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [],
}
