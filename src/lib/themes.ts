import { THEMES } from '$lib/constant';

export { THEMES };

export type Theme = (typeof THEMES)[number];

export const THEME_COLORS: Record<Theme, string> = {
	default: 'oklch(0.205 0 0)',
	blue: 'oklch(0.623 0.214 259.815)',
	green: 'oklch(0.723 0.219 149.579)',
	orange: 'oklch(0.705 0.213 47.604)',
	red: 'oklch(0.637 0.237 25.331)',
	rose: 'oklch(0.645 0.246 16.439)',
	violet: 'oklch(0.606 0.25 292.717)',
	yellow: 'oklch(0.795 0.184 86.047)'
};
