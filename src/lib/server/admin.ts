export type AdminCheckUser = {
	id: string;
	role?: string | null;
} | null;

export const parseAdminUserIds = (value?: string | null) =>
	(value ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);

export const isAdminUser = (user: AdminCheckUser, adminUserIds: string[]) => {
	if (!user) return false;
	return user.role === 'admin' || adminUserIds.includes(user.id);
};
