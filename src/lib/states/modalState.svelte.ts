type ModalInitializer = boolean | (() => boolean);

class ModalState {
	public value = $state(false);

	constructor(initial: ModalInitializer = false) {
		this.value = typeof initial === 'function' ? initial() : initial;
	}

	// Setter helpers keep `this` bound when used as callbacks
	set = (next: boolean) => {
		this.value = next;
	};

	setTrue = () => {
		this.value = true;
	};

	setFalse = () => {
		this.value = false;
	};

	toggle = () => {
		this.value = !this.value;
	};

	toggleModal = () => {
		this.toggle();
	};
}

const createModalState = (initial: ModalInitializer = false) => new ModalState(initial);

export const searchModalState = createModalState(false);
export const registerModalState = createModalState(false);
export const confirmEmailModalState = createModalState(false);
export const loginModalState = createModalState(false);
export const requestPasswordResetModalState = createModalState(false);
export const productModalState = createModalState(false);
export const cartSheetState = createModalState(false);
export const mobileAuthState = createModalState(false);
export const addSubscriptionModalState = createModalState(false);
