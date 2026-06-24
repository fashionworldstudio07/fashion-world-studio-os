import { create } from 'zustand';

interface ThemeState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  // Read initial theme from localStorage or document class
  const initialTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  
  if (initialTheme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }

  return {
    theme: initialTheme,
    toggleTheme: () => set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', nextTheme);
      if (nextTheme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
      return { theme: nextTheme };
    }),
    setTheme: (theme) => {
      localStorage.setItem('theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
      set({ theme });
    }
  };
});
