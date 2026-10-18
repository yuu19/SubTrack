// Integration tests call auth.handler directly, outside a SvelteKit request.
export function getRequestEvent() {
	return undefined;
}
